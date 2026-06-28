const express = require("express");
const http = require('http');

const matchesRouter = require('./routes/matches');
const { attachWebSocketServer } = require('./ws/server');
const { securityMiddleware } = require('./arcjet');

const app = express();

const server = http.createServer(app);

const { broadcastMatchCreated } = attachWebSocketServer(server);
app.locals.broadcastMatchCreated = broadcastMatchCreated;


app.use(express.json());

app.use(securityMiddleware());
app.get('/', (req, res) => {
  res.send('Welcome to the Sportz API');
});
app.use('/matches', matchesRouter);


app.use((err, req, res, next) => {
  console.error(err);

  res.status(500).json({
    error: 'Internal Server Error',
  });
});
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => {
  const BASE_URL =
    HOST == '0.0.0.0'
      ? `http://localhost:${PORT}`
      : `http://${HOST}:${PORT}`;
  console.log(`Server is running at ${BASE_URL}`);
  console.log(`WebSocket running at ${BASE_URL.replace('http', 'ws')}/ws`);
});
