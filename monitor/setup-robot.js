/**
 * One-time setup: creates the robot's Hedera wallet and funds it from
 * the operator account (your account: 0.0.9224289).
 *
 * Run once:
 *   node setup-robot.js
 *
 * Saves wallet to robot-wallets.json as "primary-robot".
 * hedera-monitor.js reads this file at startup.
 */

'use strict';
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const {
  Client,
  PrivateKey,
  AccountId,
  AccountCreateTransaction,
  AccountBalanceQuery,
  Hbar,
} = require('@hashgraph/sdk');
const fs = require('fs');

const OPERATOR_ID  = process.env.HEDERA_ACCOUNT_ID;
const OPERATOR_KEY = process.env.HEDERA_PRIVATE_KEY;
const FUND_HBAR    = parseFloat(process.env.ROBOT_INITIAL_HBAR || '10');
const WALLETS_FILE = '../robot-wallets.json';

if (!OPERATOR_ID || !OPERATOR_KEY) {
  console.error('Missing HEDERA_ACCOUNT_ID or HEDERA_PRIVATE_KEY in .env');
  process.exit(1);
}

async function main() {
  const client = Client.forTestnet();
  client.setOperator(
    AccountId.fromString(OPERATOR_ID),
    PrivateKey.fromStringECDSA(OPERATOR_KEY)
  );

  // Check if robot wallet already exists
  const wallets = fs.existsSync(WALLETS_FILE)
    ? JSON.parse(fs.readFileSync(WALLETS_FILE, 'utf8'))
    : {};

  if (wallets['primary-robot']) {
    const existing = wallets['primary-robot'];
    console.log('Robot wallet already exists:');
    console.log(`  Account  : ${existing.accountId}`);
    console.log(`  Hashscan : https://hashscan.io/testnet/account/${existing.accountId}`);

    const bal = await new AccountBalanceQuery()
      .setAccountId(existing.accountId)
      .execute(client);
    console.log(`  Balance  : ${bal.hbars.toString()}`);
    console.log('\nTo recreate it, delete robot-wallets.json and run again.');
    client.close();
    return;
  }

  console.log(`\nOperator : ${OPERATOR_ID}`);
  console.log(`Funding  : ${FUND_HBAR} HBAR → new robot wallet\n`);

  // Check operator balance first
  const opBal = await new AccountBalanceQuery()
    .setAccountId(OPERATOR_ID)
    .execute(client);
  console.log(`Operator balance : ${opBal.hbars.toString()}`);

  // Generate fresh ECDSA key for the robot (EVM-compatible)
  const robotKey     = PrivateKey.generateECDSA();
  const robotPubKey  = robotKey.publicKey;
  const robotEvmAddr = `0x${robotPubKey.toEvmAddress()}`;

  console.log(`\nCreating robot wallet…`);

  const createTx = await new AccountCreateTransaction()
    .setKey(robotPubKey)
    .setInitialBalance(new Hbar(FUND_HBAR))
    .setAccountMemo('pinch-primary-robot')
    .execute(client);

  const receipt   = await createTx.getReceipt(client);
  const accountId = receipt.accountId.toString();

  // Persist wallet
  wallets['primary-robot'] = {
    accountId,
    evmAddress: robotEvmAddr,
    privateKey: robotKey.toStringRaw(),
  };
  fs.writeFileSync(WALLETS_FILE, JSON.stringify(wallets, null, 2));

  console.log('\n✅ Robot wallet created and funded');
  console.log(`   Account ID  : ${accountId}`);
  console.log(`   EVM Address : ${robotEvmAddr}`);
  console.log(`   Balance     : ${FUND_HBAR} HBAR`);
  console.log(`   Hashscan    : https://hashscan.io/testnet/account/${accountId}`);
  console.log('\nRun "npm run bounty" to start the monitor.');

  client.close();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
