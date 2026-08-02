/* ============================================================
   ZELO — RUDDERSTACK LOADER (stub)
   Loads the RudderStack SDK only after cookie consent is
   accepted. Replace WRITE_KEY and DATA_PLANE_URL with your
   real values before going live. Safe to leave as-is in the
   meantime — it will not load or send data without consent.
   ============================================================ */

(function () {
  const WRITE_KEY = 'REPLACE_WITH_RUDDERSTACK_WRITE_KEY';
  const DATA_PLANE_URL = 'https://REPLACE_WITH_YOUR_DATAPLANE_URL';

  let loaded = false;

  function loadSDK() {
    if (loaded || WRITE_KEY.startsWith('REPLACE')) return;
    loaded = true;
    /* eslint-disable */
    !function(){"use strict";window.RudderSnippetVersion="3.0.34";var sdkBaseUrl="https://cdn.rudderlabs.com";var sdkFileName="rsa.min.js";var async=!0;var e=window.rudderanalytics=window.rudderanalytics||[];e.methods=["setDefaultInstanceKey","load","ready","page","track","identify","alias","group","reset","setAnonymousId","startSession","endSession","consent"];e.factory=function(t){return function(){var r=Array.prototype.slice.call(arguments);return r.unshift(t),e.push(r),e}};for(var t=0;t<e.methods.length;t++){var r=e.methods[t];e[r]=e.factory(r)}e.loadJS=function(e,t){var r=document.createElement("script");r.type="text/javascript",r.async=!0,r.src=[sdkBaseUrl,"v3",sdkFileName].join("/");var s=document.getElementsByTagName("script")[0];s.parentNode.insertBefore(r,s)};e.loadJS();
    }();
    /* eslint-enable */
    try {
      window.rudderanalytics.load(WRITE_KEY, DATA_PLANE_URL, { integrations: { All: true } });
      window.rudderanalytics.page();
    } catch (err) { console.warn('[rudderstack] failed to init', err); }
  }

  function onConsent(detail) {
    if (detail === 'accepted') loadSDK();
  }

  document.addEventListener('zelo:consent', (e) => onConsent(e.detail));

  // Fallback: in case consent.js isn't present on a page, no-op.
  window.ZeloAnalytics = {
    track: function (event, props) {
      if (window.rudderanalytics && loaded) window.rudderanalytics.track(event, props || {});
      else console.log('[analytics:queued]', event, props || {});
    }
  };
})();
