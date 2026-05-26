// Global configuration
window.CONFIG = {
  // Change this to 'https://cdn.ianurag.site/data/' when deploying the CDN
  // If null, scripts will fall back to their local relative paths ('data/...' or '../data/...')
  DATA_BASE_URL: null
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


// Toggling spacebar activates a blueprint view displaying element sizes and styles
const initBlueprint = () => {
  // Disable the blueprint overlay on blog pages for clean reading
  if (document.querySelector('.post-article')) return;

  let isActive = false;
  let isLocked = false;
  let isSpaceDown = false;

  const SKIP_TAGS = new Set([
    'SCRIPT', 'STYLE', 'LINK', 'META', 'BR', 'SVG', 'PATH', 'FILTER',
    'FETURBULENCE', 'FEDISPLACEMENTMAP', 'HEAD', 'HTML', 'TITLE',
    'NAV', 'FOOTER'
  ]);

  const SKIP_CLOSEST = ['.cursor', '.section-tracker', '.bg-grid', '.nav', '.footer'];
  const SKIP_CLASSES = [
    '.proj-tag', '.proj-num', '.stack-label', '.stack-num', '.page-hero__index',
    '.proj-stack', '.proj-stack li', '.proj-stack span', '.project-meta', '.project-links',
    '.project-num', '.project-tag', '.arrow', '.hero-title'
  ];

  const shortFont = (f) => f.split(',')[0].replace(/['"]/g, '').trim();
  const r = (v) => Math.round(parseFloat(v));

  const TYPO_TAGS = new Set(['H1','H2','H3','H4','H5','H6','P','BUTTON','A']);
  const CONTAINER_TAGS = new Set(['SECTION','DIV','MAIN','HEADER','ARTICLE']);



  const describeElement = (el) => {
    const parts = [];
    const s = getComputedStyle(el);
    const tag = el.tagName;

    const text = el.textContent.trim();
    const hasDirectText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 0);

    // Do not process dates and purely numeric values
    if (hasDirectText && /^[\d\.\-\/]+$/.test(text)) {
      return '';
    }

    if (TYPO_TAGS.has(tag) || (el.classList && el.classList.contains('stack-items'))) {
      const font = s.fontFamily;
      let lh = s.lineHeight;
      if (lh !== 'normal') {
        lh = Math.round(parseFloat(lh)) + 'px';
      }
      parts.push(`${shortFont(font)} ${Math.round(parseFloat(s.fontSize))}px / ${lh}`);
    }

    const classStr = el.className;
    if (typeof classStr === 'string') {
      if (classStr.includes('vivid')) parts.push('vivid');
      else if (classStr.includes('accent')) parts.push('accent');
      else if (classStr.includes('muted')) parts.push('muted');
    }

    if (parts.length === 0) return '';
    return parts.join(' \u00b7 ');
  };

  // Only label the first sibling when multiple siblings share the same class
  const seenClasses = new Set();

  const shouldAnnotate = (el) => {
    if (SKIP_TAGS.has(el.tagName)) return false;
    if (SKIP_CLOSEST.some(sel => el.closest(sel))) return false;
    if (SKIP_CLASSES.some(sel => el.matches && el.matches(sel))) return false;
    if (el.classList.contains('bp-label') || el.classList.contains('bp-spacing')) return false;

    // Ignore elements containing very short text
    const hasDirectText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 0);
    if (hasDirectText && el.children.length === 0 && el.textContent.trim().length <= 3) {
      return false;
    }

    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') return false;

    // Ignore inline elements that are not buttons
    if (s.display === 'inline' && el.tagName !== 'BUTTON') return false;

    // Skip very small structural elements
    const rect = el.getBoundingClientRect();
    if (rect.width < 50 || rect.height < 15) return false;
    if (el.parentElement && el.classList.length > 0) {
      try {
        const classes = [...el.classList].map(c => CSS.escape(c)).join('.');
        const siblings = el.parentElement.querySelectorAll(`:scope > .${classes}`);
        if (siblings.length > 1) {
          const key = `${el.parentElement.tagName}-${classes}`;
          if (seenClasses.has(key)) return false;
          seenClasses.add(key);
        }
      } catch (e) { }
    }

    return true;
  };

  const createAnnotations = () => {
    removeAnnotations();
    seenClasses.clear();

    const targets = document.querySelectorAll('section, section *');
    targets.forEach(el => {
      if (!shouldAnnotate(el)) return;

      const desc = describeElement(el);
      if (!desc) return;

      // Move label to the parent container if clip-path hides this element
      const s = getComputedStyle(el);
      let labelHost = el;
      const cp = s.clipPath;
      if (cp && cp !== 'none') {
        labelHost = el.parentElement || el;
      }

      const hostStyle = getComputedStyle(labelHost);
      if (hostStyle.position === 'static') {
        labelHost.style.position = 'relative';
        labelHost.dataset.bpWasStatic = 'true';
      }

      if (labelHost.querySelector(':scope > .bp-label')) return;

      const label = document.createElement('div');
      label.className = 'bp-label';
      label.textContent = desc;
      labelHost.appendChild(label);

      // Relocate the label if it overflows the right edge of the window
      const rect = label.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        const overflow = rect.right - window.innerWidth + 8; // 8px buffer
        label.style.transform = `translateX(-${overflow}px)`;
      }
    });

    document.querySelectorAll('section').forEach(section => {
      if (section.closest('.nav') || section.closest('.footer')) return;
      const cs = getComputedStyle(section);
      if (cs.position === 'static') {
        section.style.position = 'relative';
        section.dataset.bpWasStatic = 'true';
      }
      const pt = parseFloat(cs.paddingTop);
      if (pt > 32) {
        const ruler = document.createElement('div');
        ruler.className = 'bp-spacing';
        ruler.textContent = `↕ ${Math.round(pt)}px`;
        section.appendChild(ruler);
      }
    });

    // Custom clipping paths require separate containers for hero titles
    const heroWrapper = document.querySelector('.hero-title-wrapper');
    const heroTop = document.querySelector('.hero-title-top');
    const heroBottom = document.querySelector('.hero-title-bottom');
    if (heroWrapper && heroTop && heroBottom) {
      heroWrapper.style.position = 'relative';

      // Create a wrapper container to show the outline on hover
      const wrapperBox = document.createElement('div');
      wrapperBox.className = 'bp-hero-wrapper-box bp-hero-box';
      wrapperBox.style.cssText = `
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        border: 1px dashed var(--bp-color, oklch(60% 0.12 250));
        pointer-events: none;
        z-index: 54;
      `;
      heroWrapper.appendChild(wrapperBox);

      const wrapperLabel = document.createElement('div');
      wrapperLabel.className = 'bp-label';
      wrapperLabel.textContent = describeElement(heroTop) || 'vivid';
      wrapperBox.appendChild(wrapperLabel);

      const wrapperRect = heroWrapper.getBoundingClientRect();

      // Use the custom container box and ignore the inner title tags
    }
  };

  const removeAnnotations = () => {
    document.querySelectorAll('.bp-label, .bp-spacing, .bp-hero-box').forEach(el => el.remove());
    document.querySelectorAll('[data-bp-was-static]').forEach(el => {
      el.style.position = '';
      delete el.dataset.bpWasStatic;
    });
  };


  const hintEl = document.getElementById('tracker-hint');
  const setHint = (text) => { if (hintEl) hintEl.textContent = text; };

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
      if (isActive) {
        isLocked = !isLocked;
        if (!isLocked && !isSpaceDown) {
          isActive = false;
          document.body.classList.remove('is-blueprint');
          removeAnnotations();
          setHint('HOLD SPACE');
        } else if (isLocked) {
          setHint('SPACE TO UNLOCK');
        }
      }
      return;
    }

    if (e.code !== 'Space') return;
    isSpaceDown = true;
    if (e.repeat) { e.preventDefault(); return; }
    if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
    e.preventDefault();
    e.stopPropagation();


    if (!isActive) {
      isActive = true;
      document.body.classList.add('is-blueprint');
      createAnnotations();
      setHint('ESC TO LOCK');
    } else if (isLocked) {
      isLocked = false;
      setHint('ESC TO LOCK');
    }
  }, { passive: false });

  window.addEventListener('keyup', (e) => {
    if (e.code !== 'Space') return;
    isSpaceDown = false;
    e.preventDefault();

    if (isActive && !isLocked) {
      isActive = false;
      document.body.classList.remove('is-blueprint');
      removeAnnotations();
      setHint('HOLD SPACE');
    }
  }, { passive: false });

  window.addEventListener('blur', () => {
    isSpaceDown = false;
    if (isActive && !isLocked) {
      isActive = false;
      document.body.classList.remove('is-blueprint');
      removeAnnotations();
      setHint('HOLD SPACE');
    }
  });
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
  initBlueprint();
  initEasterEggs();

  // We do not call scrollToHash on the home page yet.
  // The home script runs it after loading the work and skill data.
  // This ensures the layout is fully settled before calculating scroll positions.
  // We can call it immediately for static pages like work, blog or posts.
  if (!document.getElementById('workAccordion')) {
    window.scrollToHash();
  }
});
