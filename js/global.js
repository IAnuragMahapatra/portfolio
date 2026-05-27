// Global configuration
window.CONFIG = {
  // Set to 'https://cdn.ianurag.site/data/' for production CDN
  // If null, scripts will fall back to their local relative paths
  DATA_BASE_URL: 'https://cdn.ianurag.site/data/',
  FETCH_TIMEOUT: 8000,
  MAX_RETRIES: 2
};

/**
 * Standardized data fetching utility with timeout and automatic retries.
 * @param {string} path - The relative path to the data file.
 * @param {string} type - 'json' or 'text'.
 * @param {boolean} isCritical - If true, failed fetches will redirect to 404.html.
 * @returns {Promise<any>}
 */
window.fetchData = async function(path, type = 'json', isCritical = true) {
  const baseUrl = window.CONFIG.DATA_BASE_URL;
  let finalUrl;

  if (baseUrl) {
    finalUrl = baseUrl.replace(/\/$/, '') + '/' + path.replace(/^\//, '');
  } else {
    const isRoot = window.location.pathname === '/' || window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('404.html');
    finalUrl = (isRoot ? 'data/' : '../data/') + path;
  }

  let retries = window.CONFIG.MAX_RETRIES;

  while (retries >= 0) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), window.CONFIG.FETCH_TIMEOUT);

      const response = await fetch(finalUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return type === 'json' ? await response.json() : await response.text();
    } catch (error) {
      retries--;
      if (retries < 0) {
        if (isCritical) {
          console.error(`[fetchData] Critical fetch failed for ${finalUrl}:`, error);
          const isRoot = window.location.pathname === '/' || window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('404.html');
          window.location.href = (isRoot ? '' : '../') + '404.html';
        } else {
          console.warn(`[fetchData] Non-critical fetch failed for ${finalUrl}:`, error);
          throw error;
        }
      } else {
        await new Promise(r => setTimeout(r, 500));
      }
    }
  }
};

/**
 * Renders an inline error boundary if a non-critical component fails to load.
 */
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

gsap.registerPlugin(ScrollTrigger);

// If the user navigates back or forward, the page loads from bfcache.
// This makes the GSAP and ScrollTrigger state outdated since animations get stuck.
// We must clear stale ScrollTriggers and reinitialize the scroll animations.
window.addEventListener('pageshow', (e) => {
  if (e.persisted) {
    // Clear old ScrollTrigger instances since hero and navigation elements are already visible
    ScrollTrigger.getAll().forEach(st => st.kill());

    window.scrollTo(0, 0);
    lenis.scrollTo(0, { immediate: true });
    requestAnimationFrame(() => {
      if (typeof initEthos === 'function') initEthos();
      if (typeof initClosing === 'function') initClosing();
      ScrollTrigger.refresh();
    });
  }
});

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

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    // Verify the selector format is valid to prevent errors
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
});

const cursor = document.querySelector('.cursor');
let xSetCursor, ySetCursor;
if (cursor) {
  gsap.set(cursor, { xPercent: -50, yPercent: -50 });
  xSetCursor = gsap.quickTo(cursor, "x", { duration: 0.08, ease: "power3" });
  ySetCursor = gsap.quickTo(cursor, "y", { duration: 0.08, ease: "power3" });
}

const depthMask = document.querySelector('.depth-mask');

window.addEventListener('mousemove', (e) => {
  const x = e.clientX;
  const y = e.clientY;

  if (xSetCursor && ySetCursor) {
    xSetCursor(x);
    ySetCursor(y);
  }

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

// Section tracker is placed under the footer using CSS properties


const initTime = () => {
  const el = document.getElementById('local-time');
  if (!el) return;
  const tick = () => {
    el.textContent = new Date().toLocaleTimeString('en-US', { hour12: false });
  };
  tick();
  setInterval(tick, 1000);
};


// Blueprint mode is defined in js/blueprint.js


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
          // Retrieve the navigation height from CSS variables
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
  // Easter Egg 1: Last Visited Notification
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

  // Easter Egg 2: Console Greeting
  console.log(
    "%chey, dev\n\nglad you looked under the hood.\n\n→ hold [space] anywhere to enter Blueprint Mode\n→ explore section 6 on the home page to find Behind the Code\n→ got feedback or thoughts on the site? feel free to drop a mail\n→ if you’d like to work together, please reach out through the contact section\n\nhope you have an amazing day.\n— Anurag Mahapatra\n",
    "color: oklch(65% 0.16 250); font-size: 14px; line-height: 1.8;"
  );
  console.log(
    "%cthanks for visiting",
    "color: #888888; font-size: 11px; font-family: monospace;"
  );
};

document.addEventListener('DOMContentLoaded', () => {
  window.scrollTo(0, 0);
  lenis.scrollTo(0, { immediate: true });
  initEntrance();
  initPageHero();
  initTime();
  if (typeof initBlueprint === 'function') initBlueprint();
  initEasterEggs();

  // We do not call scrollToHash on the home page yet.
  // The home script runs it after loading the work and skill data.
  // This ensures the layout is fully settled before calculating scroll positions.
  // We can call it immediately for static pages like work, blog or posts.
  if (!document.getElementById('workAccordion')) {
    window.scrollToHash();
  }
});
