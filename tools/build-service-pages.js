'use strict';

/**
 * Builds the four service detail pages from tools/service-pages.data.js into
 *   public/services/<slug>/index.html
 *
 *   npm run build:pages
 *
 * The output is committed, like the hero frames, so Hostinger never has to run
 * a build step. Re-run this after changing copy or prices in the data file.
 */

const fs = require('fs');
const path = require('path');
const services = require('./service-pages.data.js');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'public', 'services');
const SITE = 'https://moocowtv.com';

// Cache-busting versions: reuse whatever the home page currently links, so a
// stylesheet change only ever needs bumping in one place.
const home = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
const cssVersion = (home.match(/\/styles\.css\?v=([\w-]+)/) || [])[1] || '1';
const jsVersion = (home.match(/\/app\.js\?v=([\w-]+)/) || [])[1] || '1';

const esc = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const contactHref = (svc, tier) => {
  const params = new URLSearchParams({ service: svc.chip });
  if (tier) params.set('package', `${svc.plainName} — ${tier.name}`);
  return `/?${params.toString()}#contact`;
};

function header() {
  return `  <header class="site-header" id="siteHeader">
    <a class="wordmark" href="/" aria-label="MooCow Productions home">
      <img class="wordmark__logo" src="/brand/moocow-badge.webp" alt="" width="120" height="120">
      <span class="wordmark__name">MooCow<br>Productions</span>
    </a>
    <nav class="desktop-nav" aria-label="Primary navigation">
      <a href="/#work">Work</a>
      <a href="/#services">Services</a>
      <a href="/#about">About</a>
      <a href="/#contact">Contact</a>
      <a class="nav-cta" href="/#contact">Get in touch</a>
    </nav>
    <button class="menu-toggle" id="menuToggle" type="button" aria-expanded="false" aria-controls="mobileMenu">
      <span class="sr-only">Open menu</span><span></span><span></span>
    </button>
  </header>

  <div class="mobile-menu" id="mobileMenu" aria-hidden="true">
    <nav aria-label="Mobile navigation">
      <a href="/#work"><span>01</span>Work</a>
      <a href="/#services"><span>02</span>Services</a>
      <a href="/#about"><span>03</span>About</a>
      <a href="/#contact"><span>04</span>Contact</a>
    </nav>
    <p>Video production + visual content</p>
  </div>`;
}

function footer() {
  return `  <footer class="mc-footer">
    <div class="section-shell mc-footer__inner">
      <a class="wordmark" href="/" aria-label="MooCow Productions home">
        <img class="wordmark__logo" src="/brand/moocow-badge.webp" alt="" width="120" height="120" loading="lazy">
        <span class="wordmark__name">MooCow<br>Productions</span>
      </a>
      <p class="mc-footer__tag">Video production · Content creation · Social media management</p>
      <nav class="mc-footer__links" aria-label="Social links">
        <a href="https://facebook.com/MooCowTv" target="_blank" rel="noreferrer">Facebook</a>
        <a href="https://instagram.com/moocow_ontv" target="_blank" rel="noreferrer">Instagram</a>
        <a href="https://youtube.com/@MooCowTv" target="_blank" rel="noreferrer">YouTube</a>
      </nav>
      <p class="mc-footer__copy">© <span id="year"></span> MooCow Productions — All stories reserved.</p>
      <button class="mc-footer__top" id="toTop" type="button">Cut — back to top ↑</button>
    </div>
  </footer>

  <div class="mc-cursor" id="mcCursor" aria-hidden="true"><span class="mc-cursor__label">REC</span></div>
  <div class="mc-cursor-ring" id="mcCursorRing" aria-hidden="true"></div>
  <div class="mc-grain" aria-hidden="true"></div>`;
}

function tierCard(svc, tier) {
  const features = tier.features.map((f) => `            <li>${esc(f)}</li>`).join('\n');
  return `        <article class="sp-tier${tier.featured ? ' sp-tier--featured' : ''}" data-reveal>
          ${tier.featured ? '<p class="sp-tier__flag">Recommended</p>' : ''}
          <h3 class="sp-tier__name">${esc(tier.name)}</h3>
          <p class="sp-tier__blurb">${esc(tier.blurb)}</p>
          <p class="sp-tier__price">${tier.prefix ? `<small>${esc(tier.prefix)}</small>` : ''}<strong>${esc(tier.price)}</strong><span>${esc(tier.unit)}</span></p>
          <ul class="sp-tier__list">
${features}
          </ul>
          <a class="sp-tier__cta${tier.featured ? ' mc-submit' : ''}" href="${esc(contactHref(svc, tier))}">Choose ${esc(tier.name)} <i aria-hidden="true">→</i></a>
        </article>`;
}

/** Default "What we offer": one card per offering. */
function offersSection(svc) {
  return `    <section class="sp-offers" aria-labelledby="offersTitle">
      <div class="section-shell">
        <p class="mc-kicker" data-reveal>Services</p>
        <h2 class="mc-title sp-title" id="offersTitle" data-reveal>What we offer<em>.</em></h2>
        <div class="sp-offers__grid">
${svc.offers.map((o, i) => `          <article class="sp-offer" data-reveal>
            <span class="sp-offer__no">${String(i + 1).padStart(2, '0')}</span>
            <h3 class="sp-offer__title">${esc(o.title)}</h3>
            <p>${esc(o.text)}</p>
          </article>`).join('\n')}
        </div>
      </div>
    </section>
`;
}

/** Lanes: a service split into a few big categories, each with a checklist. */
function lanesSection(svc) {
  return `    <section class="sp-offers" aria-labelledby="offersTitle">
      <div class="section-shell">
        <p class="mc-kicker" data-reveal>Services</p>
        <h2 class="mc-title sp-title" id="offersTitle" data-reveal>What we make<em>.</em></h2>
        <div class="sp-lanes sp-lanes--${svc.lanes.length}">
${svc.lanes.map((lane, i) => `          <article class="sp-lane" data-reveal>
            <span class="sp-offer__no">${String(i + 1).padStart(2, '0')}</span>
            <h3 class="sp-lane__title">${esc(lane.title)}</h3>
            <p class="sp-lane__lead">${esc(lane.lead)}</p>
            <ul class="sp-lane__list">
${lane.items.map((item) => `              <li>${esc(item)}</li>`).join('\n')}
            </ul>
          </article>`).join('\n')}
        </div>
      </div>
    </section>
`;
}

/** "How we work": a before → after quote pair plus what we help decide. */
function approachSection(a) {
  return `    <section class="sp-approach" aria-labelledby="approachTitle">
      <div class="section-shell">
        <p class="mc-kicker" data-reveal>How we work</p>
        <h2 class="mc-title sp-title" id="approachTitle" data-reveal>${esc(a.title)}<em>.</em></h2>
        <p class="mc-sub sp-approach__intro" data-reveal>${esc(a.intro)}</p>
        <div class="sp-shift" data-reveal>
          <blockquote class="sp-shift__from"><span>Before</span><p>“${esc(a.from)}”</p></blockquote>
          <i class="sp-shift__arrow" aria-hidden="true">→</i>
          <blockquote class="sp-shift__to"><span>With MooCow</span><p>“${esc(a.to)}”</p></blockquote>
        </div>
        <h3 class="sp-extras__title" data-reveal>${esc(a.pointsTitle)}</h3>
        <ul class="sp-approach__points">
${a.points.map((p) => `          <li data-reveal>${esc(p)}</li>`).join('\n')}
        </ul>
      </div>
    </section>
`;
}

function page(svc) {
  const url = `${SITE}/services/${svc.slug}/`;
  const others = services.filter((s) => s.slug !== svc.slug);
  const [lead, ...rest] = svc.intro;
  // `showInvestment: false` in the data file drops the rate card AND the
  // "See investment" link that points at it.
  const hasInvestment = svc.showInvestment !== false && Array.isArray(svc.tiers) && svc.tiers.length > 0;

  const structured = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        name: svc.title,
        description: svc.description,
        url,
        provider: { '@type': 'LocalBusiness', '@id': `${SITE}/#business`, name: 'MooCow Productions' }
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: 'Services', item: `${SITE}/#services` },
          { '@type': 'ListItem', position: 3, name: svc.plainName, item: url }
        ]
      }
    ]
  };

  return `<!doctype html>
<!-- GENERATED by tools/build-service-pages.js from tools/service-pages.data.js.
     Edit the data file and run \`npm run build:pages\` — changes made here are overwritten. -->
<html lang="en" class="no-js">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#000000">
  <meta name="description" content="${esc(svc.description)}">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${esc(svc.title)} — MooCow Productions">
  <meta property="og:description" content="${esc(svc.description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${SITE}/frames/hero-jpg/frame_0001.jpg">
  <meta name="twitter:card" content="summary_large_image">
  <title>${esc(svc.title)} — MooCow Productions</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Montserrat:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css?v=${cssVersion}">
  <script>document.documentElement.classList.remove('no-js');document.documentElement.classList.add('js');</script>
  <script type="application/ld+json">${JSON.stringify(structured)}</script>
</head>
<body class="page-service">
  <a class="skip-link" href="#main">Skip to content</a>

${header()}

  <main id="main">
    <section class="sp-hero" data-dark-top aria-labelledby="spTitle">
      <div class="section-shell sp-hero__inner">
        <nav class="sp-crumbs" aria-label="Breadcrumb">
          <a href="/">Home</a><span aria-hidden="true">/</span><a href="/#services">Services</a><span aria-hidden="true">/</span><span aria-current="page">${esc(svc.plainName)}</span>
        </nav>
        <p class="sp-hero__no">${svc.no}</p>
        <h1 class="sp-hero__name" id="spTitle">${svc.name}</h1>
        <p class="sp-hero__headline">${esc(svc.headline)}</p>
        <div class="sp-hero__ctas">
          <a class="mc-submit" href="${esc(contactHref(svc))}">Start a project <i aria-hidden="true">→</i></a>${hasInvestment ? `
          <a class="sp-ghost" href="#investment">See investment <i aria-hidden="true">↓</i></a>` : ''}
        </div>
      </div>
    </section>

    <section class="sp-intro" aria-label="Overview">
      <div class="section-shell">
        <p class="mc-kicker" data-reveal>The work</p>
        <p class="sp-intro__lead" data-reveal>${esc(lead)}</p>
${rest.map((p) => `        <p class="sp-intro__body" data-reveal>${esc(p)}</p>`).join('\n')}
      </div>
    </section>

${svc.lanes ? lanesSection(svc) : offersSection(svc)}
${svc.approach ? approachSection(svc.approach) : ''}
    <section class="sp-why" aria-labelledby="whyTitle">
      <div class="section-shell">
        <p class="mc-kicker" data-reveal>Why it matters</p>
        <h2 class="mc-title sp-title" id="whyTitle" data-reveal>Why it matters<em>.</em></h2>
        <ol class="sp-why__list">
${svc.why.map((w) => `          <li data-reveal><strong>${esc(w.title)}</strong><span>${esc(w.text)}</span></li>`).join('\n')}
        </ol>
      </div>
    </section>

${hasInvestment ? `    <section class="sp-invest" id="investment" aria-labelledby="investTitle">
      <div class="section-shell">
        <p class="sp-draft" data-local-only hidden>Proposed pricing, drafted from 2026 market research. Local preview only. Review every figure before publishing.</p>
        <p class="mc-kicker" data-reveal>Investment</p>
        <h2 class="mc-title sp-title" id="investTitle" data-reveal>Investment<em>.</em></h2>
        <p class="mc-sub" data-reveal>Clear starting points. Every project gets a fixed written quote before anything is booked.</p>
        <div class="sp-tiers">
${svc.tiers.map((t) => tierCard(svc, t)).join('\n')}
        </div>
        <div class="sp-extras" data-reveal>
          <div>
            <h3 class="sp-extras__title">Add-ons</h3>
            <ul class="sp-addons">
${svc.addons.map((a) => `              <li><span>${esc(a.name)}</span><b>${esc(a.price)}</b></li>`).join('\n')}
            </ul>
          </div>
          <div>
            <h3 class="sp-extras__title">Good to know</h3>
            <ul class="sp-notes">
${svc.notes.map((n) => `              <li>${esc(n)}</li>`).join('\n')}
            </ul>
          </div>
        </div>
      </div>
    </section>

` : ''}    <section class="sp-cta" aria-labelledby="ctaTitle">
      <div class="section-shell sp-cta__inner">
        <h2 class="sp-cta__title" id="ctaTitle" data-reveal>Ready?<br>Action.</h2>
        <div data-reveal>
          <p>Tell us what you need to communicate, document, or put into motion. We'll start there.</p>
          <a class="sp-cta__btn" href="${esc(contactHref(svc))}">Fill out the call sheet <i aria-hidden="true">→</i></a>
        </div>
      </div>
    </section>

    <nav class="sp-more" aria-labelledby="moreTitle">
      <div class="section-shell">
        <p class="mc-kicker" id="moreTitle">More ways we help</p>
        <div class="sp-more__grid">
${others.map((o) => `          <a class="sp-more__link" href="/services/${o.slug}/"><span>${o.no}</span><strong>${o.name}</strong><i aria-hidden="true">→</i></a>`).join('\n')}
        </div>
      </div>
    </nav>
  </main>

${footer()}

  <script src="https://cdn.jsdelivr.net/npm/lenis@1.3.11/dist/lenis.min.js" defer></script>
  <script src="/app.js?v=${jsVersion}" defer></script>
</body>
</html>
`;
}

for (const svc of services) {
  const dir = path.join(OUT, svc.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), page(svc));
  console.log(`built /services/${svc.slug}/`);
}
