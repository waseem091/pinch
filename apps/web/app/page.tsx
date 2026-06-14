"use client";

import { useState, useRef, useLayoutEffect, useCallback, useEffect, CSSProperties } from "react";
import { IDKitWidget, VerificationLevel } from "@worldcoin/idkit";

const API          = "https://pinch-ie4r.onrender.com";
const WORKER       = "https://pinch-relay.jenil-panchal10.workers.dev";
const WORLD_APP_ID = process.env.NEXT_PUBLIC_WORLD_APP_ID ?? "";

type Tab = "bounties" | "sidequests";

interface Quest {
  id: string;
  name: string;
  status: "available" | "claimed" | "resolved";
  bounty: number;
  postedAt: string;
  imageUrl?: string;
}

interface Item {
  id: string;
  name: string;
  amount: string;
  label: string;
  time: string;
}

const BOUNTIES: Item[] = [
  { id: "robo1", name: "Sonny",      amount: "0.01 ETH", label: "Patrol Zone A",    time: "51m ago" },
  { id: "robo2", name: "Stackchan",  amount: "0.02 ETH", label: "Deliver Package",  time: "2h ago"  },
  { id: "robo3", name: "R2-D2",      amount: "0.03 ETH", label: "Map Corridor 3",   time: "4h ago"  },
  { id: "robo4", name: "Wall-E",     amount: "0.04 ETH", label: "Scan & Report",    time: "6h ago"  },
  { id: "robo5", name: "Chitti",     amount: "0.05 ETH", label: "Secure Perimeter", time: "9h ago"  },
  { id: "robo6", name: "C-3PO",      amount: "0.06 ETH", label: "Retrieve Object",  time: "12h ago" },
];

const SIDE_QUESTS: Item[] = [
  { id: "robo1", name: "Sonny",      amount: "0.01 ETH", label: "Wave at humans",  time: "22m ago" },
  { id: "robo2", name: "Stackchan",  amount: "0.02 ETH", label: "Do a lil spin",   time: "1h ago"  },
  { id: "robo3", name: "R2-D2",      amount: "0.03 ETH", label: "Find the cat",    time: "3h ago"  },
  { id: "robo4", name: "Wall-E",     amount: "0.04 ETH", label: "Vibe check",      time: "5h ago"  },
  { id: "robo5", name: "Chitti",     amount: "0.05 ETH", label: "Touch grass",     time: "8h ago"  },
  { id: "robo6", name: "C-3PO",      amount: "0.06 ETH", label: "Befriend pigeon", time: "11h ago" },
];

const BG = "#112211";
const TEXT = "#aaccbb";
const ACCENT = "#44aa66";
const MESH = `linear-gradient(rgba(170,204,187,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(170,204,187,0.05) 1px, transparent 1px)`;

const s: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    backgroundColor: BG,
    backgroundImage: MESH,
    backgroundSize: "40px 40px",
    color: TEXT,
    fontFamily: "'DM Sans', sans-serif",
  },
  header: {
    position: "fixed",
    top: 0, left: 0, right: 0,
    zIndex: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 28px",
    backgroundColor: "rgba(17,34,17,0.85)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
  },
  infoBtn: {
    width: 42, height: 42,
    borderRadius: "50%",
    border: "1px solid rgba(170,204,187,0.25)",
    background: "transparent",
    color: TEXT,
    fontSize: 16,
    fontFamily: "'DM Mono', monospace",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    letterSpacing: "-0.03em",
    transition: "background .15s, color .15s, border-color .15s",
  },
  connectBtn: {
    height: 42,
    padding: "0 20px",
    borderRadius: 999,
    border: "1px solid rgba(170,204,187,0.25)",
    background: "transparent",
    color: TEXT,
    fontSize: 14,
    fontFamily: "'DM Mono', monospace",
    fontWeight: 500,
    cursor: "pointer",
    letterSpacing: "-0.03em",
    transition: "background .15s, color .15s, border-color .15s",
  },
  hero: {
    paddingTop: 110,
    paddingBottom: 8,
    textAlign: "center",
    userSelect: "none",
  },
  title: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "clamp(72px, 14vw, 160px)",
    lineHeight: 1,
    letterSpacing: "-0.03em",
    color: TEXT,
    margin: 0,
  },
  subtitle: {
    marginTop: 10,
    color: TEXT,
    fontSize: 13,
    letterSpacing: "-0.03em",
  },
  toggleRow: {
    display: "flex",
    justifyContent: "center",
    padding: "28px 0 32px",
  },
  togglePill: {
    display: "inline-flex",
    alignItems: "center",
    position: "relative",
    background: "rgba(170,204,187,0.06)",
    border: "1px solid rgba(170,204,187,0.12)",
    borderRadius: 999,
    padding: 4,
  },
  slidingBg: {
    position: "absolute",
    top: 4,
    height: "calc(100% - 8px)",
    borderRadius: 999,
    background: ACCENT,
    pointerEvents: "none",
  },
  tabBtn: {
    position: "relative",
    zIndex: 1,
    padding: "8px 22px",
    borderRadius: 999,
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 500,
    fontFamily: "'DM Mono', monospace",
    letterSpacing: "-0.03em",
    outline: "1.5px dotted transparent",
    outlineOffset: "-3px",
    transition: "color 0.25s, outline-color 0.2s",
    whiteSpace: "nowrap",
  },
  card: {
    background: "#aaccbb",
    borderRadius: 15,
    overflow: "hidden",
    width: 300,
    height: 225,
    border: "none",
    padding: 0,
    textAlign: "left",
    display: "flex",
    flexDirection: "column",
  },
  cardImg: {
    width: 300,
    height: 150,
    background: "#bbddbb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    flexShrink: 0,
    overflow: "hidden",
  },
  cardTimestamp: {
    position: "absolute",
    top: 15,
    right: 15,
    background: "rgba(0,0,0,0.3)",
    borderRadius: 20,
    height: 20,
    width: 60,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTimestampText: {
    fontSize: 9,
    color: "white",
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 500,
    letterSpacing: "-0.03em",
  },
  cardBody: {
    width: 300,
    height: 75,
    padding: 15,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "#aaccbb",
    flexShrink: 0,
    boxSizing: "border-box",
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: 600,
    color: "black",
    fontFamily: "'DM Sans', sans-serif",
    letterSpacing: "-0.03em",
    lineHeight: "normal",
  },
  cardAmount: {
    fontSize: 16,
    color: "black",
    fontFamily: "'DM Mono', monospace",
    fontWeight: 500,
    letterSpacing: "-0.03em",
    lineHeight: "normal",
    marginTop: 3,
  },
  startBtn: {
    background: "#66a66d",
    color: "white",
    border: "none",
    borderRadius: 15,
    height: 45,
    width: 90,
    fontSize: 16,
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 500,
    cursor: "pointer",
    letterSpacing: "-0.03em",
    flexShrink: 0,
  },
};

// Figma positions already have exactly 40px gaps between letters.
// emerge-x: each letter starts at its neighbour's position and slides to its own.
// compress-x: after emerge, letters shift inward so gaps go from 40px → 10px.
//   compress-x = dist × 30px × side (30 = 40-10, inward = toward n)
const FIGMA_W = 584;
const FIGMA_H = 150;
const LETTERS = [
  { src: "/assets/name/p.png", alt: "p", left: 0,   top: 38, w: 100, h: 150, neighbourLeft: 140, dist: 2, compressX:  60 },
  { src: "/assets/name/i.png", alt: "i", left: 140, top: 15, w: 50,  h: 135, neighbourLeft: 230, dist: 1, compressX:  30 },
  { src: "/assets/name/n.png", alt: "n", left: 230, top: 45, w: 96,  h: 105, neighbourLeft: 230, dist: 0, compressX:   0 },
  { src: "/assets/name/c.png", alt: "c", left: 366, top: 45, w: 88,  h: 105, neighbourLeft: 230, dist: 1, compressX: -30 },
  { src: "/assets/name/h.png", alt: "h", left: 494, top: 0,  w: 90,  h: 150, neighbourLeft: 366, dist: 2, compressX: -60 },
];

const EMERGE_DUR_S     = 0.45;
const STEP_S           = 0.1;
const PAUSE_S          = 0.2;
const LAST_END_S       = 0.1 + STEP_S + EMERGE_DUR_S;
const COMPRESS_START_S = LAST_END_S + PAUSE_S;
const COMPRESS_DUR_S   = 0.4;
const FLIP_DUR_S       = 0.35;
const FLIP_START_S     = COMPRESS_START_S;

function PinchTitle() {
  return (
    <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
      <div className="pinch-scale" style={{ position: "relative", width: FIGMA_W, height: FIGMA_H, transformOrigin: "center" }}>
        {LETTERS.map((letter) => {
          const isN   = letter.dist === 0;
          const isC   = letter.alt === "c";
          const delay = isN ? 0 : 0.1 + (letter.dist - 1) * STEP_S;

          // Absolute slot — never has animations so layout never shifts
          const slotStyle: CSSProperties = {
            position: "absolute",
            left: letter.left,
            top: letter.top,
            width: letter.w,
            height: letter.h,
          };

          if (isN) {
            // n: visible from the start, doesn't move (compressX = 0)
            return (
              <div key="n" style={slotStyle}>
                <img src={letter.src} alt="n" style={{ display: "block" }} />
              </div>
            );
          }

          if (isC) {
            // emerge wrapper  → translate from n's position, fades in
            // compress wrapper → translate inward (separate element = no transform conflict)
            // coin wrapper    → rotateY flip (preserve-3d)
            return (
              <div
                key="c"
                style={{
                  ...slotStyle,
                  opacity: 0,
                  animation: `emerge-c ${EMERGE_DUR_S}s cubic-bezier(0.22,1,0.36,1) ${delay}s both`,
                } as CSSProperties}
              >
                <div style={{
                  width: "100%",
                  height: "100%",
                  animation: `compress-c ${COMPRESS_DUR_S}s ease-in-out ${COMPRESS_START_S}s both`,
                  perspective: "600px",
                } as CSSProperties}>
                  <div style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    transformStyle: "preserve-3d",
                    animation: `coin-flip ${FLIP_DUR_S}s ease-in-out ${FLIP_START_S}s both`,
                  }}>
                    <img
                      src={letter.src}
                      alt="c"
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        display: "block",
                        backfaceVisibility: "hidden",
                        WebkitBackfaceVisibility: "hidden",
                      }}
                    />
                    <img
                      src="/assets/name/pinch.png"
                      alt=""
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        display: "block",
                        transform: "rotateY(180deg)",
                        backfaceVisibility: "hidden",
                        WebkitBackfaceVisibility: "hidden",
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          }

          // p, i, h — emerge wrapper (translateX + opacity), compress wrapper (translateX only)
          return (
            <div
              key={letter.alt}
              style={{
                ...slotStyle,
                opacity: 0,
                animation: `emerge-${letter.alt} ${EMERGE_DUR_S}s cubic-bezier(0.22,1,0.36,1) ${delay}s both`,
              } as CSSProperties}
            >
              <img
                src={letter.src}
                alt={letter.alt}
                style={{
                  display: "block",
                  animation: `compress-${letter.alt} ${COMPRESS_DUR_S}s ease-in-out ${COMPRESS_START_S}s both`,
                } as CSSProperties}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

const HEDERA_TESTNET = {
  chainId: "0x128",
  chainName: "Hedera Testnet",
  nativeCurrency: { name: "HBAR", symbol: "HBAR", decimals: 18 },
  rpcUrls: ["https://testnet.hashio.io/api"],
  blockExplorerUrls: ["https://hashscan.io/testnet"],
};

export default function Home() {
  const [tab, setTab]               = useState<Tab>("bounties");
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [verified, setVerified]     = useState(false);
  const [quests, setQuests]         = useState<Quest[]>([]);
  const [claiming, setClaiming]     = useState<Record<string, boolean>>({});
  const [toast, setToast]           = useState("");
  const [toastVisible, setToastVisible] = useState(false);

  const aboutRef      = useRef<HTMLElement>(null);
  const btnBounties   = useRef<HTMLButtonElement>(null);
  const btnSideQuests = useRef<HTMLButtonElement>(null);
  const pillRef       = useRef<HTMLDivElement>(null);
  const [pillStyle, setPillStyle] = useState<CSSProperties>({});

  const pendingQuestId = useRef<string | null>(null);
  const toastTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openWorldId    = useRef<(() => void) | null>(null);

  const showToast = useCallback((msg: string, ms = 2800) => {
    setToast(msg);
    setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), ms);
  }, []);

  // Restore wallet if already connected
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eth = (window as any).ethereum;
    if (!eth) return;
    eth.request({ method: "eth_accounts" }).then((accounts: string[]) => {
      if (accounts[0]) setWalletAddress(accounts[0]);
    });
  }, []);

  const connectWallet = useCallback(async (): Promise<string | null> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eth = (window as any).ethereum;
    if (!eth) { showToast("MetaMask not found — install it to receive HBAR"); return null; }
    try {
      const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
      try {
        await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: HEDERA_TESTNET.chainId }] });
      } catch (e: unknown) {
        const err = e as { code?: number };
        if (err.code === 4902 || err.code === -32603) {
          await eth.request({ method: "wallet_addEthereumChain", params: [HEDERA_TESTNET] });
        }
      }
      setWalletAddress(accounts[0]);
      return accounts[0];
    } catch (err) { console.error("wallet connect failed", err); return null; }
  }, [showToast]);

  const fetchQuests = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/quests`);
      if (!r.ok) return;
      setQuests(await r.json());
    } catch { /* API unreachable — keep current state */ }
  }, []);

  useEffect(() => { fetchQuests(); }, [fetchQuests]);

  // SSE for real-time bounty updates
  useEffect(() => {
    let es: EventSource;
    const connect = () => {
      es = new EventSource(`${API}/api/events`);
      es.onmessage = () => fetchQuests();
      es.onerror   = () => { es.close(); setTimeout(connect, 4000); };
    };
    connect();
    return () => es?.close();
  }, [fetchQuests]);

  async function doClaim(id: string, addr: string) {
    setClaiming(c => ({ ...c, [id]: true }));
    try {
      const r = await fetch(`${API}/api/bounties/${id}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ solver: addr }),
      });
      const d = await r.json();
      if (!r.ok || d.error) throw new Error(d.error || String(r.status));
      showToast("Bounty claimed! You'll be paid in HBAR when the robot is freed ✓");
      fetchQuests();
    } catch (e: unknown) {
      showToast("Claim failed: " + (e as Error).message, 4000);
    } finally {
      setClaiming(c => ({ ...c, [id]: false }));
    }
  }

  // Called after World ID verification succeeds
  async function onWorldIdSuccess(proof: unknown) {
    setVerified(true);
    showToast("Human verified ✓ — connecting wallet…");
    // Store nullifier in background (non-blocking)
    fetch(`${WORKER}/verify-world-id`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(proof),
    }).catch(() => {});
    const addr = walletAddress ?? await connectWallet();
    if (addr && pendingQuestId.current) {
      await doClaim(pendingQuestId.current, addr);
      pendingQuestId.current = null;
    }
  }

  async function handleClaim(id: string) {
    if (claiming[id]) return;
    pendingQuestId.current = id;

    // Step 1: World ID verification (if configured and not yet verified)
    if (WORLD_APP_ID && !verified) {
      openWorldId.current?.();
      return;
    }

    // Step 2: Wallet
    const addr = walletAddress ?? await connectWallet();
    if (!addr) return;

    // Step 3: Claim
    await doClaim(id, addr);
    pendingQuestId.current = null;
  }

  function timeAgo(iso: string) {
    const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (sec < 60)   return `${sec}s ago`;
    if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
    return `${Math.floor(sec / 3600)}h ago`;
  }

  useLayoutEffect(() => {
    const activeBtn = tab === "bounties" ? btnBounties.current : btnSideQuests.current;
    const pill = pillRef.current;
    if (!activeBtn || !pill) return;
    const { offsetLeft, offsetWidth } = activeBtn;
    // First paint: set directly on DOM to avoid a width-0 frame
    if (!pillStyle.width) {
      pill.style.transition = "none";
      pill.style.left = `${offsetLeft}px`;
      pill.style.width = `${offsetWidth}px`;
      setPillStyle({ left: offsetLeft, width: offsetWidth });
    } else {
      setPillStyle({ left: offsetLeft, width: offsetWidth, transition: "left 0.25s cubic-bezier(0.4,0,0.2,1), width 0.25s cubic-bezier(0.4,0,0.2,1)" });
    }
  }, [tab]);

  const staticItems = tab === "bounties" ? BOUNTIES : SIDE_QUESTS;

  return (
    <div style={s.page}>
      {/* World ID widget — invisible, triggered programmatically by handleClaim */}
      {WORLD_APP_ID && (
        <IDKitWidget
          app_id={WORLD_APP_ID as `app_${string}`}
          action="claim-bounty"
          verification_level={VerificationLevel.Device}
          onSuccess={onWorldIdSuccess}
        >
          {({ open }) => { openWorldId.current = open; return null; }}
        </IDKitWidget>
      )}

      {/* Header */}
      <header style={s.header}>
        <button
          style={s.infoBtn}
          aria-label="Info"
          onClick={() => aboutRef.current?.scrollIntoView({ behavior: "smooth" })}
          onMouseEnter={e => { e.currentTarget.style.background = TEXT; e.currentTarget.style.color = BG; e.currentTarget.style.borderColor = TEXT; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = TEXT; e.currentTarget.style.borderColor = "rgba(170,204,187,0.25)"; }}
        >?</button>
        <button
          style={s.connectBtn}
          onClick={walletAddress ? undefined : connectWallet}
          onMouseEnter={e => { e.currentTarget.style.background = TEXT; e.currentTarget.style.color = BG; e.currentTarget.style.borderColor = TEXT; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = TEXT; e.currentTarget.style.borderColor = "rgba(170,204,187,0.25)"; }}
        >
          {walletAddress ? `✓ ${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}` : "CONNECT WALLET"}
        </button>
      </header>

      {/* Hero */}
      <div style={s.hero}>
        <PinchTitle />
        <p style={{ marginTop: 32, fontSize: 16, fontFamily: "'DM Mono', monospace", letterSpacing: "-0.03em", color: TEXT }}>
          Robots are in a pinch.<br />Humans, you're up.
        </p>
      </div>

      {/* Toggle */}
      <div style={s.toggleRow}>
        <div style={s.togglePill}>
          <div ref={pillRef} style={{ ...s.slidingBg, ...pillStyle }} />
          <button
            ref={btnBounties}
            style={{ ...s.tabBtn, color: tab === "bounties" ? BG : TEXT, background: tab === "bounties" && !pillStyle.width ? ACCENT : "transparent" }}
            onClick={() => setTab("bounties")}
            onMouseEnter={e => { if (tab !== "bounties") e.currentTarget.style.outlineColor = "rgba(170,204,187,0.45)"; }}
            onMouseLeave={e => { e.currentTarget.style.outlineColor = "transparent"; }}
          >
            Bounties
          </button>
          <button
            ref={btnSideQuests}
            style={{ ...s.tabBtn, color: tab === "sidequests" ? BG : TEXT, background: tab === "sidequests" && !pillStyle.width ? ACCENT : "transparent" }}
            onClick={() => setTab("sidequests")}
            onMouseEnter={e => { if (tab !== "sidequests") e.currentTarget.style.outlineColor = "rgba(170,204,187,0.45)"; }}
            onMouseLeave={e => { e.currentTarget.style.outlineColor = "transparent"; }}
          >
            Side Quests
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="card-grid">
        {tab === "bounties" && quests.length > 0
          ? quests.map(q => (
              <div key={q.id} style={s.card}>
                <div style={s.cardImg}>
                  {q.imageUrl && (
                    <img
                      src={q.imageUrl}
                      alt={q.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  )}
                  <div style={s.cardTimestamp}>
                    <span style={s.cardTimestampText}>{timeAgo(q.postedAt)}</span>
                  </div>
                </div>
                <div style={s.cardBody}>
                  <div>
                    <div style={s.cardLabel}>{q.name}</div>
                    <div style={s.cardAmount}>💰 {q.bounty} HBAR</div>
                  </div>
                  <button style={s.startBtn} onClick={() => handleClaim(q.id)}>
                    Start
                  </button>
                </div>
              </div>
            ))
          : staticItems.map((item) => (
              <div key={item.id} style={s.card}>
                <div style={s.cardImg}>
                  <img
                    src={`/assets/robots/${item.id}.webp`}
                    alt={item.id}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                  <div style={s.cardTimestamp}>
                    <span style={s.cardTimestampText}>{item.time}</span>
                  </div>
                </div>
                <div style={s.cardBody}>
                  <div>
                    <div style={s.cardLabel}>{item.name}</div>
                    <div style={s.cardAmount}>💰{item.amount}</div>
                  </div>
                  <button style={s.startBtn}>Start</button>
                </div>
              </div>
            ))
        }
      </div>

      {/* About */}
      <section
        ref={aboutRef}
        style={{
          maxWidth: 620,
          margin: "0 auto",
          padding: "48px 24px 80px",
          fontFamily: "'DM Mono', monospace",
          fontSize: 14,
          lineHeight: 1.85,
          color: TEXT,
        }}
      >
        <p style={{ marginBottom: "1.5em" }}>
          Autonomous agents are good at operating independently. Until they
          hit something they can&apos;t resolve — a physical edge case, an
          environment they haven&apos;t seen, a decision that needs a human
          in the loop. Most systems stop there.
        </p>
        <p style={{ marginBottom: "1.5em" }}>
          Pinch doesn&apos;t stop. When a robot hits a limit, it posts a bounty
          from its own wallet. A human claims it, opens a browser, and takes
          control — hand tracking over WebXR drives the robot live. Once the
          blockage clears, the robot pays out instantly, settled onchain. No
          card, no bank, no intermediary.
        </p>
        <p style={{ marginBottom: "1.5em" }}>
          There are systems built for agents to talk to agents. Systems built
          for humans to talk to agents. Who is building the layer where{" "}
          <a
            href="#"
            style={{ color: ACCENT, textDecoration: "underline", cursor: "pointer" }}
            onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          >
            agents pay humans
          </a>{" "}
          for physical presence?
        </p>
        <p style={{ marginBottom: "2.5em" }}>
          Pinch is that layer: real-time hand tracking as the input primitive
          for an agentic economy. A robot posts a bounty, a human shows up,
          a transaction clears — presence-native, verified, committed onchain
          the moment the job is done.
        </p>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 12, marginBottom: "2.5em", flexWrap: "wrap" }}>
          {[
            { label: "GITHUB", href: "https://github.com/waseem091/pinch" },
            { label: "X", href: "https://x.com/waseemweb" },
          ].map(({ label, href }) => {
            return (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  height: 40,
                  padding: "0 20px",
                  borderRadius: 999,
                  border: "1px solid rgba(170,204,187,0.25)",
                  background: "transparent",
                  color: TEXT,
                  fontSize: 12,
                  fontFamily: "'DM Mono', monospace",
                  letterSpacing: "-0.03em",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  textDecoration: "none",
                  transition: "background .15s, color .15s, border-color .15s",
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget;
                  el.style.background = TEXT;
                  el.style.color = BG;
                  el.style.borderColor = TEXT;
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget;
                  el.style.background = "transparent";
                  el.style.color = TEXT;
                  el.style.borderColor = "rgba(170,204,187,0.25)";
                }}
              >
                {label}
              </a>
            );
          })}
        </div>

      </section>

      {/* Toast notification */}
      {toastVisible && (
        <div style={{
          position: "fixed",
          bottom: 28,
          left: "50%",
          transform: "translateX(-50%)",
          background: "#1c341c",
          border: "1px solid rgba(170,204,187,0.2)",
          color: TEXT,
          padding: "12px 22px",
          borderRadius: 999,
          fontSize: 13,
          fontFamily: "'DM Mono', monospace",
          letterSpacing: "-0.03em",
          zIndex: 100,
          whiteSpace: "nowrap",
          pointerEvents: "none",
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}
