const { WebSocketServer, WebSocket } = require('ws');
const { wsArcjet } = require('../arcjet');
const { ca } = require('zod/locales');
const { json } = require('zod');

const matchSubscribers = new Map();
const subscribers = (matchId, socket) => {
  if (!matchSubscribers.has(matchId)) {
    matchSubscribers.set(matchId, new Set());
  }
  matchSubscribers.get(matchId).add(socket);
};

const unsbuscribers = (matchId, socket) => {
  const subscribers = matchSubscribers.get(matchId);
  if (!subscribers) return;
  subscribers.delete(socket);
  if (subscribers.size == 0) {
    matchSubscribers.delete(matchId);
  }
};

const cleanupSubscribers = (socket) => {
  for (const matchId of socket.subscriptions) {
    unsbuscribers(matchId, socket);
  }
};

const sendJson = (socket, payload) => {
  if (socket.readyState !== WebSocket.OPEN) return;

  socket.send(JSON.stringify(payload));
};

const broadcastToAll = (wss, payload) => {
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue;

    client.send(JSON.stringify(payload));
  }
};

const broadcastToMatch = (matchId, payload) => {
  const subscribers = matchSubscribers.get(matchId);
  if (!subscribers || subscribers.size == 0) return;
  const message = JSON.stringify(payload);
  for (const client of subscribers) {
    if (client.readyState == WebSocket.OPEN) {
      client.send(message);
    }
  }
};

const handelMessage = (socket, data) => {
  let message;
  try {
    message = JSON.parse(data.toString());
  } catch (e) {
    sendJson(socket, {
      type: 'error',
      error: 'Invalid JSON',
    });
    return;
  }
  if (message?.type == 'subscribe' && Number.isInteger(message.matchId)) {
    subscribers(message.matchId, socket);

    socket.subscriptions.add(message.matchId);
    sendJson(socket, {
      type: 'subscribed',
      matchId: message.matchId,
    });
  }

  if (
    message?.type == 'unsubscribe' &&
    Number.isInteger(message.matchId)
  ) {
    unsbuscribers(message.matchId, socket);
    socket.subscriptions.delete(message.matchId);
    sendJson(socket, {
      type: 'unsubscribed',
      matchId: message.matchId,
    });
  }
};

const attachWebSocketServer = (server) => {
  const wss = new WebSocketServer({
    server,
    path: '/ws',
    maxPayload: 1024 * 1024,
  });

  wss.on('connection', async (socket, req) => {
    socket.on('error', (err) => {
      console.error(err);
      socket.terminate();
    });

    socket.subscriptions = new Set();
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

    socket.on('message', (data) => handelMessage(socket, data));

    socket.on('close', () => {
      cleanupSubscribers(socket);
    });

  });

  const broadcastMatchCreated = (match) => {
    broadcastToAll(wss, {
      type: 'match_created',
      data: match,
    });
  };
  const broadcastCommentary = (matchId, comment) => {
    broadcastToMatch(matchId, {
      type: 'commentary',
      data: comment,
    });
  };

  return { broadcastMatchCreated, broadcastCommentary };
};

module.exports = {
  attachWebSocketServer,
};
