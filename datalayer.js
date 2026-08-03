/* ============================================================
   ZELO — DATALAYER (Google Analytics 4 / GTM Enhanced Ecommerce)
   Initializes window.dataLayer immediately so ecommerce events
   pushed anywhere on the site are captured from the very first
   page load — even before a GTM container is wired up.

   Load this FIRST, before script.js, consent.js, or rudderstack.js,
   so dataLayer already exists by the time anything tries to push
   to it.

   To actually send this data to Google Analytics / Google Ads,
   set GTM_CONTAINER_ID below to your real container (format
   "GTM-XXXXXXX") and add the <noscript> snippet immediately after
   the opening <body> tag on every page (see the comment at the
   bottom of this file for the exact markup). Until you do that,
   events still push to window.dataLayer correctly — there's just
   no GTM container listening yet, so nothing reaches Google.
   ============================================================ */

window.dataLayer = window.dataLayer || [];

(function () {
  const GTM_CONTAINER_ID = 'REPLACE_WITH_GTM_CONTAINER_ID'; // e.g. 'GTM-ABCD123'
  const CONFIGURED = /^GTM-/.test(GTM_CONTAINER_ID);

  function gtag() { window.dataLayer.push(arguments); }

  // Google Consent Mode v2 defaults — denied until the cookie banner
  // is accepted, updated by consent.js via the zelo:consent event.
  gtag('consent', 'default', {
    ad_storage: 'denied',
    analytics_storage: 'denied',
    wait_for_update: 500
  });

  let loaded = false;
  function loadGTM() {
    if (loaded || !CONFIGURED) return;
    loaded = true;
    /* eslint-disable */
    (function (w, d, s, l, i) {
      w[l] = w[l] || []; w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
      var f = d.getElementsByTagName(s)[0], j = d.createElement(s), dl = l != 'dataLayer' ? '&l=' + l : '';
      j.async = true; j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl;
      f.parentNode.insertBefore(j, f);
    })(window, document, 'script', 'dataLayer', GTM_CONTAINER_ID);
    /* eslint-enable */
  }

  document.addEventListener('zelo:consent', function (e) {
    gtag('consent', 'update', {
      ad_storage: e.detail === 'accepted' ? 'granted' : 'denied',
      analytics_storage: e.detail === 'accepted' ? 'granted' : 'denied'
    });
    if (e.detail === 'accepted') loadGTM();
  });
})();

/*
  Once you have a real GTM_CONTAINER_ID, also add this immediately
  after <body> on every page (GTM's standard noscript fallback):

  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX"
  height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
*/
