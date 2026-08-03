/* ============================================================
   ZELO — SHARED SITE SCRIPT
   Injects the common header/footer, wires the mobile drawer,
   and exposes shared utilities on window.Zelo:
     - cart (localStorage, shared across pages)
     - toast
     - API helpers (products, live feeds, contact, newsletter,
       signup/login, admin-key-authed writes) — all hit /api/*
       (see api/index.py). If that backend isn't deployed/
       configured yet, calls fail gracefully and pages fall back
       to their own sample data instead of breaking.
   Load this BEFORE any page-specific inline script.
   ============================================================ */

(function () {
  const API_BASE = ''; // same-origin '/api/...'; change if your API is on a different host

  const NAV_LINKS = [
    { href: 'index.html', label: 'Shop' },
    { href: 'live-sell.html', label: 'Live Sell' },
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
          <img src="assets/logo.png" alt="Zelo" onerror="this.style.display='none'">
          <span class="brand-word">Zelo</span>
        </a>
        <nav class="main-nav">${links}</nav>
        <div class="header-actions">
          <a href="account.html" class="icon-btn" aria-label="Sign In / Sign Up">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>
          </a>
          <a href="cart.html" class="icon-btn" aria-label="Cart">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 4h2l2.4 12.4a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 2-1.6L22 8H6"/><circle cx="10" cy="21" r="1"/><circle cx="18" cy="21" r="1"/></svg>
            <span class="cart-count" id="zelo-cart-count" style="display:none">0</span>
          </a>
          <button class="icon-btn nav-toggle" id="zelo-nav-toggle" aria-label="Menu">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
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
        <a href="account.html">Sign In / Sign Up</a>
        <a href="cart.html">Cart</a>
      </div>`;
  }

  function footerHTML() {
    const year = new Date().getFullYear();
    return `
      <div class="container">
        <div class="footer-grid">
          <div>
            <span class="brand-word">Zelo</span>
            <p style="margin:14px 0 16px;max-width:280px;font-size:13px">Genuine export-leftover fashion, sold live from the warehouse floor. New drops daily — sign up for first access.</p>
            <form class="newsletter-row" onsubmit="return zeloNewsletterSubmit(event, this)">
              <input type="email" placeholder="Email address" required>
              <button type="submit">Join</button>
            </form>
          </div>
          <div>
            <h5>Shop</h5>
            <ul>
              <li><a href="index.html">All Products</a></li>
              <li><a href="live-sell.html">Live Sell</a></li>
            </ul>
          </div>
          <div>
            <h5>Account</h5>
            <ul>
              <li><a href="account.html">Sign In / Sign Up</a></li>
              <li><a href="cart.html">Cart</a></li>
              <li><a href="admin.html">Admin</a></li>
            </ul>
          </div>
          <div>
            <h5>Company</h5>
            <ul>
              <li><a href="contact.html">Contact</a></li>
              <li><a href="privacy-policy.html">Privacy Policy</a></li>
              <li><a href="cookie-policy.html">Cookie Policy</a></li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          <span>© ${year} ZELO. ALL RIGHTS RESERVED.</span>
          <span>LAHORE, PAKISTAN</span>
        </div>
      </div>`;
  }

  function injectChrome() {
    const headerMount = document.getElementById('site-header');
    const footerMount = document.getElementById('site-footer');
    if (headerMount) { headerMount.className = 'site-header'; headerMount.innerHTML = headerHTML(); }
    if (footerMount) { footerMount.className = 'site-footer'; footerMount.innerHTML = footerHTML(); }

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

    if (!document.getElementById('zelo-toast')) {
      const toast = document.createElement('div');
      toast.id = 'zelo-toast';
      toast.className = 'toast';
      toast.innerHTML = `<div><div class="t-title" id="zelo-toast-title">Done</div><div class="t-msg" id="zelo-toast-msg"></div></div>`;
      document.body.appendChild(toast);
    }

    if (!document.getElementById('zelo-cart-drawer')) {
      const drawer = document.createElement('div');
      drawer.id = 'zelo-cart-drawer';
      drawer.className = 'mobile-nav'; /* reuses the same scrim/panel pattern as the mobile nav */
      drawer.innerHTML = `
        <div class="mobile-nav-scrim" id="zelo-cart-scrim"></div>
        <div class="mobile-nav-panel" style="width:360px">
          <div class="flex-between" style="margin-bottom:14px">
            <span style="font-family:var(--font-mono);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em">Added to Cart</span>
            <button class="icon-btn" id="zelo-cart-close" aria-label="Close cart">✕</button>
          </div>
          <div id="zelo-cart-drawer-items" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:14px"></div>
          <div style="border-top:1px solid var(--line);padding-top:14px;margin-top:14px">
            <div class="flex-between" style="margin-bottom:12px"><strong style="font-size:12.5px;text-transform:uppercase;letter-spacing:0.04em">Subtotal</strong><span class="price" id="zelo-cart-drawer-subtotal" style="font-size:15px"></span></div>
            <a href="cart.html" class="btn btn-outline btn-block" style="margin-bottom:8px">View Full Cart</a>
            <a href="checkout.html" class="btn btn-primary btn-block">Begin Checkout</a>
            <button class="btn btn-outline btn-block" id="zelo-cart-continue" style="margin-top:8px">Continue Shopping</button>
          </div>
        </div>`;
      document.body.appendChild(drawer);
      document.getElementById('zelo-cart-scrim').addEventListener('click', closeCartDrawer);
      document.getElementById('zelo-cart-close').addEventListener('click', closeCartDrawer);
      document.getElementById('zelo-cart-continue').addEventListener('click', closeCartDrawer);
    }

    updateCartBadge();
  }

  /* ---- Toast ---- */
  function showToast(title, msg) {
    const t = document.getElementById('zelo-toast');
    if (!t) return;
    document.getElementById('zelo-toast-title').textContent = title;
    document.getElementById('zelo-toast-msg').textContent = msg || '';
    t.classList.add('show');
    clearTimeout(t._hideTimer);
    t._hideTimer = setTimeout(() => t.classList.remove('show'), 3200);
  }

  /* ---- Cart (shared via localStorage) ---- */
  function getCart() { try { return JSON.parse(localStorage.getItem('zelo_cart') || '[]'); } catch (e) { return []; } }
  function setCart(cart) { localStorage.setItem('zelo_cart', JSON.stringify(cart)); updateCartBadge(); }
  function updateCartBadge() {
    const badge = document.getElementById('zelo-cart-count');
    if (!badge) return;
    const count = getCart().reduce((s, i) => s + (i.qty || 1), 0);
    if (count > 0) { badge.textContent = count; badge.style.display = 'flex'; } else badge.style.display = 'none';
  }

  function closeCartDrawer() {
    const d = document.getElementById('zelo-cart-drawer');
    if (d) d.classList.remove('open');
  }

  function openCartDrawer() {
    const cart = getCart();
    const itemsMount = document.getElementById('zelo-cart-drawer-items');
    const subtotalMount = document.getElementById('zelo-cart-drawer-subtotal');
    if (!itemsMount || !subtotalMount) return;
    if (!cart.length) {
      itemsMount.innerHTML = `<p style="font-size:13px;color:var(--ink-soft)">Your cart is empty.</p>`;
      subtotalMount.textContent = 'Rs 0';
    } else {
      itemsMount.innerHTML = cart.map(i => `
        <div class="flex gap-md" style="align-items:flex-start">
          <img src="${i.img || i.image || ''}" style="width:56px;height:70px;object-fit:cover;border:1px solid var(--line);flex-shrink:0">
          <div style="flex:1;min-width:0">
            <div style="font-size:12.5px;font-weight:600;color:var(--black);line-height:1.4">${i.name}</div>
            <div class="order-ref">${i.size ? 'Size ' + i.size + ' · ' : ''}Qty ${i.qty || 1}</div>
            <div class="price" style="font-size:13px;margin-top:2px">Rs ${(i.price * (i.qty || 1)).toLocaleString()}</div>
          </div>
        </div>`).join('');
      const subtotal = cart.reduce((s, i) => s + i.price * (i.qty || 1), 0);
      subtotalMount.textContent = 'Rs ' + subtotal.toLocaleString();
    }
    const d = document.getElementById('zelo-cart-drawer');
    if (d) d.classList.add('open');
    if (cart.length) ecommerce.viewCart(cart);
  }

  /* ---- Buyer session (from /api/signup or /api/login) ---- */
  function getUser() { try { return JSON.parse(localStorage.getItem('zelo_user') || 'null'); } catch (e) { return null; } }
  function setUser(u) { localStorage.setItem('zelo_user', JSON.stringify(u)); }
  function clearUser() { localStorage.removeItem('zelo_user'); }

  /* ---- Admin key (stored locally only, sent as X-Admin-Key header) ---- */
  function getAdminKey() { return sessionStorage.getItem('zelo_admin_key') || ''; }
  function setAdminKey(k) { sessionStorage.setItem('zelo_admin_key', k); }

  /* ---- API helpers ---- */
  async function apiGet(path) {
    const res = await fetch(API_BASE + path);
    if (!res.ok) throw new Error('API ' + path + ' -> ' + res.status);
    return res.json();
  }
  async function apiSend(path, method, body, admin) {
    const headers = { 'Content-Type': 'application/json' };
    if (admin) headers['X-Admin-Key'] = getAdminKey();
    const res = await fetch(API_BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || (method + ' ' + path + ' -> ' + res.status)), { data, status: res.status });
    return data;
  }

  const api = {
    products: () => apiGet('/api/products'),
    liveFeeds: () => apiGet('/api/live-feeds'),
    addProduct: (p) => apiSend('/api/products', 'POST', p, true),
    addLiveFeed: (f) => apiSend('/api/live-feeds', 'POST', f, true),
    importCsv: (csvText) => fetch(API_BASE + '/api/products/csv', { method: 'POST', headers: { 'Content-Type': 'text/csv', 'X-Admin-Key': getAdminKey() }, body: csvText }).then(async r => { const d = await r.json().catch(()=>({})); if (!r.ok) throw Object.assign(new Error(d.error||'CSV import failed'), { data: d }); return d; }),
    updateProduct: (id, patch) => apiSend('/api/products/' + id, 'PATCH', patch, true),
    deleteProduct: (id) => apiSend('/api/products/' + id, 'DELETE', null, true),
    contact: (payload) => apiSend('/api/contact', 'POST', payload, false),
    newsletter: (email) => apiSend('/api/newsletter', 'POST', { email }, false),
    signup: (payload) => apiSend('/api/signup', 'POST', payload, false),
    login: (payload) => apiSend('/api/login', 'POST', payload, false)
  };

  window.zeloNewsletterSubmit = function (e, form) {
    e.preventDefault();
    const email = form.querySelector('input[type=email]').value;
    api.newsletter(email)
      .then(() => { showToast('Subscribed', "You're on the list."); form.reset(); })
      .catch(() => { showToast('Subscribed', "You're on the list (offline preview — connect the API to persist this)."); form.reset(); });
    return false;
  };

  /* ---- Ecommerce tracking: fires BOTH GA4/GTM dataLayer events
     (standard Enhanced Ecommerce schema) AND RudderStack/Segment
     events from one call site, so every page only needs to call
     Zelo.ecommerce.* instead of hand-building two payloads. ---- */
  function toGA4Item(i) {
    return {
      item_id: i.id || i.product_id,
      item_name: i.name,
      price: i.price,
      quantity: i.qty || i.quantity || 1,
      item_variant: i.size || i.variant || undefined,
      item_category: i.category || undefined,
      item_brand: 'Zainab Export'
    };
  }
  function pushGA4(event, ecommerce) {
    if (!window.dataLayer) return;
    window.dataLayer.push({ ecommerce: null }); // clear previous ecommerce object per GA4 best practice
    window.dataLayer.push({ event, ecommerce });
  }
  function trackSegment(event, props) {
    if (window.ZeloAnalytics) ZeloAnalytics.track(event, props);
  }
  const ecommerce = {
    viewItemList: function (products, listId) {
      pushGA4('view_item_list', { item_list_id: listId, items: products.map(toGA4Item) });
      trackSegment('Product List Viewed', { list_id: listId, currency: 'PKR', products: products.map(p => ({ product_id: p.id, sku: p.sku || p.id, name: p.name, price: p.price, category: p.category })) });
    },
    selectItem: function (product, listId) {
      pushGA4('select_item', { item_list_id: listId, items: [toGA4Item(product)] });
      trackSegment('Product Clicked', { product_id: product.id, sku: product.sku || product.id, name: product.name, price: product.price, category: product.category, currency: 'PKR' });
    },
    viewItem: function (product) {
      pushGA4('view_item', { currency: 'PKR', value: product.price, items: [toGA4Item(product)] });
      trackSegment('Product Viewed', { product_id: product.id, sku: product.sku || product.id, name: product.name, price: product.price, category: product.category, brand: 'Zainab Export', currency: 'PKR' });
    },
    addToCart: function (item) {
      pushGA4('add_to_cart', { currency: 'PKR', value: item.price * (item.qty || 1), items: [toGA4Item(item)] });
      trackSegment('Product Added', { product_id: item.id, sku: item.sku || item.id, name: item.name, price: item.price, quantity: item.qty || 1, variant: item.size, currency: 'PKR' });
    },
    removeFromCart: function (item) {
      pushGA4('remove_from_cart', { currency: 'PKR', value: item.price * (item.qty || 1), items: [toGA4Item(item)] });
      trackSegment('Product Removed', { product_id: item.id, sku: item.sku || item.id, name: item.name, price: item.price, quantity: item.qty || 1, variant: item.size, currency: 'PKR' });
    },
    viewCart: function (cart) {
      if (!cart.length) return;
      const value = cart.reduce((s, i) => s + i.price * i.qty, 0);
      pushGA4('view_cart', { currency: 'PKR', value, items: cart.map(toGA4Item) });
      trackSegment('Cart Viewed', { cart_id: 'zelo_cart', currency: 'PKR', products: cart.map(i => ({ product_id: i.id, name: i.name, price: i.price, quantity: i.qty, variant: i.size })) });
    },
    beginCheckout: function (cart) {
      if (!cart.length) return;
      const value = cart.reduce((s, i) => s + i.price * i.qty, 0);
      pushGA4('begin_checkout', { currency: 'PKR', value, items: cart.map(toGA4Item) });
      trackSegment('Checkout Started', { revenue: value, currency: 'PKR', products: cart.map(i => ({ product_id: i.id, name: i.name, price: i.price, quantity: i.qty, variant: i.size })) });
    },
    addShippingInfo: function (cart, shippingTier) {
      const value = cart.reduce((s, i) => s + i.price * i.qty, 0);
      pushGA4('add_shipping_info', { currency: 'PKR', value, shipping_tier: shippingTier, items: cart.map(toGA4Item) });
      trackSegment('Shipping Info Entered', { shipping_method: shippingTier, currency: 'PKR', revenue: value });
    },
    addPaymentInfo: function (cart, paymentType) {
      const value = cart.reduce((s, i) => s + i.price * i.qty, 0);
      pushGA4('add_payment_info', { currency: 'PKR', value, payment_type: paymentType, items: cart.map(toGA4Item) });
      trackSegment('Payment Info Entered', { payment_method: paymentType, currency: 'PKR', revenue: value });
    },
    purchase: function (order) {
      pushGA4('purchase', {
        transaction_id: order.ref, currency: 'PKR', value: order.total,
        shipping: order.shipping || 0, items: order.cart.map(toGA4Item)
      });
      trackSegment('Order Completed', {
        order_id: order.ref, revenue: order.total, shipping: order.shipping || 0, currency: 'PKR',
        products: order.cart.map(i => ({ product_id: i.id, name: i.name, price: i.price, quantity: i.qty, variant: i.size }))
      });
    }
  };

  window.Zelo = { showToast, getCart, setCart, updateCartBadge, openCartDrawer, closeCartDrawer, getUser, setUser, clearUser, getAdminKey, setAdminKey, api, ecommerce };

  document.addEventListener('DOMContentLoaded', injectChrome);
})();
