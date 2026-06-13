"use client";

import { useState, useRef, useLayoutEffect, useEffect, CSSProperties } from "react";
import { GlassesViewer } from "./GlassesViewer";

type Tab = "bounties" | "sidequests";

interface Item {
  id: string;
  amount: string;
  label: string;
}

const BOUNTIES: Item[] = [
  { id: "robo1", amount: "10 USDC", label: "Patrol Zone A" },
  { id: "robo2", amount: "20 USDC", label: "Deliver Package" },
  { id: "robo3", amount: "30 USDC", label: "Map Corridor 3" },
  { id: "robo4", amount: "40 USDC", label: "Scan & Report" },
  { id: "robo5", amount: "50 USDC", label: "Secure Perimeter" },
  { id: "robo6", amount: "60 USDC", label: "Retrieve Object" },
];

const SIDE_QUESTS: Item[] = [
  { id: "robo1", amount: "10 USDC", label: "Wave at humans" },
  { id: "robo2", amount: "20 USDC", label: "Do a lil spin" },
  { id: "robo3", amount: "30 USDC", label: "Find the cat" },
  { id: "robo4", amount: "40 USDC", label: "Vibe check" },
  { id: "robo5", amount: "50 USDC", label: "Touch grass" },
  { id: "robo6", amount: "60 USDC", label: "Befriend pigeon" },
];

const BG = "#ffeedd";
const TEXT = "#242424";

const s: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: BG,
    color: TEXT,
    fontFamily: "var(--font-instrument-sans), sans-serif",
  },
  header: {
    position: "fixed",
    top: 0, left: 0, right: 0,
    zIndex: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 28px",
    background: BG,
  },
  infoBtn: {
    width: 42, height: 42,
    borderRadius: "50%",
    border: "1px solid rgba(36,36,36,0.25)",
    background: "transparent",
    color: "rgba(36,36,36,0.5)",
    fontSize: 16,
    fontFamily: "var(--font-instrument-sans), sans-serif",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "border-color .2s, color .2s",
  },
  connectBtn: {
    height: 42,
    padding: "0 20px",
    borderRadius: 999,
    border: "1px solid rgba(36,36,36,0.25)",
    background: "transparent",
    color: "rgba(36,36,36,0.65)",
    fontSize: 14,
    fontFamily: "var(--font-instrument-sans), sans-serif",
    fontWeight: 500,
    cursor: "pointer",
    letterSpacing: "-0.01em",
    transition: "border-color .2s, color .2s",
  },
  hero: {
    paddingTop: 110,
    paddingBottom: 8,
    textAlign: "center",
    userSelect: "none",
  },
  title: {
    fontFamily: "var(--font-instrument-serif), serif",
    fontStyle: "italic",
    fontSize: "clamp(72px, 14vw, 160px)",
    lineHeight: 1,
    letterSpacing: "-0.04em",
    color: TEXT,
    margin: 0,
  },
  subtitle: {
    marginTop: 10,
    color: "rgba(36,36,36,0.4)",
    fontSize: 13,
    letterSpacing: "0.04em",
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
    background: "rgba(36,36,36,0.06)",
    border: "1px solid rgba(36,36,36,0.12)",
    borderRadius: 999,
    padding: 4,
  },
  slidingBg: {
    position: "absolute",
    top: 4,
    height: "calc(100% - 8px)",
    borderRadius: 999,
    background: TEXT,
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
    fontFamily: "var(--font-instrument-sans), sans-serif",
    letterSpacing: "-0.01em",
    transition: "color 0.25s",
    whiteSpace: "nowrap",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: 12,
    padding: "0 24px 80px",
    maxWidth: 1100,
    margin: "0 auto",
  },
  card: {
    background: "#fff8f2",
    border: "1px solid rgba(36,36,36,0.1)",
    borderRadius: 18,
    overflow: "hidden",
    cursor: "pointer",
    transition: "border-color .2s, background .2s",
    textAlign: "left",
    width: "100%",
  },
  cardImg: {
    width: "100%",
    aspectRatio: "4/3",
    background: "linear-gradient(135deg, #f5e8d8 0%, #efe0cc 100%)",
    display: "block",
  },
  cardBody: {
    padding: "12px 16px 14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: 500,
    color: TEXT,
    letterSpacing: "-0.01em",
  },
  cardSub: {
    fontSize: 12,
    color: "rgba(36,36,36,0.4)",
    marginTop: 2,
  },
  cardAmount: {
    fontSize: 14,
    fontWeight: 600,
    color: TEXT,
    letterSpacing: "-0.02em",
    fontVariantNumeric: "tabular-nums",
    flexShrink: 0,
  },
  cardBadge: {
    display: "inline-block",
    fontSize: 11,
    fontWeight: 500,
    color: "rgba(36,36,36,0.4)",
    border: "1px solid rgba(36,36,36,0.15)",
    borderRadius: 999,
    padding: "2px 8px",
    marginBottom: 4,
    letterSpacing: "0.01em",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 50,
    background: "rgba(36,36,36,0.4)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modal: {
    background: "#fff8f2",
    border: "1px solid rgba(36,36,36,0.1)",
    borderRadius: 24,
    width: "100%",
    maxWidth: 420,
    overflow: "hidden",
    position: "relative",
  },
  modalClose: {
    position: "absolute",
    top: 14, right: 14,
    width: 32, height: 32,
    borderRadius: "50%",
    border: "none",
    background: "rgba(36,36,36,0.07)",
    color: "rgba(36,36,36,0.45)",
    fontSize: 16,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
    fontFamily: "var(--font-instrument-sans), sans-serif",
  },
  modalCanvas: {
    width: "100%",
    height: 280,
    background: "#f5e8d8",
    display: "block",
  },
  modalInfo: {
    padding: "16px 20px 20px",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 600,
    color: TEXT,
    letterSpacing: "-0.02em",
  },
  modalMeta: {
    fontSize: 13,
    color: "rgba(36,36,36,0.4)",
    marginTop: 4,
    letterSpacing: "-0.01em",
  },
  modalActions: {
    display: "flex",
    gap: 10,
    marginTop: 16,
  },
  btnPrimary: {
    flex: 1,
    height: 44,
    borderRadius: 999,
    border: "none",
    background: TEXT,
    color: BG,
    fontSize: 14,
    fontWeight: 600,
    fontFamily: "var(--font-instrument-sans), sans-serif",
    cursor: "pointer",
    letterSpacing: "-0.01em",
  },
  btnSecondary: {
    height: 44,
    padding: "0 20px",
    borderRadius: 999,
    border: "1px solid rgba(36,36,36,0.15)",
    background: "transparent",
    color: "rgba(36,36,36,0.45)",
    fontSize: 14,
    fontWeight: 500,
    fontFamily: "var(--font-instrument-sans), sans-serif",
    cursor: "pointer",
    letterSpacing: "-0.01em",
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
const STEP_S           = 0.15;
const PAUSE_S          = 0.2;
const LAST_END_S       = 0.1 + STEP_S + EMERGE_DUR_S;
const COMPRESS_START_S = LAST_END_S + PAUSE_S;
const COMPRESS_DUR_S   = 0.4;
const FLIP_DUR_S       = 0.35;
const FLIP_START_S     = COMPRESS_START_S + COMPRESS_DUR_S / 2;

function PinchTitle() {
  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <div style={{ position: "relative", width: FIGMA_W, height: FIGMA_H, filter: "invert(1)" }}>
        {LETTERS.map((letter, i) => {
          const isN     = letter.dist === 0;
          const isC     = letter.alt === "c";
          const delay   = isN ? 0 : 0.1 + (letter.dist - 1) * STEP_S;
          const emergeX = letter.neighbourLeft - letter.left;
          const vars    = {
            ["--emerge-x"   as string]: `${emergeX}px`,
            ["--compress-x" as string]: `${letter.compressX}px`,
          };

          if (isC) {
            // Outer div: positioned at c's Figma slot, handles emerge + compress translation
            // Inner coin wrapper: handles the rotateY flip with preserve-3d
            // Front: c.png, Back: pinch.png (pre-rotated 180deg) — both backface-hidden
            return (
              <div
                key="c"
                style={{
                  ...vars,
                  position: "absolute",
                  left: letter.left,
                  top: letter.top,
                  width: letter.w,
                  height: letter.h,
                  opacity: 0,
                  animation: [
                    `pinch-emerge ${EMERGE_DUR_S}s cubic-bezier(0.22,1,0.36,1) ${delay}s both`,
                    `pinch-compress ${COMPRESS_DUR_S}s ease-in-out ${COMPRESS_START_S}s both`,
                  ].join(", "),
                  perspective: "600px",
                } as CSSProperties}
              >
                {/* coin wrapper — handles only the rotateY flip */}
                <div style={{
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  transformStyle: "preserve-3d",
                  animation: `coin-flip ${FLIP_DUR_S}s ease-in-out ${FLIP_START_S}s both`,
                }}>
                  {/* front face: c.png */}
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
                  {/* back face: pinch.png — pre-rotated so it faces back */}
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
                      filter: "invert(1)",
                      transform: "rotateY(180deg)",
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden",
                    }}
                  />
                </div>
              </div>
            );
          }

          return (
            <img
              key={i}
              src={letter.src}
              alt={letter.alt}
              style={{
                ...vars,
                position: "absolute",
                left: letter.left,
                top: letter.top,
                width: letter.w,
                height: letter.h,
                display: "block",
                opacity: isN ? 1 : 0,
                animation: isN
                  ? `pinch-compress ${COMPRESS_DUR_S}s ease-in-out ${COMPRESS_START_S}s both`
                  : [
                      `pinch-emerge ${EMERGE_DUR_S}s cubic-bezier(0.22,1,0.36,1) ${delay}s both`,
                      `pinch-compress ${COMPRESS_DUR_S}s ease-in-out ${COMPRESS_START_S}s both`,
                    ].join(", "),
              } as CSSProperties}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("bounties");
  const [selected, setSelected] = useState<Item | null>(null);
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
        <button style={s.infoBtn} aria-label="Info">?</button>
        <button style={s.connectBtn}>Connect Wallet</button>
      </header>

      {/* Hero */}
      <div style={s.hero}>
        <PinchTitle />
        <p style={s.subtitle}>autonomous robot bounties · onchain</p>
      </div>

      {/* Toggle */}
      <div style={s.toggleRow}>
        <div style={s.togglePill}>
          <div ref={pillRef} style={{ ...s.slidingBg, ...pillStyle }} />
          <button
            ref={btnBounties}
            style={{ ...s.tabBtn, color: tab === "bounties" ? BG : "rgba(36,36,36,0.4)" }}
            onClick={() => setTab("bounties")}
          >
            Bounties
          </button>
          <button
            ref={btnSideQuests}
            style={{ ...s.tabBtn, color: tab === "sidequests" ? BG : "rgba(36,36,36,0.4)" }}
            onClick={() => setTab("sidequests")}
          >
            Side Quests
          </button>
        </div>
      </div>

      {/* Grid */}
      <div style={s.grid}>
        {items.map((item) => (
          <button
            key={item.id}
            style={s.card}
            onClick={() => setSelected(item)}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(36,36,36,0.22)";
              (e.currentTarget as HTMLElement).style.background = "#fff3ea";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(36,36,36,0.1)";
              (e.currentTarget as HTMLElement).style.background = "#fff8f2";
            }}
          >
            <div style={s.cardImg} />
            <div style={s.cardBody}>
              <div style={s.cardLabel}>{item.id}</div>
              <div style={s.cardAmount}>{item.amount}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Modal */}
      {selected && (
        <div style={s.overlay} onClick={() => setSelected(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <button style={s.modalClose} onClick={() => setSelected(null)}>✕</button>
            <div style={s.modalCanvas}>
              <GlassesViewer />
            </div>
            <div style={s.modalInfo}>
              <div style={s.modalTitle}>{selected.label}</div>
              <div style={s.modalMeta}>{selected.id} · {selected.amount}</div>
              <div style={s.modalActions}>
                <button style={s.btnPrimary}>
                  Accept {tab === "bounties" ? "Bounty" : "Quest"}
                </button>
                <button style={s.btnSecondary} onClick={() => setSelected(null)}>Pass</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
