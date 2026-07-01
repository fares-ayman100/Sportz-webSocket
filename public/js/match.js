(function () {
  const api = window.SportzApi;
  const utils = window.SportzUtils;

  const matchId = utils.getMatchIdFromUrl();
  const seenEvents = new Set();
  let socket = null;

  const elements = {
    stateRegion: document.getElementById('stateRegion'),
    timeline: document.getElementById('commentaryTimeline'),
    socketStatus: document.getElementById('socketStatus'),
    matchSport: document.getElementById('matchSport'),
    matchTitle: document.getElementById('matchTitle'),
    matchTime: document.getElementById('matchTime'),
    homeScore: document.getElementById('homeScore'),
    awayScore: document.getElementById('awayScore'),
  };

  function setSocketStatus(status) {
    elements.socketStatus.className = `connection-pill ${status}`;
    elements.socketStatus.innerHTML = `<span class="status-dot"></span>${utils.titleCase(status)}`;
  }

  function readSelectedMatch() {
    try {
      const stored = sessionStorage.getItem('sportz:selectedMatch');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  function renderMatchHeader() {
    const match = readSelectedMatch();
    if (!match || Number(match.id) !== matchId) {
      elements.matchTitle.textContent = `Match #${matchId}`;
      elements.matchTime.textContent = 'Loaded from backend commentary route';
      return;
    }

    elements.matchSport.textContent = utils.titleCase(match.sport);
    elements.matchTitle.textContent = `${match.homeTeam} vs ${match.awayTeam}`;
    elements.matchTime.textContent = utils.formatDate(match.startTime);
    elements.homeScore.textContent = match.homeScore ?? 0;
    elements.awayScore.textContent = match.awayScore ?? 0;
  }

  function commentaryKey(event) {
    return event.id ?? `${event.sequence}-${event.minute}-${event.message}`;
  }

  function renderEvent(event, animate) {
    const tone = utils.eventTone(event.eventType);
    const article = document.createElement('article');
    article.className = `timeline-item ${animate ? 'new-event' : ''}`;
    article.innerHTML = `
      <div class="minute-badge">${utils.escapeHtml(utils.formatMinute(event.minute))}</div>
      <div class="timeline-marker ${tone}"></div>
      <div class="event-card">
        <div class="event-topline">
          <span class="event-pill ${tone}">${utils.escapeHtml(utils.eventLabel(event.eventType))}</span>
          <span>${utils.escapeHtml(event.period || '')}</span>
        </div>
        <p>${utils.escapeHtml(event.message)}</p>
        <div class="event-meta">
          ${event.actor ? `<strong>${utils.escapeHtml(event.actor)}</strong>` : ''}
          ${event.team ? `<span>${utils.escapeHtml(event.team)}</span>` : ''}
        </div>
      </div>
    `;
    return article;
  }

  function appendEvent(event, animate) {
    const key = commentaryKey(event);
    if (seenEvents.has(key)) return;
    seenEvents.add(key);

    elements.timeline.appendChild(renderEvent(event, animate));
    if (animate) {
      elements.timeline.lastElementChild.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
      });
    }
  }

  async function loadCommentary() {
    elements.timeline.innerHTML = utils.renderTimelineSkeleton(5);
    elements.stateRegion.innerHTML = '';

    try {
      const events = utils.sortCommentaryOldestFirst(await api.getCommentary(matchId));
      elements.timeline.innerHTML = '';

      if (!events.length) {
        elements.stateRegion.innerHTML = utils.renderState(
          'empty',
          'No commentary yet',
          'You are subscribed. New updates will appear here automatically.',
        );
      }

      events.forEach((event) => appendEvent(event, false));
      elements.timeline.lastElementChild?.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
      });
    } catch (error) {
      elements.timeline.innerHTML = '';
      elements.stateRegion.innerHTML = utils.renderState(
        'error',
        'Commentary could not load',
        error.message || 'Check that your backend is running on port 3000.',
        'Retry',
      );
    }
  }

  function connectSocket() {
    socket = new window.SportzSocket(matchId, {
      onStatus: setSocketStatus,
      onSubscribed: () => setSocketStatus('connected'),
      onCommentary: (event) => {
        elements.stateRegion.innerHTML = '';
        appendEvent(event, true);
      },
    });
    socket.connect();
  }

  elements.stateRegion.addEventListener('click', (event) => {
    if (event.target.matches('[data-action="retry"]')) loadCommentary();
  });

  window.addEventListener('beforeunload', () => {
    if (socket) socket.close();
  });

  if (!Number.isInteger(matchId) || matchId <= 0) {
    elements.matchTitle.textContent = 'Invalid match';
    elements.stateRegion.innerHTML = utils.renderState(
      'error',
      'Invalid match id',
      'Open this page from a match card so the selected match id is available.',
    );
  } else {
    renderMatchHeader();
    loadCommentary();
    connectSocket();
  }
})();
