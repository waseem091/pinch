# pinch

Real-time WebXR hand tracking for Snap Spectacles, streamed live to any browser via Cloudflare.

No local server. No tunnel. Nothing running on your Mac. Everything is hosted in the cloud permanently.

---

## Live URLs

| What | URL |
|------|-----|
| Spectacles AR page | https://pinch-bounty.vercel.app/ |
| Live coordinate dashboard | https://pinch-relay.jenil-panchal10.workers.dev/viewer |
| WebSocket endpoint | `wss://pinch-relay.jenil-panchal10.workers.dev/ws` |

---

## How to use

**Step 1 — Open the dashboard** in any browser (laptop, phone, anywhere):
```
https://pinch-relay.jenil-panchal10.workers.dev/viewer
```

**Step 2 — Open the AR page on Spectacles:**
```
https://pinch-bounty.vercel.app/
```

**Step 3 — Tap anywhere** on the Spectacles screen to start the AR session.

**Step 4 — Grant hand tracking** when prompted.

The dashboard will update in real time showing all 25 joint coordinates per hand.

---

## Architecture

```
Spectacles browser
  (pinch-bounty.vercel.app)
         │
         │  WebSocket frames (hand data)
         ▼
Cloudflare Worker + Durable Object
  (pinch-relay.jenil-panchal10.workers.dev/ws)
         │
         │  broadcast to all connected clients
         ▼
Dashboard / any WebSocket consumer
  (pinch-relay.jenil-panchal10.workers.dev/viewer)
```

- The Vercel page is **static HTML** — it captures WebXR hand data and sends it to the relay.
- The Cloudflare Worker is a **pure pass-through relay** — it receives frames from Spectacles and instantly broadcasts them to every other connected client. Nothing is stored.
- The dashboard is **served by the same Worker** and receives frames over the same WebSocket.

---

## Files

| File | Purpose |
|------|---------|
| [index.html](index.html) | WebXR hand tracking page — runs in the Spectacles browser |
| [worker.js](worker.js) | Cloudflare Worker — WebSocket relay + serves the dashboard |
| [viewer.html](viewer.html) | Live coordinate dashboard — bundled into the Worker at deploy |
| [wrangler.toml](wrangler.toml) | Cloudflare Worker configuration |
| [server.js](server.js) | Local Node.js relay (fallback only — not needed in production) |
| [package.json](package.json) | Node dependencies (`ws`) and dev dependency (`wrangler`) |

---

## Hand data format

Every tracked frame broadcast over the WebSocket:

```json
{
  "frame": 482,
  "ts": 1718000000000,
  "left": {
    "joints": [
      { "pos": [x, y, z], "rot": [x, y, z, w] },
      ...
    ],
    "n": 25
  },
  "right": {
    "joints": [ ... ],
    "n": 25
  }
}
```

- `left` / `right` — only present when that hand is tracked.
- `joints` — array of 25 entries in canonical WebXR order (see below). Untracked joints are `null`.
- `n` — number of tracked joints for that hand.
- `pos` — position in metres, in the XR session's local reference space.
- `rot` — orientation as a quaternion `[x, y, z, w]`.

### Joint order (25 total)

| Index | Name |
|-------|------|
| 0 | wrist |
| 1–4 | thumb: metacarpal → proximal → distal → tip |
| 5–9 | index finger: metacarpal → proximal → intermediate → distal → tip |
| 10–14 | middle finger: metacarpal → proximal → intermediate → distal → tip |
| 15–19 | ring finger: metacarpal → proximal → intermediate → distal → tip |
| 20–24 | pinky: metacarpal → proximal → intermediate → distal → tip |

> Note: the WebXR thumb has no intermediate phalanx (4 joints, not 5). All other fingers have 5.

---

## Heartbeat messages

Once per second, the Spectacles page also sends a status heartbeat (not a hand frame):

```json
{
  "type": "status",
  "ts": 1718000000000,
  "xr": true,
  "left": 25,
  "right": 0
}
```

- `xr` — whether an AR session is currently active.
- `left` / `right` — number of tracked joints for each hand (0 if not tracked).

The dashboard uses these to show exactly where in the pipeline things are, even when no hands are being tracked.

---

## Dashboard status line

The dashboard shows a **Spectacles status** line that tells you exactly what stage the headset is at:

| What you see | Meaning |
|---|---|
| `never seen` (red) | Spectacles page hasn't connected to the relay |
| `page open ✓  AR session not started` (orange) | Page loaded, tap the screen to enter AR |
| `page open ✓  AR session ✓  hands: L:0 R:0` (green) | AR running, hold hands in view |
| `hands: L:25 R:25` + tables filling in | Fully tracking — coordinate tables update live |

---

## Consuming the data from your own code

Connect a WebSocket to the relay and you receive every frame in real time:

```js
const ws = new WebSocket('wss://pinch-relay.jenil-panchal10.workers.dev/ws');

ws.onmessage = (e) => {
  const data = JSON.parse(e.data);
  if (data.type === 'status') return; // heartbeat, skip

  const wrist = data.left?.joints[0];
  if (wrist) {
    console.log('left wrist:', wrist.pos); // [x, y, z] in metres
  }
};
```

---

## Re-deploying after changes

**Vercel (index.html changes):**
```bash
vercel --prod
```

**Cloudflare Worker (worker.js or viewer.html changes):**
```bash
npx wrangler deploy
```

---

## Local development (optional)

`server.js` is a local Node.js equivalent of the Worker for development without deploying.

```bash
npm install
node server.js          # starts on http://localhost:3001
```

Then open:
- `http://localhost:3001/` — index.html preview
- `http://localhost:3001/viewer` — dashboard preview
- `ws://localhost:3001/ws` — WebSocket relay

To test with Spectacles locally you need HTTPS, so point the page at the Worker:
```
https://pinch-bounty.vercel.app/?ws=wss://pinch-relay.jenil-panchal10.workers.dev/ws
```

---

## Cloudflare free tier limits

The Worker runs on Cloudflare's free plan. Relevant limits:

| Limit | Free tier | Typical usage |
|-------|-----------|---------------|
| Worker requests/day | 100,000 | ~2 requests per WebSocket upgrade |
| Durable Object messages | 1M / month | ~30 msg/s × 3600s = ~108k/hour |
| Durable Object duration | 400,000 GB·s / month | Well within limits for this use case |

At 30 fps with both hands tracked, you get approximately **9+ hours of continuous streaming per day** before hitting the monthly message limit.
