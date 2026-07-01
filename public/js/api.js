(function () {
  const config = window.SportzConfig;

  async function request(path) {
    const response = await fetch(`${config.API_BASE_URL}${path}`, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      let message = `Request failed with status ${response.status}`;
      try {
        const payload = await response.json();
        message = payload.error || message;
      } catch {
        message = response.statusText || message;
      }
      throw new Error(message);
    }

    return response.json();
  }

  async function getMatches() {
    const payload = await request(`/matches?limit=${config.MATCH_LIMIT}`);
    return payload.data || [];
  }

  async function getCommentary(matchId) {
    const payload = await request(
      `/matches/${matchId}/commentary?limit=${config.COMMENTARY_LIMIT}`,
    );
    return payload.data || [];
  }

  window.SportzApi = {
    getMatches,
    getCommentary,
  };
})();
