(function () {
  const eventTones = {
    goal: 'goal',
    yellow_card: 'yellow',
    yellowcard: 'yellow',
    red_card: 'red',
    redcard: 'red',
    shot: 'shot',
    corner: 'corner',
    foul: 'foul',
    penalty: 'penalty',
    var: 'var',
    substitution: 'substitution',
    save: 'save',
  };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => {
      const entities = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      };
      return entities[char];
    });
  }

  function titleCase(value) {
    return String(value || 'Unknown')
      .split(/[\s_-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  function formatDate(value) {
    if (!value) return 'Time unavailable';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Time unavailable';

    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  function formatMinute(minute) {
    if (minute === null || minute === undefined || minute === '') return '--';
    return `${minute}'`;
  }

  function normalizeEventType(type) {
    return String(type || 'update').toLowerCase().replace(/\s+/g, '_');
  }

  function eventTone(type) {
    return eventTones[normalizeEventType(type)] || 'default';
  }

  function eventLabel(type) {
    return titleCase(normalizeEventType(type));
  }

  function getMatchIdFromUrl() {
    return Number(new URLSearchParams(window.location.search).get('id'));
  }

  function sortCommentaryOldestFirst(items) {
    return [...items].sort((a, b) => {
      const aKey = a.sequence ?? new Date(a.createdAt).getTime() ?? a.id ?? 0;
      const bKey = b.sequence ?? new Date(b.createdAt).getTime() ?? b.id ?? 0;
      return aKey - bKey;
    });
  }

  function renderSkeletonCards(count) {
    return Array.from({ length: count })
      .map(
        () => `
          <article class="match-card skeleton-card">
            <span></span>
            <strong></strong>
            <p></p>
            <p></p>
            <em></em>
          </article>
        `,
      )
      .join('');
  }

  function renderTimelineSkeleton(count) {
    return Array.from({ length: count })
      .map(
        () => `
          <article class="timeline-item skeleton-timeline">
            <span></span>
            <div>
              <strong></strong>
              <p></p>
              <em></em>
            </div>
          </article>
        `,
      )
      .join('');
  }

  function renderState(type, title, message, actionLabel) {
    return `
      <div class="state-card ${type}">
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(message)}</p>
        ${
          actionLabel
            ? `<button class="primary-button" type="button" data-action="retry">${escapeHtml(actionLabel)}</button>`
            : ''
        }
      </div>
    `;
  }

  window.SportzUtils = {
    escapeHtml,
    titleCase,
    formatDate,
    formatMinute,
    eventTone,
    eventLabel,
    getMatchIdFromUrl,
    sortCommentaryOldestFirst,
    renderSkeletonCards,
    renderTimelineSkeleton,
    renderState,
  };
})();
