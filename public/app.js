(() => {
  'use strict';

  const qaParams = new URLSearchParams(window.location.search);
  const localQa = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches || (localQa && qaParams.get('qa-reduced-motion') === '1');

  const body = document.body;
  const hero = document.getElementById('hero');
  const heroCamera = document.getElementById('heroCamera');
  const heroReel = document.getElementById('heroReel');
  const loader = document.getElementById('loader');
  const loaderBar = document.getElementById('loaderBar');
  const loaderPercent = document.getElementById('loaderPercent');
  const siteHeader = document.getElementById('siteHeader');
  const scrollCue = document.getElementById('scrollCue');
  const menuToggle = document.getElementById('menuToggle');
  const mobileMenu = document.getElementById('mobileMenu');

  document.documentElement.classList.toggle('reduced-motion', reducedMotion);

  const state = { lenis: null, ready: false, handedOff: false };
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

  /* ---------- Loader ---------- */
  function setLoaderProgress(progress) {
    const safe = clamp(progress);
    if (loaderBar) loaderBar.style.transform = `scaleX(${safe})`;
    if (loaderPercent) loaderPercent.textContent = `${Math.round(safe * 100)}%`;
  }

  function unlockSite() {
    if (state.ready) return;
    state.ready = true;
    setLoaderProgress(1);
    body.classList.add('is-ready');
    window.setTimeout(() => loader && loader.classList.add('is-complete'), 260);
    initLenis();
    jumpToHash();
    handleScroll();
  }

  // Arriving from a service page on /#contact (or any /#section): the page is
  // locked behind the loader while it opens, so the browser's own anchor jump
  // is lost. Do it once the site is unlocked.
  function jumpToHash() {
    if (!location.hash || location.hash.length < 2) return;
    let target = null;
    try { target = document.querySelector(location.hash); } catch { return; }
    if (!target) return;
    window.requestAnimationFrame(() => {
      if (state.lenis) state.lenis.scrollTo(target, { immediate: true });
      else target.scrollIntoView();
    });
  }

  /* ---------- Hero: camera explode -> showreel ---------- */
  // Phones and data-saver / slow connections get the 720p files (~2 MB camera,
  // ~8 MB reel) instead of the 1080p ones.
  const connection = navigator.connection || {};
  const useSmallMedia = window.matchMedia('(max-width: 900px)').matches
    || connection.saveData === true
    || /2g|3g/.test(connection.effectiveType || '');

  // Local QA: ?qa-block-autoplay=1 refuses play() until the first tap, exactly
  // like iOS Low Power Mode / Android Data Saver.
  const qaBlockAutoplay = localQa && qaParams.get('qa-block-autoplay') === '1';
  let userGestured = false;
  let tapArmed = false;

  function pickSource(video) {
    if (!video) return;
    const src = useSmallMedia ? video.dataset.srcSmall : video.dataset.srcLarge;
    if (src && video.getAttribute('src') !== src) video.src = src;
  }

  function tryPlay(video) {
    if (qaBlockAutoplay && !userGestured) {
      return Promise.reject(new DOMException('Autoplay refused (QA)', 'NotAllowedError'));
    }
    try { return Promise.resolve(video.play()); } catch (error) { return Promise.reject(error); }
  }

  // When a phone refuses autoplay, the hero keeps showing the camera still and
  // playback starts on the visitor's first tap or key press (a real gesture is
  // what browsers require — scrolling doesn't count).
  function armTapToPlay() {
    if (tapArmed) return;
    tapArmed = true;
    const events = ['pointerdown', 'touchend', 'keydown'];
    const resume = () => {
      events.forEach((type) => window.removeEventListener(type, resume, true));
      tapArmed = false;
      userGestured = true;
      if (heroCamera && !heroCamera.ended && !hero.classList.contains('camera-failed')) {
        tryPlay(heroCamera).catch(() => {});
      } else {
        handOffToReel();
      }
    };
    events.forEach((type) => window.addEventListener(type, resume, { capture: true, passive: true }));
  }

  function handOffToReel() {
    if (state.handedOff || !heroReel) return;
    state.handedOff = true;
    heroReel.preload = 'auto';
    pickSource(heroReel);
    // Crossfade only once the reel is genuinely putting frames on screen. If it
    // can't play, the camera's last frame (or its poster) stays up — the hero
    // is never left black.
    heroReel.addEventListener('playing', () => hero.classList.add('is-reel'), { once: true });
    tryPlay(heroReel).catch(() => {
      state.handedOff = false;
      armTapToPlay();
    });
  }

  function initHero() {
    // Service pages have no video stage — just open the site.
    if (!hero) {
      unlockSite();
      return;
    }
    // Fade the copy in once the stage is up.
    window.requestAnimationFrame(() => hero.classList.add('is-live'));
    pickSource(heroCamera);

    if (reducedMotion || !heroCamera) {
      // No motion (or no camera clip): go straight to the looping reel.
      handOffToReel();
      unlockSite();
      return;
    }

    let progressTimer = 0;
    const startProgress = () => {
      let p = 0;
      progressTimer = window.setInterval(() => {
        p = Math.min(0.92, p + 0.08);
        setLoaderProgress(p);
      }, 90);
    };
    startProgress();

    const reveal = () => {
      window.clearInterval(progressTimer);
      unlockSite();
    };

    // When the camera clip can play, drop the loader and let it run.
    heroCamera.addEventListener('canplay', reveal, { once: true });
    heroCamera.addEventListener('loadeddata', reveal, { once: true });

    // When the explode finishes, crossfade to the showreel.
    heroCamera.addEventListener('ended', handOffToReel, { once: true });

    // Start buffering the reel while the camera plays so the handoff is seamless.
    heroCamera.addEventListener('playing', () => {
      heroReel.preload = 'auto';
      pickSource(heroReel);
    }, { once: true });

    // If the camera clip is missing or can't decode, go straight to the reel.
    heroCamera.addEventListener('error', () => {
      hero.classList.add('camera-failed');
      reveal();
      handOffToReel();
    }, { once: true });

    // Safety nets so the site never gets stuck behind the loader.
    window.setTimeout(reveal, 4000);
    window.setTimeout(() => { if (!state.handedOff && !tapArmed) handOffToReel(); }, 18000);

    tryPlay(heroCamera).catch((error) => {
      reveal();
      // NotSupportedError = this clip genuinely can't play here: use the reel.
      // Anything else is a refusal (NotAllowedError: Low Power Mode / Data
      // Saver) or an interruption (AbortError: the page loaded in a background
      // tab and Chrome paused silent video to save power). Neither means the
      // clip is broken — keep the camera still up and retry on a tap or as
      // soon as the page is actually on screen.
      if (error && error.name === 'NotSupportedError') handOffToReel();
      else armTapToPlay();
    });

    resumeWhenVisible();
  }

  // A page opened in a background tab has its first play() aborted. When the
  // visitor switches to it, pick up wherever the hero should be.
  function resumeWhenVisible() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) return;
      if (state.handedOff) {
        if (heroReel.paused) tryPlay(heroReel).catch(() => {});
      } else if (heroCamera.ended || hero.classList.contains('camera-failed')) {
        handOffToReel();
      } else if (heroCamera.paused) {
        tryPlay(heroCamera).catch(() => armTapToPlay());
      }
    });
  }

  /* ---------- Scroll chrome ----------
     The header stays in its white-on-dark style until the dark stage at the
     top of the page (home hero, or a service page's title stage) scrolls
     up under it. */
  const darkTop = document.querySelector('[data-dark-top]');

  function handleScroll() {
    const y = window.scrollY || document.documentElement.scrollTop;
    const threshold = darkTop
      ? darkTop.offsetHeight - (siteHeader ? siteHeader.offsetHeight : 0)
      : 0;
    const pastHero = y > threshold;
    if (siteHeader) siteHeader.classList.toggle('is-scrolled', pastHero);
    body.classList.toggle('is-past-hero', pastHero);
    if (scrollCue) scrollCue.classList.toggle('is-hidden', y > 30);
    updateFilmstrip();
  }

  function initLenis() {
    if (reducedMotion || state.lenis || typeof window.Lenis !== 'function') {
      window.addEventListener('scroll', handleScroll, { passive: true });
      return;
    }
    state.lenis = new window.Lenis({
      duration: 1.15,
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.05
    });
    state.lenis.on('scroll', handleScroll);
    const raf = (time) => {
      state.lenis.raf(time);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }

  /* ---------- Reveals ---------- */
  function initReveals() {
    const items = [...document.querySelectorAll('[data-reveal], [data-line-reveal]')];
    if (reducedMotion || !('IntersectionObserver' in window)) {
      items.forEach((item) => item.classList.add('is-visible'));
      return;
    }
    document.querySelectorAll('.mc-badges, .mc-about__cols').forEach((group) => {
      [...group.children].forEach((item, index) => {
        item.style.transitionDelay = `${Math.min(index * 70, 420)}ms`;
      });
    });
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });
    items.forEach((item) => observer.observe(item));
  }

  /* ---------- Lazy content media ---------- */
  function initLazyMedia() {
    const media = [...document.querySelectorAll('video[data-lazy-video], img[data-lazy-image]')];
    if (!media.length || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const element = entry.target;
        if (entry.isIntersecting) {
          if (!element.src && element.dataset.src) element.src = element.dataset.src;
          if (element.tagName === 'VIDEO') element.play().catch(() => {});
        } else if (element.tagName === 'VIDEO') {
          element.pause();
        }
      });
    }, { rootMargin: '350px 0px' });
    media.forEach((element) => observer.observe(element));
  }

  /* ---------- Navigation ---------- */
  function setMenu(open) {
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.querySelector('.sr-only').textContent = open ? 'Close menu' : 'Open menu';
    mobileMenu.classList.toggle('is-open', open);
    mobileMenu.setAttribute('aria-hidden', String(!open));
    if (state.lenis) open ? state.lenis.stop() : state.lenis.start();
    body.classList.toggle('menu-open', open);
    if (open) mobileMenu.querySelector('a')?.focus();
    else menuToggle.focus({ preventScroll: true });
  }

  function initNavigation() {
    menuToggle.addEventListener('click', () => setMenu(menuToggle.getAttribute('aria-expanded') !== 'true'));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') setMenu(false);
    });
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', (event) => {
        const target = document.querySelector(link.getAttribute('href'));
        if (!target) return;
        event.preventDefault();
        if (menuToggle.getAttribute('aria-expanded') === 'true') setMenu(false);
        if (state.lenis) state.lenis.scrollTo(target, { offset: 0, duration: 1.25 });
        else target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
      });
    });
  }

  /* ---------- Work: pinned horizontal filmstrip ----------
     Desktop only. The section is grown by the track's overflow, the inner
     pin is sticky, and vertical scroll progress slides the track sideways.
     Mobile and reduced motion keep the plain swipeable row from the CSS. */
  const film = {
    section: document.getElementById('work'),
    pin: document.querySelector('.mc-work__pin'),
    track: document.getElementById('filmTrack'),
    active: false,
    distance: 0
  };

  function measureFilmstrip() {
    const { section, pin, track } = film;
    if (!section || !pin || !track) return;
    film.active = !reducedMotion && window.matchMedia('(min-width: 768px)').matches;
    section.classList.toggle('is-pinned', film.active);
    if (!film.active) {
      section.style.height = '';
      track.style.transform = '';
      return;
    }
    film.distance = Math.max(0, track.scrollWidth - document.documentElement.clientWidth);
    section.style.height = `${pin.offsetHeight + film.distance}px`;
    updateFilmstrip();
  }

  function updateFilmstrip() {
    if (!film.active) return;
    const travel = film.section.offsetHeight - film.pin.offsetHeight;
    const progress = travel > 0 ? clamp(-film.section.getBoundingClientRect().top / travel) : 0;
    film.track.style.transform = `translate3d(${(-progress * film.distance).toFixed(1)}px, 0, 0)`;
  }

  function initFilmstrip() {
    measureFilmstrip();
    let resizeTimer = 0;
    window.addEventListener('resize', () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(measureFilmstrip, 150);
    });
    // Fonts change the frame widths once they arrive.
    document.fonts?.ready.then(measureFilmstrip);
  }

  /* ---------- Channel HUD ---------- */
  function initHud() {
    const no = document.getElementById('hudNo');
    const name = document.getElementById('hudName');
    const sections = [...document.querySelectorAll('[data-channel]')];
    if (!no || !name || !sections.length || !('IntersectionObserver' in window)) return;
    // A one-pixel line across the middle of the viewport: whichever section
    // crosses it is "on air". A ratio threshold would never fire for the
    // pinned work section, which is several screens tall.
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const [channel, label] = entry.target.dataset.channel.split('|');
        no.textContent = channel;
        name.textContent = label;
      });
    }, { rootMargin: '-50% 0px -50% 0px' });
    sections.forEach((section) => observer.observe(section));
  }

  /* ---------- REC cursor (fine pointers only) ---------- */
  function initCursor() {
    const dot = document.getElementById('mcCursor');
    const ring = document.getElementById('mcCursorRing');
    if (!dot || !ring || reducedMotion || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    let mx = -100, my = -100, rx = -100, ry = -100;
    // Park both off-screen so nothing sits in the corner before the first move.
    dot.style.transform = ring.style.transform = 'translate3d(-100px, -100px, 0)';
    document.documentElement.classList.add('has-mc-cursor');
    window.addEventListener('pointermove', (event) => {
      mx = event.clientX;
      my = event.clientY;
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`;
    }, { passive: true });
    const follow = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
      requestAnimationFrame(follow);
    };
    requestAnimationFrame(follow);
    const HOT = 'a, button, .mc-chip, .mc-frame, input, textarea, select';
    document.addEventListener('pointerover', (event) => { if (event.target.closest(HOT)) ring.classList.add('is-hot'); });
    document.addEventListener('pointerout', (event) => { if (event.target.closest(HOT)) ring.classList.remove('is-hot'); });
  }

  /* ---------- Service cards: gentle tilt + cursor spotlight ----------
     Writes --rx/--ry (tilt) and --mx/--my (spotlight position); the CSS does
     the rest. Mouse/trackpad only, and off entirely for reduced motion. */
  function initCardTilt() {
    if (reducedMotion || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    document.querySelectorAll('.mc-svc').forEach((card) => {
      card.addEventListener('pointermove', (event) => {
        const box = card.getBoundingClientRect();
        const x = (event.clientX - box.left) / box.width;
        const y = (event.clientY - box.top) / box.height;
        card.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
        card.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
        card.style.setProperty('--ry', `${((x - 0.5) * 5).toFixed(2)}deg`);
        card.style.setProperty('--rx', `${((0.5 - y) * 4).toFixed(2)}deg`);
      });
      card.addEventListener('pointerleave', () => {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* ---------- Contact: the call sheet ---------- */
  function initCallSheet() {
    const form = document.getElementById('callsheet');
    if (!form) return;
    const note = document.getElementById('csNote');
    const submit = form.querySelector('.mc-submit');
    const submitLabel = submit.querySelector('span');
    const required = [...form.querySelectorAll('[data-required]')];

    // Arriving from a service page (/?service=…&package=…#contact): tick the
    // matching service and note the package, so the visitor doesn't have to
    // repeat what they just chose.
    const params = new URLSearchParams(window.location.search);
    const wantedService = params.get('service');
    if (wantedService) {
      form.querySelectorAll('input[name="services"]').forEach((box) => {
        if (box.value === wantedService) box.checked = true;
      });
    }
    const wantedPackage = params.get('package');
    const message = form.querySelector('textarea[name="message"]');
    if (wantedPackage && message && !message.value) {
      message.value = `I'm interested in: ${wantedPackage.slice(0, 120)}\n\n`;
    }

    const check = (input) => {
      const value = input.value.trim();
      let message = '';
      if (!value) message = 'Required.';
      else if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) message = 'Enter a valid email address.';
      input.setAttribute('aria-invalid', String(Boolean(message)));
      const error = document.getElementById(input.getAttribute('aria-describedby'));
      if (error) error.textContent = message;
      return !message;
    };

    required.forEach((input) => {
      input.addEventListener('blur', () => check(input));
      input.addEventListener('input', () => { if (input.getAttribute('aria-invalid') === 'true') check(input); });
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      note.className = 'mc-note';
      note.textContent = '';
      if (!required.map(check).every(Boolean)) {
        note.classList.add('is-error');
        note.textContent = 'Please fill in the highlighted fields.';
        form.querySelector('[aria-invalid="true"]')?.focus();
        return;
      }

      const data = new FormData(form);
      const payload = Object.fromEntries(data.entries());
      payload.services = data.getAll('services');

      submit.disabled = true;
      submitLabel.textContent = 'Rolling…';
      try {
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.message || 'We could not send your call sheet right now.');
        note.classList.add('is-success');
        note.textContent = result.message || "Got it — we'll be in touch shortly.";
        form.reset();
        required.forEach((input) => input.removeAttribute('aria-invalid'));
      } catch (error) {
        note.classList.add('is-error');
        note.textContent = error.message || 'We could not send your call sheet right now. Please try again.';
      } finally {
        submit.disabled = false;
        submitLabel.textContent = 'Roll camera — send it';
      }
    });
  }

  /* ---------- Back to top ---------- */
  function initBackToTop() {
    document.getElementById('toTop')?.addEventListener('click', () => {
      if (state.lenis) state.lenis.scrollTo(0, { duration: 1.4 });
      else window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
    });
  }

  /* ---------- Boot ---------- */
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
  // Review notes (e.g. "proposed pricing") show on localhost only, never live.
  if (localQa) document.querySelectorAll('[data-local-only]').forEach((note) => { note.hidden = false; });
  initReveals();
  initLazyMedia();
  initNavigation();
  initFilmstrip();
  initHud();
  initCursor();
  initCardTilt();
  initCallSheet();
  initBackToTop();
  initHero();

  // Ultimate fallback: never leave the loader up.
  window.addEventListener('load', () => window.setTimeout(unlockSite, 500));
})();
