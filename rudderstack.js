/* ============================================================
   ZELO — RUDDERSTACK LOADER
   Loads the RudderStack SDK only after cookie consent is
   accepted. Replace WRITE_KEY and DATA_PLANE_URL with your
   real values before going live.

   Events fired via ZeloAnalytics.track() before consent/load are
   queued in memory and flushed the moment the SDK finishes
   loading — so a "Product Viewed" fired the instant a page opens
   isn't lost just because the consent banner hadn't been
   answered yet.
   ============================================================ */

(function () {
  const WRITE_KEY = 'REPLACE_WITH_RUDDERSTACK_WRITE_KEY';
  const DATA_PLANE_URL = 'https://REPLACE_WITH_YOUR_DATAPLANE_URL';
  const CONFIGURED = !WRITE_KEY.startsWith('REPLACE');

  let loaded = false;
  let queue = [];

  function loadSDK() {
    if (loaded || !CONFIGURED) return;
    loaded = true;
    /* eslint-disable */
    !function(){"use strict";window.RudderSnippetVersion="3.0.34";var sdkBaseUrl="https://cdn.rudderlabs.com";var sdkFileName="rsa.min.js";var async=!0;var e=window.rudderanalytics=window.rudderanalytics||[];e.methods=["setDefaultInstanceKey","load","ready","page","track","identify","alias","group","reset","setAnonymousId","startSession","endSession","consent"];e.factory=function(t){return function(){var r=Array.prototype.slice.call(arguments);return r.unshift(t),e.push(r),e}};for(var t=0;t<e.methods.length;t++){var r=e.methods[t];e[r]=e.factory(r)}e.loadJS=function(e,t){var r=document.createElement("script");r.type="text/javascript",r.async=!0,r.src=[sdkBaseUrl,"v3",sdkFileName].join("/");var s=document.getElementsByTagName("script")[0];s.parentNode.insertBefore(r,s)};e.loadJS();
    }();
    /* eslint-enable */
    try {
      window.rudderanalytics.load(WRITE_KEY, DATA_PLANE_URL, { integrations: { All: true } });
      window.rudderanalytics.page();
      flushQueue();
    } catch (err) { console.warn('[rudderstack] failed to init', err); }
  }

  function flushQueue() {
    if (!window.rudderanalytics) return;
    queue.forEach(({ event, props }) => window.rudderanalytics.track(event, props));
    queue = [];
  }

  function onConsent(detail) {
    if (detail === 'accepted') loadSDK();
  }
  document.addEventListener('zelo:consent', (e) => onConsent(e.detail));

  window.ZeloAnalytics = {
    track: function (event, props) {
      props = props || {};
      if (window.rudderanalytics && loaded) {
        window.rudderanalytics.track(event, props);
      } else {
        // Buffered, not dropped — flushed automatically once the SDK loads
        // (i.e. as soon as consent is accepted, if a real WRITE_KEY is set).
        queue.push({ event, props });
        if (!CONFIGURED) console.log('[analytics:no write key set — event captured but not sent]', event, props);
        else console.log('[analytics:queued until consent/load]', event, props);
      }
    }
  };
})();
