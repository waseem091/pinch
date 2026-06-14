/**
 * Pinch relay on Cloudflare Workers.
 *
 * Endpoints:
 *   /ws                    – WebSocket relay
 *   /viewer                – live coordinate dashboard
 *   GET  /payments/:id     – get Hedera tx ID for a quest
 *   POST /payments/:id     – store Hedera tx ID
 *   POST /verify-world-id  – verify World ID proof + store nullifier
 */

import VIEWER_HTML from './viewer.html';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const WORLD_VERIFY_URL = 'https://developer.worldcoin.org/api/v2/verify';
const WORLD_ACTION     = 'claim-bounty';

const ROBOT_API          = 'https://pinch-ie4r.onrender.com';
const HAND_RANGE         = 0.35;  // metres each side → full 0-180 servo travel
const CONTROL_INTERVAL   = 100;   // ms between robot control POSTs (max 10 fps)

export class Relay {
  constructor(state, env) {
    this.state = state;
    this.env   = env;
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // ── World ID verification ──────────────────────────────────────────────────
    if (url.pathname === '/verify-world-id' && request.method === 'POST') {
      const { proof, nullifier_hash, merkle_root, verification_level } =
        await request.json();

      // If already verified, let them through (same human, same nullifier)
      const existing = await this.state.storage.get(`nullifier:${nullifier_hash}`);
      if (existing) {
        return new Response(JSON.stringify({ ok: true, alreadyVerified: true }), {
          headers: { 'Content-Type': 'application/json', ...CORS },
        });
      }

      // Call World's verify API
      const worldRes = await fetch(
        `${WORLD_VERIFY_URL}/${this.env.WORLD_APP_ID}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            proof,
            nullifier_hash,
            merkle_root,
            verification_level,
            action: WORLD_ACTION,
          }),
        }
      );

      if (!worldRes.ok) {
        const err = await worldRes.json().catch(() => ({}));
        return new Response(
          JSON.stringify({ error: err.detail || 'World ID verification failed' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...CORS } }
        );
      }

      // Store nullifier to prevent sybil re-use
      await this.state.storage.put(`nullifier:${nullifier_hash}`, {
        verifiedAt: new Date().toISOString(),
      });

      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    // ── Payment storage ────────────────────────────────────────────────────────
    if (url.pathname.startsWith('/payments/')) {
      const questId = url.pathname.slice('/payments/'.length);
      if (request.method === 'GET') {
        const record = await this.state.storage.get(`payment:${questId}`);
        return new Response(JSON.stringify(record || null), {
          headers: { 'Content-Type': 'application/json', ...CORS },
        });
      }
      if (request.method === 'POST') {
        const body = await request.json();
        await this.state.storage.put(`payment:${questId}`, body);
        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json', ...CORS },
        });
      }
      return new Response('Method not allowed', { status: 405, headers: CORS });
    }

    // ── WebSocket upgrade ──────────────────────────────────────────────────────
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('expected websocket', { status: 426 });
    }
    const pair = new WebSocketPair();
    this.state.acceptWebSocket(pair[1]);
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  webSocketMessage(ws, message) {
    if (typeof message !== 'string') return;
    // Relay to all other connected clients (viewer, monitors, etc.)
    for (const peer of this.state.getWebSockets()) {
      if (peer !== ws) try { peer.send(message); } catch {}
    }
    // Forward hand tracking data to robot control endpoint
    this._forwardHandControl(message);
  }

  _forwardHandControl(rawMsg) {
    let frame;
    try { frame = JSON.parse(rawMsg); } catch { return; }

    // Skip heartbeat / status messages
    if (frame.type === 'status') return;

    // Throttle: max CONTROL_INTERVAL ms between POSTs
    const now = Date.now();
    if (this._lastControl && now - this._lastControl < CONTROL_INTERVAL) return;
    this._lastControl = now;

    // Update pan/tilt from wrist position when hands are visible
    const hand = frame.right || frame.left;
    if (hand?.joints?.[0]?.pos) {
      const [x, y] = hand.joints[0].pos;
      const clamp = v => Math.max(0, Math.min(180, Math.round(v)));
      this._lastPan  = clamp(90 + (x / HAND_RANGE) * 90);
      this._lastTilt = clamp(90 + (y / HAND_RANGE) * 90);
    }

    // Always forward — hold last known position when hands aren't visible.
    // This keeps the robot continuously receiving commands regardless of
    // whether an object is in front of the camera or hands are in frame.
    if (this._lastPan === undefined) return; // no position established yet

    const controlMsg = { type: 'control', pan: this._lastPan, tilt: this._lastTilt };

    // Path 1: REST endpoint (robot polls this when active)
    fetch(`${ROBOT_API}/api/control`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(controlMsg),
    }).catch(() => {});

    // Path 2: broadcast control message over WebSocket relay so the robot
    // receives it directly regardless of whether a bounty is active
    const msg = JSON.stringify(controlMsg);
    for (const peer of this.state.getWebSockets()) {
      try { peer.send(msg); } catch {}
    }
  }

  webSocketClose(ws) { try { ws.close(); } catch {} }
  webSocketError(ws)  { try { ws.close(); } catch {} }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    const routeToDO = () => {
      const id = env.RELAY.idFromName('global');
      return env.RELAY.get(id).fetch(request);
    };

    if (url.pathname === '/verify-world-id') return routeToDO();
    if (url.pathname.startsWith('/payments/'))  return routeToDO();
    if (url.pathname === '/ws')                 return routeToDO();

    if (url.pathname === '/' || url.pathname === '/viewer') {
      return new Response(VIEWER_HTML, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    return new Response('Not found', { status: 404 });
  },
};
