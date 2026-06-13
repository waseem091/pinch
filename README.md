# Pinch

Real-time WebXR hand tracking as the physical interface for an agentic economy.

An autonomous robot hits a limit it can't resolve alone. It posts a bounty from its own wallet. A human claims it, opens a browser, and takes control — live hand tracking from any WebXR-capable device drives the robot remotely. Once resolved, the robot pays the operator instantly, settled onchain. No card, no bank, no intermediary.

---

## Apps

| App | Stack | Description |
|-----|-------|-------------|
| `apps/xr` | Vite + React + Three.js | WebXR hand tracking session — runs on Spectacles, Quest, or any WebXR device |
| `apps/web` | Next.js | Bounty dashboard — browse open bounties, claim jobs, view payouts |

## Packages

| Package | Description |
|---------|-------------|
| `packages/protocol` | Shared TypeScript types — hand frames, bounties, jobs |

---

## Getting Started

```bash
npm install
npm run dev
```

- XR app: `http://localhost:5173`
- Web dashboard: `http://localhost:3000`

---

## How It Works

```
WebXR device              Relay              Robot
  apps/xr    ──► hand frames ──► agent  ──► actuators
                                  │
                              bounty posted
                                  │
                              human claims
                                  │
                              job completed
                                  │
                          onchain payment settled
```

Two modes:
- **Intervention** — human takes live control to unblock the robot now
- **Training** — human demonstrates a task the robot wants to learn

---

## Tech Stack

- **WebXR Hand Input API** — joint tracking in-browser, no native app
- **Three.js** — XR session + 3D skeleton overlay
- **Next.js** — bounty dashboard
- **Turborepo** — monorepo build orchestration
- Chain TBD — onchain payment settlement
