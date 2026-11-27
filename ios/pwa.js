(() => {
  const localPlay = location.pathname.endsWith('/game.html') &&
    new URLSearchParams(location.search).get('play') === 'local';
  window.kamaPwaLocalPlay = localPlay;

  document.addEventListener('DOMContentLoaded', () => {
    const offlineStatus = document.getElementById('offlineStatus');
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js')
        .then(() => navigator.serviceWorker.ready)
        .then(() => {
          if (offlineStatus) offlineStatus.textContent = 'Local play is ready for offline use.';
        })
        .catch(() => {
          if (offlineStatus) offlineStatus.textContent = 'Open Kama online to finish setting up offline play.';
        });
    }

    if (!localPlay) return;
    document.getElementById('deleteAccount').disabled = true;
    const joinSection = document.getElementById('duetJoin').closest('.duet-join');
    joinSection.classList.add('hidden');
    const signIn = document.createElement('a');
    signIn.className = 'button primary';
    signIn.href = 'signin.html';
    signIn.textContent = 'Sign in for Duet';
    document.getElementById('duetLobby').append(signIn);

    const originalSetMode = setMode;
    setMode = function (mode) {
      originalSetMode(mode);
      if (mode === 'duet') {
        document.getElementById('duetStatus').textContent =
          'Sign in with internet access to play with a remote partner.';
      }
    };
  });
})();
