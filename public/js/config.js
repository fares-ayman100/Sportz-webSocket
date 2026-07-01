(function () {
  window.SportzConfig = {
    API_BASE_URL: window.location.origin,
    WS_BASE_URL: `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`,
    MATCH_LIMIT: 100,
    COMMENTARY_LIMIT: 100,
  };
})();
