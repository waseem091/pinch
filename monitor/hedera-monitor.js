/**
 * Pinch — Hedera Bounty Monitor
 *
 * Two jobs running in parallel:
 *
 * 1. OBJECT DETECTION listener
 *    Watches the Pinch relay WebSocket. When a robot's camera detects an
 *    object it sends {type:'object_detected'}. This raises an on-chain bounty:
 *      - Create robot Hedera wallet (funded from operator, persisted)
 *      - Post bounty to HCS (immutable audit trail)
 *      - Transfer BOUNTY_AMOUNT_HBAR from robot wallet → operator
 *
 * 2. CLAIM PAYMENT listener
 *    Watches the robot backend SSE stream. When a quest transitions to
 *    'resolved' (robot task complete), pays the claimer in HBAR:
 *      - Transfer bounty.amount HBAR from robot wallet → claimer EVM address
 *      - Log payment to HCS
 *      - POSTs the Hedera tx ID to the Cloudflare Worker (so the UI can link it)
 *
 * Usage:
 *   cp .env.example .env      ← fill in HEDERA_ACCOUNT_ID + HEDERA_PRIVATE_KEY
 *   node hedera-monitor.js
 *
 * Free testnet account + HBAR: https://portal.hedera.com
 */

'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const {
  Client,
  PrivateKey,
  AccountId,
  AccountCreateTransaction,
  TransferTransaction,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  Hbar,
} = require('@hashgraph/sdk');

const WebSocket  = require('ws');
const fs         = require('fs');
const https      = require('https');
const http       = require('http');

// ── Config ────────────────────────────────────────────────────────────────────

const RELAY_WS      = process.env.RELAY_WS     || 'wss://pinch-relay.jenil-panchal10.workers.dev/ws';
const BACKEND_API   = process.env.BACKEND_API  || 'https://pinch-ie4r.onrender.com';
const WORKER_URL    = process.env.WORKER_URL   || 'https://pinch-relay.jenil-panchal10.workers.dev';
const OPERATOR_ID   = process.env.HEDERA_ACCOUNT_ID;
const OPERATOR_KEY  = process.env.HEDERA_PRIVATE_KEY;
const BOUNTY_HBAR        = parseFloat(process.env.BOUNTY_AMOUNT_HBAR || '0.5');
const ROBOT_INITIAL_HBAR = parseFloat(process.env.ROBOT_INITIAL_HBAR  || '5');
const WALLETS_FILE  = '../robot-wallets.json';

if (!OPERATOR_ID || !OPERATOR_KEY) {
  console.error('[ERROR] Set HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY in .env');
  console.error('        Free testnet account: https://portal.hedera.com');
  process.exit(1);
}

// ── Hedera operator client ────────────────────────────────────────────────────

const operatorClient = Client.forTestnet();
operatorClient.setOperator(
  AccountId.fromString(OPERATOR_ID),
  PrivateKey.fromStringECDSA(OPERATOR_KEY)
);

// ── Persisted robot wallets ───────────────────────────────────────────────────

let robotWallets = {};
if (fs.existsSync(WALLETS_FILE)) {
  try { robotWallets = JSON.parse(fs.readFileSync(WALLETS_FILE, 'utf8')); } catch {}
}
function saveWallets() {
  fs.writeFileSync(WALLETS_FILE, JSON.stringify(robotWallets, null, 2));
}

// ── HCS topic ────────────────────────────────────────────────────────────────

let bountyTopicId = process.env.BOUNTY_TOPIC_ID || null;

async function ensureTopic() {
  if (bountyTopicId) return bountyTopicId;
  console.log('[Hedera] Creating HCS bounty topic...');
  const tx = await new TopicCreateTransaction()
    .setTopicMemo('pinch-robot-bounties')
    .execute(operatorClient);
  const receipt = await tx.getReceipt(operatorClient);
  bountyTopicId = receipt.topicId.toString();
  console.log(`[Hedera] Topic: ${bountyTopicId}`);
  console.log(`[Hedera] ✅ Add to .env: BOUNTY_TOPIC_ID=${bountyTopicId}`);
  console.log(`[Hedera] View: https://hashscan.io/testnet/topic/${bountyTopicId}\n`);
  return bountyTopicId;
}

// ── Per-robot wallet ──────────────────────────────────────────────────────────

async function ensureRobotWallet(robotId) {
  if (robotWallets[robotId]) return robotWallets[robotId];
  console.log(`[Hedera] Creating wallet for robot ${robotId.slice(0, 20)}...`);
  const privateKey = PrivateKey.generateECDSA();
  const tx = await new AccountCreateTransaction()
    .setKey(privateKey.publicKey)
    .setInitialBalance(new Hbar(ROBOT_INITIAL_HBAR))
    .setAccountMemo(`pinch-${robotId.slice(0, 16)}`)
    .execute(operatorClient);
  const receipt = await tx.getReceipt(operatorClient);
  const accountId = receipt.accountId.toString();
  robotWallets[robotId] = { accountId, privateKey: privateKey.toStringRaw() };
  saveWallets();
  console.log(`[Hedera] Robot wallet: ${accountId} (funded ${ROBOT_INITIAL_HBAR} HBAR)`);
  console.log(`[Hedera] https://hashscan.io/testnet/account/${accountId}\n`);
  return robotWallets[robotId];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function hederaTxUrl(txId) {
  // "0.0.12345@1234567890.000000000" → hashscan URL
  const [account, ts] = txId.split('@');
  return `https://hashscan.io/testnet/transaction/${account}-${ts.replace('.', '-')}`;
}

function httpFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.request(url, {
      method:  options.method  || 'GET',
      headers: options.headers || {},
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try { resolve({ ok: res.statusCode < 400, status: res.statusCode, body: JSON.parse(body) }); }
        catch { resolve({ ok: res.statusCode < 400, status: res.statusCode, body }); }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

// ── Store Hedera tx in Cloudflare Worker ──────────────────────────────────────

async function storePaymentTx(questId, record) {
  try {
    await httpFetch(`${WORKER_URL}/payments/${questId}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(record),
    });
    console.log(`[Worker] Stored Hedera tx for quest ${questId}`);
  } catch (e) {
    console.error('[Worker] Could not store tx:', e.message);
  }
}

// ── Primary robot wallet (created by setup-robot.js) ─────────────────────────

function getPrimaryRobot() {
  if (!fs.existsSync(WALLETS_FILE)) return null;
  const w = JSON.parse(fs.readFileSync(WALLETS_FILE, 'utf8'));
  return w['primary-robot'] || null;
}

// ── JOB 1: Backend fired 'obstruction_detected' → log bounty on Hedera ───────
// Stackchan detects the obstacle itself and calls the backend.
// We watch the backend SSE, and when a new quest appears we escrow HBAR.

const raisedQuests = new Set();

async function raiseHederaBounty(quest) {
  if (raisedQuests.has(quest.id)) return;
  raisedQuests.add(quest.id);

  const wallet = getPrimaryRobot();
  if (!wallet) {
    console.error('[Bounty] No primary robot wallet — run "node setup-robot.js" first');
    return;
  }

  console.log(`\n[Bounty] Quest "${quest.name}" → logging on Hedera`);
  console.log(`         Robot wallet: ${wallet.accountId}`);

  try {
    const topicId = await ensureTopic();

    const robotClient = Client.forTestnet();
    robotClient.setOperator(
      AccountId.fromString(wallet.accountId),
      PrivateKey.fromStringRaw(wallet.privateKey)
    );

    // 1. HCS: immutable on-chain audit record
    const hcsMsg = {
      event: 'bounty_posted', questId: quest.id, questName: quest.name,
      robotAccount: wallet.accountId,
      bountyAmount: BOUNTY_HBAR, currency: 'HBAR', network: 'testnet',
      ts: Date.now(),
    };
    const hcsTx = await new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(JSON.stringify(hcsMsg))
      .execute(robotClient);
    const hcsR = await hcsTx.getReceipt(robotClient);
    console.log(`[HCS]    Bounty logged — seq #${hcsR.topicSequenceNumber}`);
    console.log(`[HCS]    https://hashscan.io/testnet/topic/${topicId}`);

    // 2. HBAR: escrow robot wallet → operator pool
    const escrowTx = await new TransferTransaction()
      .addHbarTransfer(wallet.accountId, new Hbar(-BOUNTY_HBAR))
      .addHbarTransfer(OPERATOR_ID,      new Hbar(BOUNTY_HBAR))
      .setTransactionMemo(`pinch-escrow-${quest.id.slice(0, 16)}`)
      .execute(robotClient);
    const escrowR = await escrowTx.getReceipt(robotClient);
    console.log(`[HBAR]   ${BOUNTY_HBAR} HBAR escrowed — ${escrowR.status}`);
    console.log(`[HBAR]   https://hashscan.io/testnet/account/${wallet.accountId}`);

    robotClient.close();
  } catch (e) {
    console.error(`[Bounty] Error:`, e.message);
    raisedQuests.delete(quest.id);
  }
}

// ── JOB 2: Quest resolved → pay claimer in HBAR ──────────────────────────────

const paidQuests = new Set();  // quest IDs we've already paid

async function payClaimerOnHedera(quest) {
  if (paidQuests.has(quest.id)) return;
  paidQuests.add(quest.id);

  const claimerEvm = quest.operatorAddress;  // 0x... MetaMask address
  if (!claimerEvm) {
    console.log(`[Pay] Quest ${quest.id} has no claimer address — skipping`);
    return;
  }

  // Use the operator wallet as payer (robot wallets may be exhausted)
  const payerClient = Client.forTestnet();
  payerClient.setOperator(
    AccountId.fromString(OPERATOR_ID),
    PrivateKey.fromStringECDSA(OPERATOR_KEY)
  );

  const amountHbar = quest.bounty || BOUNTY_HBAR;

  try {
    const topicId = await ensureTopic();

    console.log(`\n[Pay] Quest "${quest.name}" resolved → paying ${claimerEvm}`);
    console.log(`[Pay] Amount: ${amountHbar} HBAR`);

    // Resolve claimer EVM address to Hedera AccountId (lazy account creation)
    const claimerAccountId = AccountId.fromEvmAddress(0, 0, claimerEvm);

    // Transfer HBAR to claimer
    const transferTx = await new TransferTransaction()
      .addHbarTransfer(OPERATOR_ID,    new Hbar(-amountHbar))
      .addHbarTransfer(claimerAccountId, new Hbar(amountHbar))
      .setTransactionMemo(`pinch-pay-${quest.id}`)
      .execute(payerClient);

    const receipt = await transferTx.getReceipt(payerClient);
    const txId    = transferTx.transactionId.toString();
    const txUrl   = hederaTxUrl(txId);

    console.log(`[Pay]  Status: ${receipt.status}`);
    console.log(`[Pay]  Tx: ${txId}`);
    console.log(`[Pay]  ${txUrl}`);

    // Log to HCS
    const hcsMsg = {
      event: 'bounty_paid', questId: quest.id, questName: quest.name,
      claimer: claimerEvm, amountHbar, hederaTxId: txId,
      ts: Date.now(),
    };
    const hcsTx = await new TopicMessageSubmitTransaction()
      .setTopicId(topicId).setMessage(JSON.stringify(hcsMsg))
      .execute(payerClient);
    const hcsR = await hcsTx.getReceipt(payerClient);
    console.log(`[HCS]  Payment logged — sequence #${hcsR.topicSequenceNumber}`);
    console.log(`[HCS]  https://hashscan.io/testnet/topic/${topicId}`);

    // Store tx in Cloudflare Worker so the frontend can link it
    await storePaymentTx(quest.id, {
      hederaTxId: txId,
      hederaTxUrl: txUrl,
      claimer: claimerEvm,
      amountHbar,
      ts: Date.now(),
    });

    // Bounty resolved — resume Spectacles hand tracking camera control
    bountyActive = false;
    console.log(`[Move]   → Camera RESUMED (bounty resolved)`);

    payerClient.close();
  } catch (e) {
    console.error(`[Pay] Error paying ${claimerEvm}:`, e.message);
    paidQuests.delete(quest.id);
    payerClient.close();
  }
}

// Poll backend quests — detect new available quests and resolved transitions
let knownQuests = {};

async function syncQuests() {
  try {
    const r = await httpFetch(`${BACKEND_API}/api/quests`);
    if (!r.ok) return;
    const quests = r.body;
    if (!Array.isArray(quests)) return;

    for (const q of quests) {
      const prev = knownQuests[q.id];

      // New quest appeared (stackchan detected obstacle + called backend)
      if (!prev && q.status === 'available') {
        console.log(`[Sync] New quest "${q.name}" — raising Hedera bounty`);
        raiseHederaBounty(q);
      }

      // Quest just resolved → pay claimer in HBAR
      if (prev && prev !== 'resolved' && q.status === 'resolved' && q.operatorAddress) {
        console.log(`[Sync] Quest "${q.name}" resolved — paying claimer`);
        payClaimerOnHedera(q);
      }

      // On startup: mark already-resolved quests as seen so we don't replay them
      if (!prev && q.status === 'resolved') {
        paidQuests.add(q.id);
        raisedQuests.add(q.id);
      }

      knownQuests[q.id] = q.status;
    }
  } catch (e) {
    console.error('[Sync] Error fetching quests:', e.message);
  }
}

// Backend SSE: use as a trigger to re-sync quests immediately
function connectBackendSSE() {
  const es = new _EventSource(`${BACKEND_API}/api/events`);

  es.onopen = () => console.log('[SSE] Connected to backend events');
  es.onmessage = (e) => {
    try {
      const { type } = JSON.parse(e.data);
      console.log(`[SSE] Event: ${type}`);
      if (['bounty_paid', 'bounty_claimed', 'obstruction_detected', 'bounty_cancelled'].includes(type)) {
        syncQuests();
      }
    } catch {}
  };
  es.onerror = () => {
    console.log('[SSE] Backend SSE error — will reconnect');
    setTimeout(connectBackendSSE, 5000);
    es.close();
  };
}


// ── Relay WebSocket listener (object detection + hand movement) ───────────────

function connectRelayWS() {
  const ws = new WebSocket(RELAY_WS);
  ws.on('open',  () => console.log('[Monitor] Relay WS connected'));
  ws.on('close', () => { setTimeout(connectRelayWS, 3000); });
  ws.on('error', (e) => console.error('[Monitor] WS error:', e.message));
}

// ── Start ─────────────────────────────────────────────────────────────────────

console.log('\n=== Pinch Hedera Bounty Monitor ===');
console.log(`Operator : ${OPERATOR_ID}`);
console.log(`Network  : Hedera Testnet`);
console.log(`Hashscan : https://hashscan.io/testnet/account/${OPERATOR_ID}\n`);

// Check eventsource is available
try { require('eventsource'); } catch {
  console.error('[ERROR] Run: npm install eventsource');
  process.exit(1);
}

// eventsource v4 exports { EventSource }, v2/v3 exports the constructor directly
const _esModule = require('eventsource');
const _EventSource = _esModule.EventSource || _esModule;

ensureTopic()
  .then(() => {
    connectRelayWS();
    syncQuests();            // initial sync
    setInterval(syncQuests, 10_000);  // poll every 10s as fallback
    connectBackendSSE();     // SSE triggers immediate re-sync
  })
  .catch((e) => {
    console.error('[ERROR] Init failed:', e.message);
    process.exit(1);
  });
