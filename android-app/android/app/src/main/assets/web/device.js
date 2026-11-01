// Responsive session state and modal sizing, including the mobile on-screen keyboard.
(() => {
  const viewport = window.visualViewport;
  let resizeFrame = 0;
  function resizeViewport() {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      document.documentElement.style.setProperty('--visual-height', `${Math.round(viewport?.height || innerHeight)}px`);
    });
  }
  window.addEventListener('resize', resizeViewport, { passive: true });
  viewport?.addEventListener('resize', resizeViewport, { passive: true });
  resizeViewport();

  const session = document.getElementById('sessionPanel');
  if (session) {
    const desktop = matchMedia('(min-width: 980px)');
    const resizeSession = () => { session.open = desktop.matches; };
    resizeSession();
    desktop.addEventListener('change', resizeSession);
  }

  const dialogs = [...document.querySelectorAll('dialog')];
  if (dialogs.length) {
    const updateModalState = () => {
      document.documentElement.classList.toggle('modal-open', dialogs.some(dialog => dialog.open));
    };
    const observer = new MutationObserver(updateModalState);
    dialogs.forEach(dialog => {
      observer.observe(dialog, { attributes: true, attributeFilter: ['open'] });
      dialog.addEventListener('close', updateModalState);
    });
    document.addEventListener('focusin', event => {
      if (event.target.matches('dialog input,dialog textarea')) {
        requestAnimationFrame(() => event.target.scrollIntoView({ block: 'nearest', behavior: 'instant' }));
      }
    });
  }
})();
