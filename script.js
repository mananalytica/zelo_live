/* ============================================================
   ZELO — SHARED SITE SCRIPT
   Injects the common header/footer (same logo + nav on every
   page), wires the mobile drawer, and exposes small utilities
   (toast, cart badge) that individual pages can call.
   Load this BEFORE any page-specific inline script.
   ============================================================ */

(function () {
  const NAV_LINKS = [
    { href: 'shop.html', label: 'Shop' },
    { href: 'live-sell.html', label: 'Live Sell' },
    { href: 'design-studio.html', label: 'Design Studio' },
    { href: 'measurements.html', label: 'Measurements' },
    { href: 'booking.html', label: 'Book a Fitting' },
    { href: 'blog.html', label: 'Journal' },
    { href: 'contact.html', label: 'Contact' }
  ];

  function currentPage() {
    const p = window.location.pathname.split('/').pop();
    return p === '' ? 'index.html' : p;
  }

  function headerHTML() {
    const here = currentPage();
    const links = NAV_LINKS.map(l =>
      `<a href="${l.href}" class="${here === l.href ? 'active' : ''}">${l.label}</a>`
    ).join('');
    return `
      <div class="container">
        <a href="index.html" class="brand">
          <img src="assets/logo.png" alt="Zelo logo" onerror="this.style.display='none'">
          <span class="brand-word">Zelo</span>
        </a>
        <nav class="main-nav">${links}</nav>
        <div class="header-actions">
          <a href="account.html" class="icon-btn" aria-label="Account">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>
          </a>
          <a href="checkout.html" class="icon-btn" aria-label="Cart">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 4h2l2.4 12.4a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 2-1.6L22 8H6"/><circle cx="10" cy="21" r="1"/><circle cx="18" cy="21" r="1"/></svg>
            <span class="cart-count" id="zelo-cart-count" style="display:none">0</span>
          </a>
          <button class="icon-btn nav-toggle" id="zelo-nav-toggle" aria-label="Menu">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
          </button>
        </div>
      </div>`;
  }

  function mobileNavHTML() {
    const links = NAV_LINKS.map(l => `<a href="${l.href}">${l.label}</a>`).join('');
    return `
      <div class="mobile-nav-scrim" id="zelo-nav-scrim"></div>
      <div class="mobile-nav-panel">
        <div class="flex-between" style="margin-bottom:12px">
          <span class="brand-word">Zelo</span>
          <button class="icon-btn" id="zelo-nav-close" aria-label="Close menu">✕</button>
        </div>
        ${links}
        <a href="account.html">Account</a>
        <a href="checkout.html">Cart</a>
      </div>`;
  }

  function footerHTML() {
    const year = new Date().getFullYear();
    return `
      <div class="container">
        <div class="footer-grid">
          <div>
            <span class="brand-word">Zelo <em>Studio</em></span>
            <p style="margin-top:10px;max-width:280px;font-size:13.5px">Made-to-measure tailoring, ready-to-wear drops, and live-sell clearance — all cut from the same seam.</p>
          </div>
          <div>
            <h5>Shop</h5>
            <ul>
              <li><a href="shop.html">Ready to Wear</a></li>
              <li><a href="live-sell.html">Live Sell</a></li>
              <li><a href="design-studio.html">Design Studio</a></li>
            </ul>
          </div>
          <div>
            <h5>Made to Measure</h5>
            <ul>
              <li><a href="measurements.html">Measurement Guide</a></li>
              <li><a href="booking.html">Book a Fitting</a></li>
              <li><a href="account.html">My Orders</a></li>
            </ul>
          </div>
          <div>
            <h5>Company</h5>
            <ul>
              <li><a href="blog.html">Journal</a></li>
              <li><a href="contact.html">Contact</a></li>
              <li><a href="privacy-policy.html">Privacy Policy</a></li>
              <li><a href="cookie-policy.html">Cookie Policy</a></li>
            </ul>
          </div>
        </div>
        <hr class="seam seam-navy seam-tight">
        <div class="footer-bottom">
          <span>© ${year} Zelo Studio. All rights reserved.</span>
          <span>Tailored in Lahore, worn everywhere.</span>
        </div>
      </div>`;
  }

  function injectChrome() {
    const headerMount = document.getElementById('site-header');
    const footerMount = document.getElementById('site-footer');
    if (headerMount) {
      headerMount.className = 'site-header';
      headerMount.innerHTML = headerHTML();
    }
    if (footerMount) {
      footerMount.className = 'site-footer';
      footerMount.innerHTML = footerHTML();
    }

    // Mobile nav drawer
    if (!document.getElementById('zelo-mobile-nav')) {
      const drawer = document.createElement('div');
      drawer.id = 'zelo-mobile-nav';
      drawer.className = 'mobile-nav';
      drawer.innerHTML = mobileNavHTML();
      document.body.appendChild(drawer);
    }
    const toggle = document.getElementById('zelo-nav-toggle');
    const drawer = document.getElementById('zelo-mobile-nav');
    const close = () => drawer.classList.remove('open');
    if (toggle) toggle.addEventListener('click', () => drawer.classList.add('open'));
    const scrim = document.getElementById('zelo-nav-scrim');
    const closeBtn = document.getElementById('zelo-nav-close');
    if (scrim) scrim.addEventListener('click', close);
    if (closeBtn) closeBtn.addEventListener('click', close);

    // Toast host
    if (!document.getElementById('zelo-toast')) {
      const toast = document.createElement('div');
      toast.id = 'zelo-toast';
      toast.className = 'toast';
      toast.innerHTML = `<div><div class="t-title" id="zelo-toast-title">Done</div><div class="t-msg" id="zelo-toast-msg"></div></div>`;
      document.body.appendChild(toast);
    }

    updateCartBadge();
  }

  /* ---- Shared utilities, exposed on window.Zelo ---- */
  function showToast(title, msg) {
    const t = document.getElementById('zelo-toast');
    if (!t) return;
    document.getElementById('zelo-toast-title').textContent = title;
    document.getElementById('zelo-toast-msg').textContent = msg || '';
    t.classList.add('show');
    clearTimeout(t._hideTimer);
    t._hideTimer = setTimeout(() => t.classList.remove('show'), 3000);
  }

  function getCart() {
    try { return JSON.parse(localStorage.getItem('zelo_cart') || '[]'); }
    catch (e) { return []; }
  }
  function setCart(cart) {
    localStorage.setItem('zelo_cart', JSON.stringify(cart));
    updateCartBadge();
  }
  function updateCartBadge() {
    const badge = document.getElementById('zelo-cart-count');
    if (!badge) return;
    const count = getCart().reduce((s, i) => s + (i.qty || 1), 0);
    if (count > 0) { badge.textContent = count; badge.style.display = 'flex'; }
    else badge.style.display = 'none';
  }

  window.Zelo = { showToast, getCart, setCart, updateCartBadge };

  document.addEventListener('DOMContentLoaded', injectChrome);
})();
