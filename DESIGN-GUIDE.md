# Tifl Little Wear — Design Guide

This is the actual design system built into `styles.css` — updated for the
site's pivot to a live-sale marketplace, restyled after SSENSE's editorial,
minimal fashion-retail aesthetic. Everything below matches the live CSS
variables; nothing here is aspirational.

---

## 1. Brand direction

Stark, editorial, product-first. The previous playful blue/rounded system
is gone — this is now a marketplace, not a boutique storefront, and the
visual language follows SSENSE's lead: black and white do almost all the
work, typography carries the hierarchy instead of colour, corners are
sharp rather than rounded, and colour is spent only where it's functional
(the live badge, sale pricing) rather than decorative.

**One tension worth knowing:** the logo itself (`assets/logo.png`) is still
the original playful, rounded, sky-blue mark with the cloud mascot — it
wasn't redrawn as part of this re-theme. Everything *around* the logo
(nav, buttons, cards, type) is now stark and minimal, which puts a soft
mark inside a sharp frame. That's a deliberate scope decision, not an
oversight — redesigning the logo itself is a separate, bigger decision.
Flag it if it reads as inconsistent once you see it live.

---

## 2. Colour tokens

| Variable | Value | Use |
|---|---|---|
| `--bg` | `#FFFFFF` | Page background |
| `--bg-alt` | `#F5F5F5` | Card/section surfaces — neutral grey, no colour tint |
| `--bg-dark` | `#0A0A0A` | Contrast sections (near-black, not navy) |
| `--bg-dark-2` | `#000000` | Pure black, rarely used |
| `--ink` | `#0A0A0A` | Primary text |
| `--ink-soft` | `#6E6E6E` | Secondary/muted text |
| `--ink-on-dark` | `#FFFFFF` | Text on dark backgrounds |
| `--ink-on-dark-soft` | `#A0A0A0` | Muted text on dark backgrounds |
| `--primary` | `#0A0A0A` | **Black** — buttons, active states. SSENSE uses black CTAs, not a brand colour. |
| `--primary-dark` | `#000000` | Hover state for primary |
| `--primary-light` | `#F0F0F0` | Light grey chip/active-nav backgrounds |
| `--sale-red` | `#E10600` | Reserved strictly for sale pricing and the live badge — never decorative |
| `--line` | `#E5E5E5` | Borders, dividers on light backgrounds |
| `--line-dark` | `#2A2A2A` | Borders, dividers on dark backgrounds |

**Rule of thumb:** if you're reaching for a colour to make something feel
"branded," don't — use black, white, or grey, and let typography and
whitespace do that job instead. Colour is a functional signal (sale, live)
not a decorative one now.

---

## 3. Typography

```html
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
```

| Font | Role | Where |
|---|---|---|
| **Space Grotesk** (500–700) | Headings (`h1`–`h4`) | Techy, geometric grotesk — replaces the previous rounded Fredoka |
| **Inter** (400–700) | Body text, buttons, forms | Default `body` font |
| **IBM Plex Mono** (400–500) | Data & functional text | Prices, order numbers, product data — this one didn't change, it already fit |

**Uppercase + tracked labels are the signature SSENSE move** — applied to:
- Nav links (`nav.tabs a`)
- Buttons (`.btn`)
- Category chips (`.chip`)
- Eyebrow labels (`.eyebrow`, already existed, still correct)

Headline text (`h1`–`h4`) stays normal case — only navigation/label/button
text gets the uppercase treatment. Don't uppercase body copy or product
names.

---

## 4. Shape language

- **Sharp corners, not rounded.** `--radius` and `--radius-sm` are both
  `2px` now (previously `14px`/`999px` pills). Buttons are rectangular,
  not pills. This is the single biggest visual shift from the old system
  — if something still looks like a pill button, it's using an old
  hardcoded `border-radius:999px` that needs updating to `var(--radius)`.
- Card surfaces still use `--bg-alt` with a `1px solid var(--line)`
  border, not shadows — that part didn't change.
- `--maxw` widened slightly (`1180px` → `1280px`) — SSENSE-style grids run
  a little wider/denser than the old boutique layout.

---

## 5. Core components (reuse these classes)

- `.btn.btn-primary` / `.btn.btn-ghost` — now sharp-cornered, uppercase,
  tracked
- `.chip` — sharp, uppercase category filter pills (Shop page, homepage)
- `.eyebrow` — small mono label above a heading (unchanged)
- `.seam` — dashed stitch-line divider — kept as the one surviving motif
  tying back to the tailoring/stitching origin, even though the site is
  now marketplace-first
- `.p-card` / `.p-thumb` / `.p-info` — product card, used on Shop, the
  homepage's Featured grid, and related-products rails
- `.pd-accordion` / `.pd-feature-strip` — product detail page sections
  (Details / Materials & Care / Sizing)
- `.whatsapp-float` — floating WhatsApp button, present on every page

**Note:** the review-card/rating-summary/avatar CSS classes still exist in
`styles.css` but are unused — reviews were removed site-wide pending real
Google Reviews integration. Don't build new UI against those classes;
they're dead code kept only so re-adding reviews later doesn't require
rewriting the CSS.

---

## 6. Site structure (post-pivot)

The site was trimmed to a live-sale marketplace. Current pages:

```
index.html        — marketplace homepage (Featured grid, category chips, live-sale CTA)
shop.html          — full catalogue, category filters
product.html        — product detail
checkout.html        — standalone checkout (not a modal)
thank-you.html        — order confirmation
live-sell.html        — the live sale itself, one-tap buy
account.html        — signup/login, order history
admin.html        — product management (CSV/XML bulk import too)
contact.html
privacy-policy.html / cookie-policy.html
```

**Removed:** Measurements, Booking, Design Studio, Journal (blog), and the
booking-focused ad landing page — these belonged to the previous
made-to-measure boutique positioning and don't fit a live-sale
marketplace. The backend (`api/index.py`) still has the booking/
measurement endpoints; they're just unused now, left in place rather than
risk removing working code for no functional benefit.

---

## 7. Site-wide settings

At the top of `script.js`:
```js
const CONFIG = {
  phone: '+92 42 1234 5678',
  phoneHref: 'tel:+924212345678',
  whatsappNumber: '924212345678',
  email: 'studio@tiflwear.pk',
  address: 'Tifl Little Wear, MM Alam Road area, Gulberg III, Lahore, Pakistan.',
  hours: 'Open Tue–Sun, 11am – 8pm.',
  currency: 'PKR'
};
```
Change contact details here only.

---

## 8. What NOT to do

- Don't reach for colour to signal "brand" — black/white/grey only, colour
  is functional (sale, live) not decorative
- Don't use rounded/pill shapes — `var(--radius)` is `2px` now
- Don't introduce a second display font — Space Grotesk is the only
  headline font
- Don't uppercase body copy or product names — only nav/buttons/chips/labels
- Don't rebuild the reviews UI without checking in first — it's
  intentionally offline pending real Google Reviews, not a bug
- Don't add shadows to static cards — borders only
