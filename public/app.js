(() => {
  'use strict';

  const qaParams = new URLSearchParams(window.location.search);
  const localQa = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches || (localQa && qaParams.get('qa-reduced-motion') === '1');
  const body = document.body;
  const hero = document.getElementById('hero');
  const canvas = document.getElementById('heroCanvas');
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
  const loader = document.getElementById('loader');
  const loaderBar = document.getElementById('loaderBar');
  const loaderPercent = document.getElementById('loaderPercent');
  const fallbackVideo = document.getElementById('heroFallback');
  const heroStatic = document.getElementById('heroStatic');
  const siteHeader = document.getElementById('siteHeader');
  const scrollCue = document.getElementById('scrollCue');
  const menuToggle = document.getElementById('menuToggle');
  const mobileMenu = document.getElementById('mobileMenu');

  document.documentElement.classList.toggle('reduced-motion', reducedMotion);

  const state = {
    tier: null,
    blobs: [],
    bitmaps: new Map(),
    decoding: new Map(),
    frameCount: 0,
    targetFrame: 0,
    smoothFrame: 0,
    paintedFrame: -1,
    lastProgress: 0,
    resizeTimer: 0,
    lenis: null,
    ready: false,
    fallback: false,
    cacheLimit: 34
  };

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const smoothstep = (edge0, edge1, value) => {
    const x = clamp((value - edge0) / (edge1 - edge0));
    return x * x * (3 - 2 * x);
  };
  const frameUrl = (tier, number) => `/frames/${tier.path}/frame_${String(number).padStart(4, '0')}.${tier.extension}`;

  function supportsWebP() {
    const test = document.createElement('canvas');
    return test.toDataURL('image/webp').startsWith('data:image/webp');
  }

  function chooseTier() {
    const webp = supportsWebP();
    if (window.innerWidth < 768 && webp) {
      return { path: 'hero-sm', count: 125, extension: 'webp', nativeUpgrade: false };
    }
    if (!webp) {
      return { path: 'hero-jpg', count: 250, extension: 'jpg', nativeUpgrade: false };
    }
    return {
      path: 'hero',
      count: 250,
      extension: 'webp',
      nativeUpgrade: window.innerWidth >= 1280 && (window.devicePixelRatio || 1) >= 1.5
    };
  }

  async function fetchSequence(tier, onProgress = () => {}) {
    const blobs = new Array(tier.count);
    let cursor = 0;
    let completed = 0;
    let failed = 0;
    const workers = Math.min(10, tier.count);

    async function worker() {
      while (cursor < tier.count) {
        const index = cursor++;
        try {
          const response = await fetch(frameUrl(tier, index + 1), { cache: 'force-cache' });
          if (!response.ok) throw new Error(`Frame ${index + 1}: HTTP ${response.status}`);
          blobs[index] = await response.blob();
        } catch (error) {
          failed += 1;
          console.warn('[hero:preload]', error.message);
        } finally {
          completed += 1;
          onProgress(completed / tier.count);
        }
      }
    }

    await Promise.all(Array.from({ length: workers }, worker));
    if (failed > 0) throw new Error(`${failed} hero frame${failed === 1 ? '' : 's'} failed to load`);
    return blobs;
  }

  function setLoaderProgress(progress) {
    const safe = clamp(progress);
    const percent = Math.round(safe * 100);
    loaderBar.style.transform = `scaleX(${safe})`;
    loaderPercent.textContent = `${percent}%`;
  }

  function unlockSite() {
    if (state.ready) return;
    state.ready = true;
    setLoaderProgress(1);
    body.classList.add('is-ready');
    window.setTimeout(() => loader.classList.add('is-complete'), 260);
    initLenis();
    handleScroll();
  }

  function activateFallback(reason) {
    if (state.ready) return;
    console.warn('[hero:fallback]', reason);
    state.fallback = true;
    hero.classList.add('is-fallback');
    fallbackVideo.play().catch(() => {});
    unlockSite();
  }

  async function decodeBlob(blob) {
    try {
      return await createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'default' });
    } catch {
      return createImageBitmap(blob);
    }
  }

  function trimBitmapCache(protectedIndex) {
    if (state.bitmaps.size <= state.cacheLimit) return;
    const keys = [...state.bitmaps.keys()];
    for (const key of keys) {
      if (state.bitmaps.size <= state.cacheLimit) break;
      if (Math.abs(key - protectedIndex) <= 4) continue;
      state.bitmaps.get(key)?.close?.();
      state.bitmaps.delete(key);
    }
  }

  async function ensureBitmap(index) {
    if (state.bitmaps.has(index)) {
      const bitmap = state.bitmaps.get(index);
      state.bitmaps.delete(index);
      state.bitmaps.set(index, bitmap);
      return bitmap;
    }
    if (state.decoding.has(index)) return state.decoding.get(index);
    if (!state.blobs[index]) return null;

    const pending = decodeBlob(state.blobs[index])
      .then((bitmap) => {
        state.decoding.delete(index);
        state.bitmaps.set(index, bitmap);
        trimBitmapCache(index);
        return bitmap;
      })
      .catch((error) => {
        state.decoding.delete(index);
        console.warn(`[hero:decode:${index + 1}]`, error.message);
        return null;
      });
    state.decoding.set(index, pending);
    return pending;
  }

  function sizeCanvas() {
    const qaDpr = localQa ? Number.parseFloat(qaParams.get('qa-dpr')) : 0;
    const dpr = Math.min(qaDpr || window.devicePixelRatio || 1, 2);
    const cssWidth = window.innerWidth;
    const cssHeight = window.innerHeight;
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    state.paintedFrame = -1;
  }

  function drawBitmap(bitmap, index) {
    if (!bitmap || state.fallback) return;
    const scale = Math.max(canvas.width / bitmap.width, canvas.height / bitmap.height);
    const drawWidth = Math.round(bitmap.width * scale);
    const drawHeight = Math.round(bitmap.height * scale);
    const x = Math.round((canvas.width - drawWidth) / 2);
    const y = Math.round((canvas.height - drawHeight) / 2);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, x, y, drawWidth, drawHeight);
    state.paintedFrame = index;
  }

  async function paintFrame(index) {
    const requested = clamp(index, 0, state.frameCount - 1);
    const bitmap = await ensureBitmap(requested);
    if (!bitmap || state.fallback) return;
    if (requested === Math.round(state.smoothFrame) || state.paintedFrame < 0) {
      drawBitmap(bitmap, requested);
      [-2, -1, 1, 2].forEach((offset) => {
        const neighbor = requested + offset;
        if (neighbor >= 0 && neighbor < state.frameCount) ensureBitmap(neighbor);
      });
    }
  }

  function heroFrameLoop() {
    if (state.frameCount && !state.fallback) {
      const delta = state.targetFrame - state.smoothFrame;
      state.smoothFrame = Math.abs(delta) < .015 ? state.targetFrame : state.smoothFrame + delta * .14;
      const next = Math.round(state.smoothFrame);
      if (next !== state.paintedFrame && !state.decoding.has(next)) paintFrame(next);
    }
    requestAnimationFrame(heroFrameLoop);
  }

  function updateHeroProgress() {
    if (reducedMotion || !state.frameCount) return;
    const rect = hero.getBoundingClientRect();
    const travel = Math.max(1, hero.offsetHeight - window.innerHeight);
    const progress = clamp(-rect.top / travel);
    const sequenceProgress = progress <= .5 ? progress * 2 : (1 - progress) * 2;
    state.lastProgress = progress;
    state.targetFrame = sequenceProgress * (state.frameCount - 1);

    const introOpacity = 1 - smoothstep(.08, .3, progress);
    const resolveOpacity = smoothstep(.66, .9, progress);
    const intro = hero.querySelector('.hero__copy--intro');
    const resolve = hero.querySelector('.hero__copy--resolve');
    intro.style.opacity = String(introOpacity);
    intro.style.transform = `translateY(calc(-47% + ${progress * -10}px))`;
    resolve.style.opacity = String(resolveOpacity);
    resolve.style.transform = `translateY(${(1 - resolveOpacity) * 18}px)`;
  }

  function handleScroll() {
    const y = window.scrollY || document.documentElement.scrollTop;
    siteHeader.classList.toggle('is-scrolled', y > window.innerHeight * .72);
    scrollCue.classList.toggle('is-hidden', y > 30);
    updateHeroProgress();
  }

  function initLenis() {
    if (reducedMotion || state.lenis || typeof window.Lenis !== 'function') {
      window.addEventListener('scroll', handleScroll, { passive: true });
      return;
    }

    state.lenis = new window.Lenis({
      duration: 1.15,
      smoothWheel: true,
      wheelMultiplier: .9,
      touchMultiplier: 1.05
    });
    state.lenis.on('scroll', handleScroll);
    const raf = (time) => {
      state.lenis.raf(time);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }

  async function upgradeToNative() {
    const nativeTier = { path: 'hero-2x', count: 250, extension: 'webp' };
    try {
      const blobs = await fetchSequence(nativeTier);
      for (const bitmap of state.bitmaps.values()) bitmap.close?.();
      state.bitmaps.clear();
      state.decoding.clear();
      state.blobs = blobs;
      state.tier = nativeTier;
      state.frameCount = nativeTier.count;
      state.paintedFrame = -1;
      await paintFrame(Math.round(state.targetFrame));
      document.documentElement.dataset.heroTier = 'native';
    } catch (error) {
      console.warn('[hero:upgrade]', error.message);
    }
  }

  async function initHero() {
    sizeCanvas();
    requestAnimationFrame(heroFrameLoop);

    if (reducedMotion) {
      hero.classList.add('is-static');
      heroStatic.addEventListener('error', () => {
        heroStatic.src = '/frames/hero-jpg/frame_0001.jpg';
      }, { once: true });
      body.classList.add('is-ready');
      loader.classList.add('is-complete');
      initLenis();
      return;
    }

    if (localQa && qaParams.get('qa-force-fallback') === '1') {
      activateFallback('Local fallback-path verification');
      return;
    }

    const tier = chooseTier();
    state.tier = tier;
    state.frameCount = tier.count;
    document.documentElement.dataset.heroTier = tier.path;

    const preload = fetchSequence(tier, setLoaderProgress);
    const timeout = new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error('Frame preload exceeded 8 seconds')), 8000);
    });

    try {
      state.blobs = await Promise.race([preload, timeout]);
      const first = await ensureBitmap(0);
      if (!first) throw new Error('First hero frame could not be decoded');
      drawBitmap(first, 0);
      unlockSite();
      if (tier.nativeUpgrade) window.setTimeout(upgradeToNative, 500);
    } catch (error) {
      activateFallback(error.message);
    }
  }

  function initReveals() {
    const items = [...document.querySelectorAll('[data-reveal], [data-line-reveal]')];
    if (reducedMotion || !('IntersectionObserver' in window)) {
      items.forEach((item) => item.classList.add('is-visible'));
      return;
    }

    document.querySelectorAll('.positioning__lines, .audience__list, .repurpose__stream').forEach((group) => {
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
    }, { threshold: .16, rootMargin: '0px 0px -8% 0px' });
    items.forEach((item) => observer.observe(item));
  }

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
        const menuWasOpen = menuToggle.getAttribute('aria-expanded') === 'true';
        if (menuWasOpen) setMenu(false);
        if (state.lenis) state.lenis.scrollTo(target, { offset: 0, duration: 1.25 });
        else target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
      });
    });
  }

  function validateField(field) {
    const wrapper = field.closest('.field');
    const error = document.getElementById(`${field.id}Error`);
    let message = '';
    if (field.required && !field.value.trim()) message = 'This field is required.';
    if (field.type === 'email' && field.value && !field.validity.valid) message = 'Enter a valid email address.';
    wrapper?.classList.toggle('is-invalid', Boolean(message));
    field.setAttribute('aria-invalid', String(Boolean(message)));
    if (error) error.textContent = message;
    return !message;
  }

  function initContactForm() {
    const form = document.getElementById('contactForm');
    const status = document.getElementById('formStatus');
    const submit = form.querySelector('button[type="submit"]');
    const fields = [...form.querySelectorAll('input:not([name="website"]), select, textarea')];

    fields.forEach((field) => {
      field.addEventListener('blur', () => validateField(field));
      field.addEventListener('input', () => {
        if (field.getAttribute('aria-invalid') === 'true') validateField(field);
      });
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      status.className = 'form-status';
      status.textContent = '';
      const valid = fields.map(validateField).every(Boolean);
      if (!valid) {
        status.classList.add('is-error');
        status.textContent = 'Please check the highlighted fields.';
        form.querySelector('[aria-invalid="true"]')?.focus();
        return;
      }

      submit.disabled = true;
      submit.querySelector('span').textContent = 'Sending…';
      status.textContent = 'Sending your project note securely…';

      try {
        const payload = Object.fromEntries(new FormData(form).entries());
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.message || 'We could not send your message right now.');
        status.classList.add('is-success');
        status.textContent = result.message || 'Thanks. Your project note has been received.';
        form.reset();
        fields.forEach((field) => {
          field.removeAttribute('aria-invalid');
          field.closest('.field')?.classList.remove('is-invalid');
        });
      } catch (error) {
        status.classList.add('is-error');
        status.textContent = error.message || 'We could not send your message right now. Please try again.';
      } finally {
        submit.disabled = false;
        submit.querySelector('span').textContent = 'Send project note';
      }
    });
  }

  window.addEventListener('resize', () => {
    window.clearTimeout(state.resizeTimer);
    state.resizeTimer = window.setTimeout(() => {
      sizeCanvas();
      updateHeroProgress();
    }, 180);
  }, { passive: true });

  document.getElementById('year').textContent = new Date().getFullYear();
  initReveals();
  initLazyMedia();
  initNavigation();
  initContactForm();
  initHero();
})();
