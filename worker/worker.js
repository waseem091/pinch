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
    for (const peer of this.state.getWebSockets()) {
      if (peer !== ws) try { peer.send(message); } catch {}
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
