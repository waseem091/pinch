/**
 * Pinch relay on Cloudflare Workers.
 *
 * WebSocket relay (Durable Object) + payment record store.
 *
 * Endpoints:
 *   /ws                  – WebSocket relay
 *   /viewer              – live coordinate dashboard
 *   GET  /payments/:id   – get Hedera tx ID for a quest
 *   POST /payments/:id   – store Hedera tx ID (called by hedera-monitor.js)
 */

import VIEWER_HTML from './viewer.html';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export class Relay {
  constructor(state) { this.state = state; }

  // ── WebSocket relay ────────────────────────────────────────────────────────
  async fetch(request) {
    const url = new URL(request.url);

    // Payment storage endpoints — routed through the DO so storage is consistent
    if (url.pathname.startsWith('/payments/')) {
      const questId = url.pathname.slice('/payments/'.length);
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: CORS });
      }
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

    // WebSocket upgrade
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

    // Route payment endpoints through the Durable Object (consistent storage)
    if (url.pathname.startsWith('/payments/')) {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: CORS });
      }
      const id = env.RELAY.idFromName('global');
      return env.RELAY.get(id).fetch(request);
    }

    if (url.pathname === '/ws') {
      const id = env.RELAY.idFromName('global');
      return env.RELAY.get(id).fetch(request);
    }

    if (url.pathname === '/' || url.pathname === '/viewer') {
      return new Response(VIEWER_HTML, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    return new Response('Not found', { status: 404 });
  },
};
