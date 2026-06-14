import { useState, useEffect, useRef, useCallback } from 'react';
import { IDKitWidget, VerificationLevel } from '@worldcoin/idkit';
import { resolveWalletEns, resolveRobotEns, toEnsLabel } from './ens.js';
import './App.css';

const API        = 'https://pinch-ie4r.onrender.com';
const WORKER     = 'https://pinch-relay.jenil-panchal10.workers.dev';
const HASHSCAN   = 'https://hashscan.io/testnet';
const ENS_PARENT = import.meta.env.VITE_ENS_PARENT_NAME || null;

const HEDERA_TESTNET = {
  chainId:           '0x128',
  chainName:         'Hedera Testnet',
  nativeCurrency:    { name: 'HBAR', symbol: 'HBAR', decimals: 18 },
  rpcUrls:           ['https://testnet.hashio.io/api'],
  blockExplorerUrls: [HASHSCAN],
};

const WORLD_APP_ID = import.meta.env.VITE_WORLD_APP_ID;

export default function App() {
  const [verified, setVerified]           = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [walletEns, setWalletEns]         = useState(null);
  const [quests, setQuests]               = useState([]);
  const [payments, setPayments]           = useState({});
  const [robotEns, setRobotEns]           = useState({});
  const [liveOn, setLiveOn]               = useState(false);
  const [liveText, setLiveText]           = useState('connecting…');
  const [lastUpdate, setLastUpdate]       = useState('');
  const [toastMsg, setToastMsg]           = useState('');
  const [toastVisible, setToastVisible]   = useState(false);
  const [claiming, setClaiming]           = useState({});

  const toastTimer  = useRef(null);
  const paymentsRef = useRef({});

  const showToast = useCallback((msg, ms = 2800) => {
    setToastMsg(msg);
    setToastVisible(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), ms);
  }, []);

  // ── World ID ────────────────────────────────────────────────────────────────

  // Called after IDKit confirms the user completed World ID verification
  async function onWorldIdSuccess(proof) {
    setVerified(true);
    showToast('Human verified ✓ — now connect your wallet');
    // Store nullifier in background (don't block UX on World API availability)
    if (proof?.nullifier_hash) {
      fetch(`${WORKER}/verify-world-id`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proof),
      }).catch(() => {});
    }
    await connectWallet();
  }

  // ── Wallet ──────────────────────────────────────────────────────────────────
  async function connectWallet() {
    if (!window.ethereum) {
      showToast('MetaMask not found — install it to receive HBAR', 4000);
      return;
    }
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: HEDERA_TESTNET.chainId }],
        });
      } catch (e) {
        if (e.code === 4902 || e.code === -32603) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [HEDERA_TESTNET],
          });
        }
      }
      setWalletAddress(accounts[0]);
      resolveWalletEns(accounts[0]).then(name => setWalletEns(name));
      showToast('Wallet connected on Hedera Testnet ✓');
    } catch (e) {
      if (e.code !== 4001) showToast('Wallet connect failed: ' + e.message, 4000);
    }
  }

  // ── Quests ──────────────────────────────────────────────────────────────────
  const fetchQuests = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/quests`);
      if (!r.ok) throw new Error(r.status);
      const data = await r.json();

      const pmt = { ...paymentsRef.current };
      await Promise.all(
        data
          .filter(q => q.status === 'resolved' && !pmt[q.id])
          .map(async q => {
            try {
              const pr = await fetch(`${WORKER}/payments/${q.id}`);
              if (pr.ok) {
                const d = await pr.json();
                if (d?.hederaTxId) pmt[q.id] = d;
              }
            } catch {}
          })
      );

      paymentsRef.current = pmt;
      setPayments({ ...pmt });
      setQuests(data);
      setLastUpdate('updated ' + new Date().toLocaleTimeString());
    } catch (e) {
      console.error('fetchQuests:', e.message);
    }
  }, []);

  useEffect(() => { fetchQuests(); }, [fetchQuests]);

  // Resolve ENS text records for each unique robot type
  useEffect(() => {
    if (!ENS_PARENT || quests.length === 0) return;
    const uniqueLabels = [...new Set(quests.map(q => toEnsLabel(q.name)))];
    Promise.all(
      uniqueLabels.map(label =>
        resolveRobotEns(label, ENS_PARENT).then(data => [label, data])
      )
    ).then(entries => setRobotEns(Object.fromEntries(entries)));
  }, [quests]);

  useEffect(() => {
    let es;
    const connect = () => {
      es = new EventSource(`${API}/api/events`);
      es.onopen = () => { setLiveOn(true); setLiveText('live'); };
      es.onmessage = e => {
        try {
          const { type } = JSON.parse(e.data);
          const msgs = {
            obstruction_detected: '🚨 New bounty posted — a robot needs help',
            bounty_claimed:       '✓ Bounty claimed',
            bounty_paid:          '⬡ Bounty paid in HBAR',
            bounty_cancelled:     'Bounty cancelled',
          };
          if (msgs[type]) showToast(msgs[type]);
        } catch {}
        fetchQuests();
      };
      es.onerror = () => {
        setLiveOn(false); setLiveText('reconnecting…');
        es.close(); setTimeout(connect, 4000);
      };
    };
    connect();
    return () => es?.close();
  }, [fetchQuests, showToast]);

  async function claimBounty(id, bounty) {
    if (!verified)       { showToast('Verify with World ID first'); return; }
    if (!walletAddress)  { connectWallet(); return; }
    if (claiming[id])    return;

    setClaiming(c => ({ ...c, [id]: true }));
    try {
      const r = await fetch(`${API}/api/bounties/${id}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solver: walletAddress }),
      });
      const d = await r.json();
      if (!r.ok || d.error) throw new Error(d.error || r.status);
      showToast("Bounty claimed! You'll be paid in HBAR when the robot is freed ✓");
      await fetchQuests();
    } catch (e) {
      showToast('Claim failed: ' + e.message, 4000);
    } finally {
      setClaiming(c => ({ ...c, [id]: false }));
    }
  }

  async function sim(action) {
    try {
      const r = await fetch(`${API}/api/sim/${action}`, { method: 'POST' });
      if (!r.ok) throw new Error(r.status);
      showToast(action === 'blocked' ? '🚨 Sim: bounty posted' : '✅ Sim: resolved');
    } catch (e) {
      showToast('Sim error: ' + e.message, 3000);
    }
  }

  function timeAgo(iso) {
    const s = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (s < 60)   return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    return `${Math.floor(s / 3600)}h ago`;
  }

  const walletLabel = walletEns
    || (walletAddress ? `${walletAddress.slice(0,6)}…${walletAddress.slice(-4)}` : null)
    || (verified ? 'Connect Wallet' : 'Verify with World ID');

  const BADGE = { available: 'AVAILABLE', claimed: 'CLAIMED', resolved: 'RESOLVED' };

  // ── Header wallet / World ID button ─────────────────────────────────────────
  const headerBtn = !verified ? (
    <IDKitWidget
      app_id={WORLD_APP_ID}
      action="claim-bounty"
      verification_level={VerificationLevel.Device}
      onSuccess={onWorldIdSuccess}
    >
      {({ open }) => (
        <button className="wallet-btn world" onClick={open}>
          🌐 Verify with World ID
        </button>
      )}
    </IDKitWidget>
  ) : !walletAddress ? (
    <button className="wallet-btn" onClick={connectWallet}>
      Connect Wallet
    </button>
  ) : (
    <button className="wallet-btn ok">
      ✓ {walletLabel}
    </button>
  );

  return (
    <>
      <header>
        <div className="header-left">
          <h1>PINCH BOUNTIES</h1>
          <div className={`live-pill${liveOn ? ' on' : ''}`}>
            <span className="dot" /><span>{liveText}</span>
          </div>
        </div>
        {headerBtn}
      </header>

      <main>
        <div className="toolbar">
          <span className="section-label">ACTIVE QUESTS</span>
          <span className="last-update">{lastUpdate}</span>
        </div>

        <div className="grid">
          {quests.length === 0 ? (
            <div className="empty">
              <div className="icon">⬡</div>
              <p>No active bounties right now.<br />
                Hit <strong>Post bounty</strong> below to simulate one,<br />
                or wait for a robot to get stuck.</p>
            </div>
          ) : quests.map(q => {
            const hp        = payments[q.id];
            const ensLabel  = toEnsLabel(q.name);
            const ens       = robotEns[ensLabel] || null;
            const ensName   = ENS_PARENT ? `${ensLabel}.${ENS_PARENT}` : null;
            return (
              <div key={q.id} className={`card ${q.status}`}>
                <div className="card-thumb">
                  {q.imageUrl
                    ? <img src={q.imageUrl} alt={q.name} onError={e => { e.target.style.display = 'none'; }} />
                    : '🤖'}
                </div>
                <div className="card-body">
                  <div className="card-row">
                    <span className="card-name">{q.name}</span>
                    <span className="card-age">{timeAgo(q.postedAt)}</span>
                  </div>
                  {ensName && (
                    <a
                      className="ens-badge"
                      href={`https://app.ens.domains/${ensName}`}
                      target="_blank"
                      rel="noreferrer"
                      title={ens?.description || 'View on ENS'}
                    >
                      <svg className="ens-logo" viewBox="0 0 369 369" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M184.5 0C82.6 0 0 82.6 0 184.5S82.6 369 184.5 369 369 286.4 369 184.5 286.4 0 184.5 0z" fill="#5298FF"/>
                        <path d="M119 149c-12 19-18 40-18 63 0 43 24 81 59 101l-2-4c-21-38-32-80-31-122l-8-38zM250 220c12-19 18-40 18-63 0-43-24-81-59-101l2 4c21 38 32 80 31 122l8 38z" fill="white"/>
                      </svg>
                      <span>{ensName}</span>
                    </a>
                  )}
                  {ens?.capabilities && (
                    <div className="ens-caps">
                      {ens.capabilities.split(',').map(c => (
                        <span key={c} className="ens-cap">{c.trim()}</span>
                      ))}
                    </div>
                  )}
                  <span className={`badge ${q.status}`}>
                    <span className="dot" />{BADGE[q.status] || q.status}
                  </span>
                  <div className="bounty-row">
                    <span className="bounty-amt">{q.bounty}</span>
                    <span className="bounty-unit">HBAR</span>
                  </div>

                  {q.status === 'claimed' && q.operatorAddress && (
                    <div className="card-meta">Claimed by<br />{q.operatorAddress}</div>
                  )}
                  {q.status === 'resolved' && (
                    hp?.hederaTxUrl
                      ? <div className="card-meta">
                          Paid on Hedera Testnet ·{' '}
                          <a href={hp.hederaTxUrl} target="_blank" rel="noreferrer">view on Hashscan ↗</a>
                          {hp.claimer && <><br />{hp.claimer}</>}
                        </div>
                      : <div className="card-meta processing">⬡ Hedera payment processing…</div>
                  )}

                  {q.status === 'available' ? (
                    verified && walletAddress
                      ? <button
                          className={`claim-btn ${claiming[q.id] ? 'spin' : 'go'}`}
                          onClick={() => claimBounty(q.id, q.bounty)}
                          disabled={!!claiming[q.id]}
                        >
                          {claiming[q.id] ? 'Claiming…' : `Claim — ${q.bounty} HBAR`}
                        </button>
                      : <button className="claim-btn go" onClick={() => claimBounty(q.id)}>
                          {!verified ? '🌐 Verify to claim' : 'Connect wallet to claim'}
                        </button>
                  ) : (
                    <button className="claim-btn off">
                      {q.status === 'claimed' ? 'Claimed' : 'Resolved ✓'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <div className="sim-bar">
        <span className="label">DEV SIM →</span>
        <button className="sim-btn" onClick={() => sim('blocked')}>🚨 Post bounty</button>
        <button className="sim-btn" onClick={() => sim('clear')}>✅ Resolve</button>
      </div>

      {toastVisible && <div className="toast">{toastMsg}</div>}
    </>
  );
}
