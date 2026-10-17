'use strict';

// Keep installation/update handling separate from audio playback.
if ('serviceWorker' in navigator && window.isSecureContext) {
  const notice = document.getElementById('update-notice');
  const updateButton = document.getElementById('update-app');
  let registration;
  let updateRequested = false;
  let refreshing = false;

  function showUpdate() {
    if (registration?.waiting && navigator.serviceWorker.controller) notice.hidden = false;
  }

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Never interrupt playback just because another tab activated a worker.
    if (updateRequested && !refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });

  updateButton.addEventListener('click', () => {
    if (!registration?.waiting) {
      // Another tab may have activated it since the notice appeared.
      window.location.reload();
      return;
    }
    updateRequested = true;
    updateButton.disabled = true;
    updateButton.textContent = 'Actualizando…';
    registration.waiting.postMessage({ type: 'ACTIVATE_UPDATE' });
  });

  navigator.serviceWorker.register('sw.js', { scope: './', updateViaCache: 'none' }).then(value => {
    registration = value;
    const watchInstalling = () => {
      const worker = registration.installing;
      if (worker) worker.addEventListener('statechange', () => {
        if (worker.state === 'installed') showUpdate();
      });
    };
    registration.addEventListener('updatefound', watchInstalling);
    watchInstalling();
    showUpdate();
    const checkUpdate = () => {
      if (navigator.onLine && document.visibilityState === 'visible') {
        registration.update().catch(() => { /* Try again on the next visit or reconnection. */ });
      }
    };
    window.addEventListener('online', checkUpdate);
    document.addEventListener('visibilitychange', checkUpdate);
    window.setInterval(checkUpdate, 60 * 60 * 1000);
    checkUpdate();
  }).catch(() => {
    // Streaming works without a service worker, including in restricted browsers.
  });
}
