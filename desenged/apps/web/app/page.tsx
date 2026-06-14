"use client";

import { useState, useRef, useLayoutEffect, CSSProperties } from "react";
import { UserPill } from "@privy-io/react-auth/ui";

type Tab = "bounties" | "sidequests";

interface Item {
  id: string;
  amount: string;
  label: string;
  time: string;
}

const BOUNTIES: Item[] = [
  { id: "robo1", amount: "0.01 ETH", label: "Patrol Zone A",    time: "51m ago" },
  { id: "robo2", amount: "0.02 ETH", label: "Deliver Package",  time: "2h ago"  },
  { id: "robo3", amount: "0.03 ETH", label: "Map Corridor 3",   time: "4h ago"  },
  { id: "robo4", amount: "0.04 ETH", label: "Scan & Report",    time: "6h ago"  },
  { id: "robo5", amount: "0.05 ETH", label: "Secure Perimeter", time: "9h ago"  },
  { id: "robo6", amount: "0.06 ETH", label: "Retrieve Object",  time: "12h ago" },
];

const SIDE_QUESTS: Item[] = [
  { id: "robo1", amount: "0.01 ETH", label: "Wave at humans",  time: "22m ago" },
  { id: "robo2", amount: "0.02 ETH", label: "Do a lil spin",   time: "1h ago"  },
  { id: "robo3", amount: "0.03 ETH", label: "Find the cat",    time: "3h ago"  },
  { id: "robo4", amount: "0.04 ETH", label: "Vibe check",      time: "5h ago"  },
  { id: "robo5", amount: "0.05 ETH", label: "Touch grass",     time: "8h ago"  },
  { id: "robo6", amount: "0.06 ETH", label: "Befriend pigeon", time: "11h ago" },
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
    background: "white",
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
    background: "white",
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
      <div style={{ position: "relative", width: FIGMA_W, height: FIGMA_H, transform: "scale(0.48)", transformOrigin: "center", marginTop: -FIGMA_H * 0.26, marginBottom: -FIGMA_H * 0.26, marginLeft: -(FIGMA_W * 0.26), marginRight: -(FIGMA_W * 0.26) }}>
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

export default function Home() {
  const [tab, setTab] = useState<Tab>("bounties");
  const aboutRef = useRef<HTMLElement>(null);
  const btnBounties = useRef<HTMLButtonElement>(null);
  const btnSideQuests = useRef<HTMLButtonElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const [pillStyle, setPillStyle] = useState<CSSProperties>({});

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

  const items = tab === "bounties" ? BOUNTIES : SIDE_QUESTS;

  return (
    <div style={s.page}>
      {/* Header */}
      <header style={s.header}>
        <button
          style={s.infoBtn}
          aria-label="Info"
          onClick={() => aboutRef.current?.scrollIntoView({ behavior: "smooth" })}
          onMouseEnter={e => { e.currentTarget.style.background = TEXT; e.currentTarget.style.color = BG; e.currentTarget.style.borderColor = TEXT; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = TEXT; e.currentTarget.style.borderColor = "rgba(170,204,187,0.25)"; }}
        >?</button>
        {process.env.NEXT_PUBLIC_PRIVY_APP_ID && process.env.NEXT_PUBLIC_PRIVY_APP_ID !== "your-privy-app-id-here"
          ? <UserPill action={{ type: "connectWallet" }} />
          : <button
              style={s.connectBtn}
              onMouseEnter={e => { e.currentTarget.style.background = TEXT; e.currentTarget.style.color = BG; e.currentTarget.style.borderColor = TEXT; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = TEXT; e.currentTarget.style.borderColor = "rgba(170,204,187,0.25)"; }}
            >CONNECT WALLET</button>
        }
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
        {items.map((item) => (
          <div key={item.id} style={s.card}>
            <div style={s.cardImg}>
              <div style={s.cardTimestamp}>
                <span style={s.cardTimestampText}>{item.time}</span>
              </div>
            </div>
            <div style={s.cardBody}>
              <div>
                <div style={s.cardLabel}>{item.id}</div>
                <div style={s.cardAmount}>💰{item.amount}</div>
              </div>
              <button style={s.startBtn}>Start</button>
            </div>
          </div>
        ))}
      </div>

      {/* About */}
      <section
        ref={aboutRef}
        style={{
          maxWidth: 620,
          margin: "0 auto",
          padding: "96px 24px 80px",
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
    </div>
  );
}
