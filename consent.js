/* ============================================================
   ZELO — COOKIE CONSENT
   Minimal consent banner. Stores the visitor's choice in
   localStorage and only fires analytics (see rudderstack.js)
   after "Accept" is pressed. Load after script.js.
   ============================================================ */

(function () {
  const CONSENT_KEY = 'zelo_consent';

  function getConsent() {
    return localStorage.getItem(CONSENT_KEY); // 'accepted' | 'declined' | null
  }

  function setConsent(value) {
    localStorage.setItem(CONSENT_KEY, value);
    document.dispatchEvent(new CustomEvent('zelo:consent', { detail: value }));
    hideBanner();
  }

  function bannerHTML() {
    return `
      <p>We use cookies for essential site function and, with your consent, to understand how the live-sell and shop pages are used.
      See our <a href="cookie-policy.html">Cookie Policy</a>.</p>
      <div class="flex gap-sm" style="flex-shrink:0">
        <button class="btn btn-outline btn-sm" id="zelo-consent-decline">Decline</button>
        <button class="btn btn-primary btn-sm" id="zelo-consent-accept">Accept</button>
      </div>`;
  }

  function showBanner() {
    let el = document.getElementById('zelo-consent-banner');
    if (!el) {
      el = document.createElement('div');
      el.id = 'zelo-consent-banner';
      el.className = 'consent-banner';
      document.body.appendChild(el);
    }
    el.innerHTML = bannerHTML();
    el.classList.add('show');
    document.getElementById('zelo-consent-accept').addEventListener('click', () => setConsent('accepted'));
    document.getElementById('zelo-consent-decline').addEventListener('click', () => setConsent('declined'));
  }

  function hideBanner() {
    const el = document.getElementById('zelo-consent-banner');
    if (el) el.classList.remove('show');
  }

  document.addEventListener('DOMContentLoaded', () => {
    const existing = getConsent();
    if (!existing) {
      setTimeout(showBanner, 600);
    } else {
      document.dispatchEvent(new CustomEvent('zelo:consent', { detail: existing }));
    }
  });

  window.ZeloConsent = { get: getConsent, set: setConsent };
})();
