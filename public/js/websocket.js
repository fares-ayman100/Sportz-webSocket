(function () {
  class SportzSocket {
    constructor(matchId, handlers) {
      this.matchId = Number(matchId);
      this.handlers = handlers || {};
      this.socket = null;
      this.closedByPage = false;
      this.reconnectAttempts = 0;
      this.reconnectTimer = null;
    }

    connect() {
      this.closedByPage = false;
      this.setStatus('connecting');
      this.socket = new WebSocket(window.SportzConfig.WS_BASE_URL);

      this.socket.addEventListener('open', () => {
        this.reconnectAttempts = 0;
        this.setStatus('connected');
        this.send({ type: 'subscribe', matchId: this.matchId });
      });

      this.socket.addEventListener('message', (event) => {
        this.handleMessage(event);
      });

      this.socket.addEventListener('close', () => {
        this.setStatus('disconnected');
        if (!this.closedByPage) this.scheduleReconnect();
      });

      this.socket.addEventListener('error', () => {
        this.setStatus('error');
      });
    }

    handleMessage(event) {
      let payload;
      try {
        payload = JSON.parse(event.data);
      } catch {
        return;
      }

      if (payload.type === 'welcome') {
        this.handlers.onWelcome?.(payload);
      }

      if (payload.type === 'subscribed') {
        this.handlers.onSubscribed?.(payload);
      }

      if (payload.type === 'commentary') {
        this.handlers.onCommentary?.(payload.data);
      }

      if (payload.type === 'match_created') {
        this.handlers.onMatchCreated?.(payload.data);
      }
    }

    scheduleReconnect() {
      const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 12000);
      this.reconnectAttempts += 1;
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = window.setTimeout(() => this.connect(), delay);
    }

    send(payload) {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify(payload));
      }
    }

    setStatus(status) {
      this.handlers.onStatus?.(status);
    }

    close() {
      this.closedByPage = true;
      window.clearTimeout(this.reconnectTimer);
      this.send({ type: 'unsubscribe', matchId: this.matchId });
      if (this.socket) this.socket.close();
    }
  }

  window.SportzSocket = SportzSocket;
})();
