if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister();
    }
  });
}

// ─── Data source ────────────────────────────────────────────────────────────
// All content (JSON, markdown, assets) is served from this CDN origin.
// To point at a different environment, change only this one constant.
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:';
const CDN_BASE_URL = isLocal 
  ? (window.location.pathname.includes('/pages/') ? '../data' : './data')
  : 'https://cdn.ianurag.site';

// Global config
window.CONFIG = {
  DATA_BASE_URL: CDN_BASE_URL,
  FETCH_TIMEOUT: 4000,
  MAX_RETRIES: 1
};

// Data fetcher with timeout and auto retries — always fetches from CDN_BASE_URL
window.fetchData = async function(path, type, isCritical) {
  if (type === undefined) type = 'json';
  if (isCritical === undefined) isCritical = true;

  if (!window.CONFIG.DATA_BASE_URL) {
    throw new Error('[fetchData] DATA_BASE_URL is not set.');
  }

  // sessionStorage cache for JSON — survives MPA navigations, clears on tab close
  var cacheKey = 'ssd_' + path;
  if (type === 'json') {
    try {
      var cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        var parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') return parsed;
        sessionStorage.removeItem(cacheKey); // bad data, purge it
      }
    } catch (e) {
      sessionStorage.removeItem(cacheKey); // corrupted or quota, purge it
    }
  }

  var finalUrl = window.CONFIG.DATA_BASE_URL.replace(/\/$/, '') + '/' + path.replace(/^\//, '');
  var retries = window.CONFIG.MAX_RETRIES;

  while (retries >= 0) {
    try {
      var controller = new AbortController();
      var timeoutId = setTimeout(function() { controller.abort(); }, window.CONFIG.FETCH_TIMEOUT);

      var response = await fetch(finalUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('HTTP ' + response.status + ': ' + response.statusText);
      }

      var result = type === 'json' ? await response.json() : await response.text();

      // Cache JSON responses in sessionStorage
      if (type === 'json' && result) {
        try { sessionStorage.setItem(cacheKey, JSON.stringify(result)); } catch (e) { /* quota exceeded — skip */ }
      }

      return result;
    } catch (error) {
      retries--;
      if (retries < 0) {
        if (isCritical) {
          console.error('[fetchData] Critical fetch failed for ' + finalUrl + ':', error);
          var isRoot = window.location.pathname === '/' || window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('404.html');
          window.location.href = (isRoot ? '' : '../') + '404.html';
        } else {
          console.warn('[fetchData] Non-critical fetch failed for ' + finalUrl + ':', error);
          throw error;
        }
      } else {
        await new Promise(function(r) { setTimeout(r, 500); });
      }
    }
  }
};

// Render error boundary for non-critical failures
window.renderErrorBoundary = function(selector, message = "Content temporarily unavailable.") {
  const container = document.querySelector(selector);
  if (container) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-boundary';
    errorDiv.style.cssText = 'width: 100%; grid-column: 1 / -1; padding: 2rem; border: 1px dashed var(--color-surface-muted); color: var(--color-on-surface); font-family: var(--font-mono); font-size: var(--text-sm); text-align: center; opacity: 0.6;';
    errorDiv.textContent = message;
    container.innerHTML = '';
    container.appendChild(errorDiv);
  }
};

if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

gsap.registerPlugin(ScrollTrigger);



const initEntrance = () => {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('x') || !params.has('y')) return;

  const x = parseFloat(params.get('x'));
  const y = parseFloat(params.get('y'));

  const maxRadius = Math.max(
    Math.hypot(x, y),
    Math.hypot(window.innerWidth - x, y),
    Math.hypot(x, window.innerHeight - y),
    Math.hypot(window.innerWidth - x, window.innerHeight - y)
  ) + 100;

  let overlay = document.getElementById('btc-entrance-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'btc-entrance-overlay';
    document.body.appendChild(overlay);
  }

  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 99999;
    background: oklch(65% 0.16 250);
    mask-image: radial-gradient(circle at ${x}px ${y}px, transparent 0px, black 1px);
    -webkit-mask-image: radial-gradient(circle at ${x}px ${y}px, transparent 0px, black 1px);
    pointer-events: none;
  `;

  const proxy = { r: 0 };
  gsap.to(proxy, {
    r: maxRadius,
    duration: 1.2,
    ease: 'expo.inOut',
    onUpdate: () => {
      overlay.style.maskImage = `radial-gradient(circle at ${x}px ${y}px, transparent ${proxy.r}px, black ${proxy.r + 1}px)`;
      overlay.style.webkitMaskImage = `radial-gradient(circle at ${x}px ${y}px, transparent ${proxy.r}px, black ${proxy.r + 1}px)`;
    },
    onComplete: () => {
      overlay.remove();
      const newUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, '', newUrl);
    }
  });
};

const esc = (str) => {
  const d = document.createElement('div');
  d.textContent = String(str);
  return d.innerHTML;
};

const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  orientation: 'vertical',
  gestureOrientation: 'vertical',
  smoothWheel: true,
  wheelMultiplier: 1,
  touchMultiplier: 2,
});

lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0, 0);

document.body.addEventListener('click', function (e) {


  const anchor = e.target.closest('a[href^="#"]');
  if (!anchor) return;
  const href = anchor.getAttribute('href');
  if (!href || !/^#[a-zA-Z][\w-]*$/.test(href)) return;

  const target = document.getElementById(href.slice(1));
  if (target) {
    e.preventDefault();
    const navH = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--nav-height')
    ) || 78;
    const offset = target.id === 'contact' ? 0 : -navH;
    lenis.scrollTo(target, { offset: offset });
  }
});

const cursor = document.querySelector('.cursor');
let xSetCursor, ySetCursor;
if (cursor) {
  gsap.set(cursor, { xPercent: -50, yPercent: -50, opacity: 0 });

  xSetCursor = gsap.quickTo(cursor, "x", { duration: 0.08, ease: "power3" });
  ySetCursor = gsap.quickTo(cursor, "y", { duration: 0.08, ease: "power3" });

  function trackCursor(e) {
    xSetCursor(e.clientX);
    ySetCursor(e.clientY);
  }

  window.addEventListener('pointermove', function initCursor(e) {
    gsap.set(cursor, { x: e.clientX, y: e.clientY, opacity: 1 });
    window.addEventListener('pointermove', trackCursor);
  }, { once: true });
}

const depthMask = document.querySelector('.depth-mask');

window.addEventListener('mousemove', (e) => {
  const x = e.clientX;
  const y = e.clientY;

  document.documentElement.style.setProperty('--mouse-x', `${x}px`);
  document.documentElement.style.setProperty('--mouse-y', `${y}px`);

  if (depthMask) {
    const rect = depthMask.parentElement.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      gsap.to(depthMask, {
        clipPath: `circle(120px at ${relX}px ${relY}px)`,
        duration: 0.35,
        ease: "power2.out",
        overwrite: true,
      });
    }
  }
});

document.addEventListener('mouseover', (e) => {
  const target = e.target.closest('a, button, [data-cursor]');
  if (!cursor || !target) return;

  const cursorType = target.getAttribute('data-cursor');
  if (cursorType === 'expand' || target.tagName === 'A' || target.tagName === 'BUTTON') {
    cursor.classList.add('is-expanded');
  }
  if (cursorType === 'accent') {
    cursor.classList.add('is-accent');
  }
});

document.addEventListener('mouseout', (e) => {
  const target = e.target.closest('a, button, [data-cursor]');
  if (!cursor || !target) return;

  const cursorType = target.getAttribute('data-cursor');
  if (cursorType === 'expand' || target.tagName === 'A' || target.tagName === 'BUTTON') {
    cursor.classList.remove('is-expanded');
  }
  if (cursorType === 'accent') {
    cursor.classList.remove('is-accent');
  }
});

document.addEventListener('mouseleave', () => {
  if (cursor) gsap.to(cursor, { opacity: 0, duration: 0.2, overwrite: "auto" });
});

document.addEventListener('mouseenter', () => {
  if (cursor) gsap.to(cursor, { opacity: 1, duration: 0.2, overwrite: "auto" });
});

// Section tracker updates
const trackerSection = document.querySelector('.tracker-section');
const trackerIndex = document.querySelector('.tracker-index');
const trackerEl = document.querySelector('.section-tracker');
const sections = document.querySelectorAll('[data-section]');
const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');

function updateActiveState(section) {
  if (trackerSection && trackerIndex) {
    trackerSection.textContent = section.dataset.section;
    trackerIndex.textContent = section.dataset.index;
  }
  const id = section.getAttribute('id');
  if (id) {
    navLinks.forEach(l => l.classList.remove('nav-link--active'));
    const activeLink = document.querySelector(`.nav-links a[href="#${id}"]`);
    if (activeLink) activeLink.classList.add('nav-link--active');
  }
}

sections.forEach((section, index) => {
  ScrollTrigger.create({
    trigger: section,
    start: "top center",
    end: "bottom center",
    onEnter: () => updateActiveState(section),
    onEnterBack: () => updateActiveState(section),
    onLeaveBack: () => {
      if (index > 0) {
        updateActiveState(sections.item(index - 1));
      }
    }
  });
});

// Section tracker updates


const initTime = () => {
  const el = document.getElementById('local-time');
  if (!el) return;
  const tick = () => {
    el.textContent = new Date().toLocaleTimeString('en-US', { hour12: false });
  };
  tick();
  setInterval(tick, 1000);
};


const initPageHero = () => {
  const hero = document.querySelector('.page-hero');
  if (!hero) return;

  const tl = gsap.timeline({ delay: 0.4 });

  tl.fromTo('.page-hero__index',
    { opacity: 0, x: -20 },
    { opacity: 0.5, x: 0, duration: 0.6, ease: "power3.out" }
  )
    .fromTo('.page-hero__line',
      { scaleX: 0 },
      { scaleX: 1, duration: 0.8, ease: "power3.inOut" },
      "<0.1"
    )
    .fromTo('.page-hero__label',
      { opacity: 0, x: 20 },
      { opacity: 0.5, x: 0, duration: 0.6, ease: "power3.out" },
      "<0.3"
    );

  const words = hero.querySelectorAll('[data-hero-word]');
  words.forEach((word, i) => {
    tl.fromTo(word,
      { yPercent: 110, opacity: 0 },
      { yPercent: 0, opacity: 1, duration: 1, ease: "power4.out" },
      i === 0 ? "-=0.2" : "<0.08"
    );
  });

  const accent = hero.querySelector('[data-hero-accent]');
  if (accent) {
    tl.fromTo(accent,
      { opacity: 0, rotate: -45, scale: 0.5 },
      { opacity: 1, rotate: 0, scale: 1, duration: 0.6, ease: "back.out(1.7)" },
      "<0.2"
    );
  }

  tl.fromTo('.page-hero__sub',
    { opacity: 0, y: 15 },
    { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" },
    "-=0.3"
  );

  gsap.fromTo('.nav > *',
    { y: -15, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.8, stagger: 0.08, ease: "power3.out", delay: 0.3 }
  );

  const outlineWord = hero.querySelector('.page-hero__title-word--outline');
  if (outlineWord) {
    outlineWord.style.cursor = 'pointer';
    outlineWord.setAttribute('data-cursor', 'expand');
    outlineWord.addEventListener('click', () => {
      const isBlogPage = window.location.pathname.includes('blog.html') || document.querySelector('.blog');
      const navHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 78;
      const offset = isBlogPage ? navHeight : 0;
      lenis.scrollTo(window.innerHeight - offset, { duration: 1.2, ease: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    });
  }
};


window.scrollToHash = () => {
  const pendingHash = window.location.hash;
  if (pendingHash && /^#[a-zA-Z][\w-]*$/.test(pendingHash)) {
    const target = document.getElementById(pendingHash.slice(1));
    if (target) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          ScrollTrigger.refresh();
          lenis.resize();
          // Get nav height from CSS variable
          const navHeight = parseInt(
            getComputedStyle(document.documentElement).getPropertyValue('--nav-height')
          ) || 78;
          const offset = target.id === 'contact' ? 0 : -navHeight;
          lenis.scrollTo(target, { offset: offset, immediate: true });
        });
      });
    }
  }
};

const initEasterEggs = () => {
  // welcome back notification
  const now = Date.now();
  const lastVisit = localStorage.getItem('last_visit');
  if (lastVisit) {
    const gap = now - parseInt(lastVisit, 10);
    const oneDay = 24 * 60 * 60 * 1000;
    if (gap > oneDay) {
      const thirtyDays = 30 * oneDay;
      let msg = "";
      if (gap > thirtyDays) {
        msg = "welcome back; it's been a while. glad you're here again.";
      } else {
        const d = Math.floor(gap / oneDay);
        const h = Math.floor((gap % oneDay) / (60 * 60 * 1000));
        const m = Math.floor((gap % (60 * 60 * 1000)) / (60 * 1000));
        const s = Math.floor((gap % (60 * 1000)) / 1000);
        msg = `welcome back; it's been ${d} days, ${h} hours, ${m} minutes and ${s} seconds`;
      }

      const notif = document.createElement('div');
      notif.textContent = msg;
      notif.style.cssText = `
        position: fixed;
        bottom: var(--space-md);
        left: 50%;
        transform: translateX(-50%);
        font-family: var(--font-mono);
        font-size: var(--text-xs);
        color: var(--color-primary);
        opacity: 0;
        z-index: 9999;
        pointer-events: none;
        white-space: nowrap;
      `;
      document.body.appendChild(notif);

      gsap.to(notif, {
        opacity: 0.4,
        duration: 0.4,
        ease: "power2.out",
        onComplete: () => {
          gsap.to(notif, {
            opacity: 0,
            duration: 0.6,
            delay: 10,
            ease: "power2.in",
            onComplete: () => notif.remove()
          });
        }
      });
    }
  }
  localStorage.setItem('last_visit', now.toString());

  // console greeting
  console.log(
    "%chey, dev\n\nglad you looked under the hood.\n\n→ hold [space] anywhere to enter Blueprint Mode\n→ explore section 6 on the home page to find Behind the Code\n→ got feedback or thoughts on the site? feel free to drop a mail\n→ if you’d like to work together, please reach out through the contact section\n\nhope you have an amazing day.\n— Anurag Mahapatra\n",
    "color: oklch(65% 0.16 250); font-size: 14px; line-height: 1.8;"
  );
  console.log(
    "%cthanks for visiting",
    "color: #888888; font-size: 11px; font-family: monospace;"
  );
};

// Generic function to remove the FOUC mask after GSAP initializes
window.revealPage = () => {
  if (document.documentElement.classList.contains('js-loading')) {
    // Small delay to ensure GSAP has painted its initial frame
    requestAnimationFrame(() => {
      gsap.to(document.body, {
        opacity: 1,
        duration: 0.5,
        ease: 'power2.out',
        onComplete: () => {
          document.documentElement.classList.remove('js-loading');
          // Clear GSAP inline styles for opacity to prevent layout issues later
          gsap.set(document.body, { clearProps: 'opacity' });
        }
      });
    });
  }
};

const initContactForm = () => {
  const trigger = document.querySelector('.closing-initiate');
  const form = document.getElementById('contactForm');
  const defaultLayer = document.querySelector('.closing-default');
  const formLayer = document.querySelector('.closing-form-layer');
  const closeBtn = document.querySelector('.contact-close');
  
  if (!trigger || !form || !defaultLayer || !formLayer) return;

  const handleInput = document.getElementById('contactHandle');
  const channelInput = document.getElementById('contactChannelInput');
  const replyToInput = document.getElementById('contactReplyTo');
  const msgInput = document.getElementById('contactMsg');
  const errorMsg = document.getElementById('contactError');
  const submitBtn = form.querySelector('[type="submit"]');
  const formElements = form.querySelectorAll('.contact-channels, .contact-field, .contact-submit-huge');

  const channelConfig = {
    email: { placeholder: 'name@example.com' },
    linkedin: { placeholder: 'linkedin.com/in/...' },
    x: { placeholder: '@handle' },
    instagram: { placeholder: '@handle' },
    other: { placeholder: 'your handle or link' }
  };

  let isOpen = false;

  const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out', duration: 0.5 } });
  
  tl.to(defaultLayer, { opacity: 0, y: -20, pointerEvents: 'none' }, 0)
    .set(formLayer, { visibility: 'visible', pointerEvents: 'auto' }, 0)
    .fromTo(formLayer, 
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0 }, 
      0.1
    );

  trigger.addEventListener('click', (e) => {
    e.preventDefault();
    if (!isOpen) {
      tl.play();
      isOpen = true;
    }
  });

  closeBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (isOpen) {
      tl.reverse();
      isOpen = false;
    }
  });

  const pills = form.querySelectorAll('.contact-pill');
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('is-active'));
      pill.classList.add('is-active');
      const channel = pill.dataset.channel;
      channelInput.value = channel;
      handleInput.placeholder = channelConfig[channel].placeholder;
      handleInput.disabled = false;
      handleInput.focus();
      errorMsg.style.opacity = '0';
    });
  });

  // Default to email
  const emailPill = form.querySelector('[data-channel="email"]');
  if (emailPill) {
    emailPill.classList.add('is-active');
    channelInput.value = 'email';
    handleInput.placeholder = channelConfig['email'].placeholder;
    handleInput.disabled = false;
  }

  // Allow native scrolling inside the textarea without Lenis intercepting
  msgInput.setAttribute('data-lenis-prevent', 'true');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.style.opacity = '0';

    const channel = channelInput.value;
    const handle = handleInput.value.trim();
    const message = msgInput.value.trim();

    if (!channel) {
      errorMsg.textContent = 'PLEASE SELECT A CHANNEL';
      errorMsg.style.opacity = '1';
      return;
    }
    if (!handle) {
      errorMsg.textContent = 'PLEASE PROVIDE YOUR HANDLE OR EMAIL';
      errorMsg.style.opacity = '1';
      return;
    }
    if (!message) {
      errorMsg.textContent = 'PLEASE WRITE A MESSAGE';
      errorMsg.style.opacity = '1';
      return;
    }

    if (channel === 'email') {
      replyToInput.value = handle;
    }

    submitBtn.classList.add('is-sending');
    submitBtn.innerHTML = 'SENDING...';

    try {
      const response = await fetch(form.action, {
        method: form.method,
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        tl.reverse().then(() => {
          form.reset();
          pills.forEach(p => p.classList.remove('is-active'));
          if (emailPill) {
            emailPill.classList.add('is-active');
            channelInput.value = 'email';
            handleInput.placeholder = channelConfig['email'].placeholder;
          }
          isOpen = false;
          window.showToast?.('message sent.');
        });
      } else {
        throw new Error('Network response was not ok');
      }
    } catch (err) {
      errorMsg.textContent = 'FAILED TO SEND. PLEASE TRY AGAIN.';
      errorMsg.style.opacity = '1';
    } finally {
      submitBtn.classList.remove('is-sending');
      submitBtn.innerHTML = 'SEND';
    }
  });
};

document.addEventListener('DOMContentLoaded', () => {
  window.scrollTo(0, 0);
  lenis.scrollTo(0, { immediate: true });
  initEntrance();
  initPageHero();
  initTime();
  if (typeof initBlueprint === 'function') initBlueprint();
  initEasterEggs();
  initContactForm();

  // Wire resume download link from CDN_BASE_URL — change CDN_BASE_URL once, all pages update
  const resumeLink = document.getElementById('nav-resume-link');
  if (resumeLink) {
    resumeLink.href = window.CONFIG.DATA_BASE_URL.replace(/\/$/, '') + '/anurag_mahapatra_cv_2026.pdf';
  }

  // Home page runs this after loading data, but static pages can run immediately
  if (!document.getElementById('workAccordion')) {
    window.scrollToHash();
  }

  // Hover-intent prefetch — front-load HTML + JSON on navigation hover
  var prefetched = new Set();
  var prefetchTimer;

  document.addEventListener('mouseover', function(e) {
    var a = e.target.closest('a[href]');
    if (!a) return;

    clearTimeout(prefetchTimer);
    prefetchTimer = setTimeout(function() {
      var href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('http') || prefetched.has(href)) return;
      prefetched.add(href);

      // Prefetch the HTML page
      var link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = href;
      document.head.appendChild(link);

      // Also prefetch the corresponding data JSON if we can infer it
      var dataMap = new Map([
        ['work.html', 'works.json'],
        ['pages/work.html', 'works.json'],
        ['blog.html', 'posts.json'],
        ['pages/blog.html', 'posts.json']
      ]);
      var strippedHref = href.replace('../', '').replace('./', '');
      var jsonFile = dataMap.get(href) || dataMap.get(strippedHref);
      if (jsonFile && !prefetched.has(jsonFile)) {
        prefetched.add(jsonFile);
        var dataLink = document.createElement('link');
        dataLink.rel = 'prefetch';
        dataLink.href = window.CONFIG.DATA_BASE_URL.replace(/\/$/, '') + '/' + jsonFile;
        document.head.appendChild(dataLink);
      }
    }, 120); // 120ms debounce filters noise without losing benefit
  });
});

// Unified bfcache handler — one place to restore page state on back/forward
window.addEventListener('pageshow', function(e) {
  // Clean up any exit overlays regardless of bfcache
  var exitOverlays = document.querySelectorAll('.is-exit-overlay');
  if (exitOverlays.length > 0) {
    exitOverlays.forEach(function(el) { el.remove(); });
    gsap.set('main, .nav, .bg-grid, .section-tracker', { clearProps: 'all' });
  }

  if (!e.persisted) return;

  // Clean entrance overlays too
  document.querySelectorAll('#btc-entrance-overlay, .btc-transition-overlay')
    .forEach(function(el) { el.remove(); });

  // Reset visual state
  gsap.set('main, .nav, .bg-grid, .section-tracker', { clearProps: 'all' });
  document.documentElement.classList.remove('js-loading');

  // Revert all stale ScrollTriggers instead of killing them to strip GSAP inline styles
  ScrollTrigger.getAll().forEach(function(st) { st.revert(); });

  // Re-initialize page-specific animations and reset scroll immediately
  // (history.scrollRestoration = 'manual' prevents native scroll jumps)
  window.scrollTo(0, 0);
  lenis.scrollTo(0, { immediate: true });
  lenis.start();
  
  if (typeof window.reinitPage === 'function') window.reinitPage();
  ScrollTrigger.refresh();
});
