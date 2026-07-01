(function () {
  const api = window.SportzApi;
  const utils = window.SportzUtils;

  const state = {
    matches: [],
    search: '',
    sport: 'all',
    status: 'all',
  };

  const elements = {
    grid: document.getElementById('matchesGrid'),
    stateRegion: document.getElementById('stateRegion'),
    search: document.getElementById('searchInput'),
    sport: document.getElementById('sportFilter'),
    status: document.getElementById('statusFilter'),
    count: document.getElementById('matchCount'),
    connection: document.getElementById('connectionStatus'),
  };

  function setBackendStatus(status) {
    elements.connection.className = `connection-pill ${status}`;
    elements.connection.innerHTML = `<span class="status-dot"></span>${utils.titleCase(status)}`;
  }

  function createOptions(select, values, fallback) {
    select.innerHTML = `<option value="all">${fallback}</option>`;
    values.forEach((value) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = utils.titleCase(value);
      select.appendChild(option);
    });
  }

  function hydrateFilters() {
    const sports = [
      ...new Set(
        state.matches.map((match) => match.sport).filter(Boolean),
      ),
    ];
    const statuses = [
      ...new Set(
        state.matches.map((match) => match.status).filter(Boolean),
      ),
    ];
    createOptions(elements.sport, sports, 'All sports');
    createOptions(elements.status, statuses, 'All statuses');
  }

  function filteredMatches() {
    const query = state.search.trim().toLowerCase();
    return state.matches.filter((match) => {
      const haystack =
        `${match.homeTeam} ${match.awayTeam} ${match.sport}`.toLowerCase();
      const searchMatch = !query || haystack.includes(query);
      const sportMatch =
        state.sport === 'all' || match.sport === state.sport;
      const statusMatch =
        state.status === 'all' || match.status === state.status;
      return searchMatch && sportMatch && statusMatch;
    });
  }

  function renderMatch(match, index) {
    const encoded = encodeURIComponent(JSON.stringify(match));
    const isLive = match.status === 'live';
    return `
      <article class="match-card reveal" style="animation-delay:${index * 45}ms">
        <div class="card-topline">
          <span class="soft-pill">${utils.escapeHtml(utils.titleCase(match.sport))}</span>
          <span class="${isLive ? 'live-pill' : 'soft-pill'}">${utils.escapeHtml(utils.titleCase(match.status))}</span>
        </div>
        <div class="teams">
          <div class="team-row">
            <span>${utils.escapeHtml(match.homeTeam)}</span>
            <strong class="score-number">${match.homeScore ?? 0}</strong>
          </div>
          <div class="team-row">
            <span>${utils.escapeHtml(match.awayTeam)}</span>
            <strong class="score-number">${match.awayScore ?? 0}</strong>
          </div>
        </div>
        <p class="match-time">${utils.escapeHtml(utils.formatDate(match.startTime))}</p>
        <a class="watch-button" href="./match.html?id=${match.id}" data-match="${encoded}">
          Watch Live
        </a>
      </article>
    `;
  }

  function render() {
    const matches = filteredMatches();
    elements.count.textContent = state.matches.length;
    elements.stateRegion.innerHTML = '';
    elements.grid.innerHTML = '';

    if (!matches.length) {
      elements.stateRegion.innerHTML = utils.renderState(
        'empty',
        'No matches found',
        'Try changing the search term, sport, or status filter.',
      );
      return;
    }

    elements.grid.innerHTML = matches.map(renderMatch).join('');
  }

  async function loadMatches() {
    elements.grid.innerHTML = utils.renderSkeletonCards(6);
    elements.stateRegion.innerHTML = '';
    setBackendStatus('connecting');

    try {
      state.matches = await api.getMatches();
      setBackendStatus('connected');
      hydrateFilters();
      render();
    } catch (error) {
      setBackendStatus('error');
      elements.grid.innerHTML = '';
      elements.stateRegion.innerHTML = utils.renderState(
        'error',
        'Matches could not load',
        error.message ||
          'Check that your backend is running on port 3000.',
        'Retry',
      );
    }
  }

  elements.search.addEventListener('input', (event) => {
    state.search = event.target.value;
    render();
  });

  elements.sport.addEventListener('change', (event) => {
    state.sport = event.target.value;
    render();
  });

  elements.status.addEventListener('change', (event) => {
    state.status = event.target.value;
    render();
  });

  elements.stateRegion.addEventListener('click', (event) => {
    if (event.target.matches('[data-action="retry"]')) loadMatches();
  });

  elements.grid.addEventListener('click', (event) => {
    const link = event.target.closest('[data-match]');
    if (!link) return;
    sessionStorage.setItem(
      'sportz:selectedMatch',
      decodeURIComponent(link.dataset.match),
    );
  });

  function addMatch(match) {
    const exists = state.matches.some((m) => m.id === match.id);

    if (exists) return;

    state.matches.unshift(match);

    hydrateFilters();
    render();
  }

  loadMatches();

  const socket = new WebSocket(window.SportzConfig.WS_BASE_URL);

  socket.addEventListener('open', () => {
    console.log('✅ WebSocket Connected');
    setBackendStatus('connected');
  });

  socket.addEventListener('message', (event) => {
    let payload;

    try {
      payload = JSON.parse(event.data);
    } catch {
      return;
    }

    switch (payload.type) {
      case 'welcome':
        console.log('👋 Welcome');
        break;

      case 'match_created':
        console.log('⚽ New Match:', payload.data);

        addMatch(payload.data);
        break;

      default:
        break;
    }
  });

  socket.addEventListener('close', () => {
    console.log('❌ WebSocket Closed');
    setBackendStatus('disconnected');
  });

  socket.addEventListener('error', (err) => {
    console.error('WebSocket Error:', err);
    setBackendStatus('error');
  });
})();
