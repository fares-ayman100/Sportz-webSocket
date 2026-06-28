const { WebSocketServer, WebSocket } = require('ws');
const { wsArcjet } = require('../arcjet');
const { ca } = require('zod/locales');

const sendJson = (socket, payload) => {
  if (socket.readyState !== WebSocket.OPEN) return;

  socket.send(JSON.stringify(payload));
};

const broadcast = (wss, payload) => {
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue;

    client.send(JSON.stringify(payload));
  }
};

const attachWebSocketServer = (server) => {
  const wss = new WebSocketServer({
    server,
    path: '/ws',
    maxPayload: 1024 * 1024,
  });

  wss.on('connection', async (socket, req) => {
    socket.on('error', console.error);
    if (wsArcjet) {
      try {
        const decision = await wsArcjet.protect(req);
        if (decision.isDenied()) {
          const code = decision.reason.isRateLimit() ? 1013 : 1008;
          const reason = decision.reason.isRateLimit()
            ? 'Rate Limit Exceeded'
            : 'Access Denied';
          socket.close(code, reason);
          return;
        }
      } catch (e) {
        console.error('Error in Arcjet WebSocket protection:', e);
        socket.close(1011, 'Internal Server Error');
        return;
      }
    }
    sendJson(socket, { type: 'welcome' });
  });

  const broadcastMatchCreated = (match) => {
    broadcast(wss, {
      type: 'match_created',
      data: match,
    });
  };

  return { broadcastMatchCreated };
};

module.exports = {
  attachWebSocketServer,
};
