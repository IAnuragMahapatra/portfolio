// Blueprint Mode — hold spacebar to reveal the design system

const initBlueprint = () => {
  // Disable the blueprint overlay on blog pages for clean reading
  if (document.querySelector('.post-article')) return;

  // ── State ──
  let isActive = false;
  let isLocked = false;
  let isSpaceDown = false;

  // ── Configuration ──
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

  const TYPO_TAGS = new Set(['H1','H2','H3','H4','H5','H6','P','BUTTON','A']);

  // ── Helpers ──
  const shortFont = (f) => f.split(',')[0].replace(/['"]/g, '').trim();
  const r = (v) => Math.round(parseFloat(v));

  const hintEl = document.getElementById('tracker-hint');
  const setHint = (text) => { if (hintEl) hintEl.textContent = text; };

  // ── Element filtering ──
  // Pure check — returns true if this element should receive a label.
  const shouldAnnotate = (el) => {
    if (SKIP_TAGS.has(el.tagName)) return false;
    if (SKIP_CLOSEST.some(sel => el.closest(sel))) return false;
    if (SKIP_CLASSES.some(sel => el.matches && el.matches(sel))) return false;
    if (el.classList.contains('bp-label') || el.classList.contains('bp-spacing')) return false;

    // Ignore leaf elements with very short text (arrows, bullets, etc.)
    const hasDirectText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 0);
    if (hasDirectText && el.children.length === 0 && el.textContent.trim().length <= 3) return false;

    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') return false;
    if (s.display === 'inline' && el.tagName !== 'BUTTON') return false;

    // Skip very small structural elements
    const rect = el.getBoundingClientRect();
    if (rect.width < 50 || rect.height < 15) return false;

    return true;
  };

  // ── Element description ──
  // Pure builder — returns a label string or empty.
  const describeElement = (el) => {
    const parts = [];
    const s = getComputedStyle(el);
    const tag = el.tagName;

    // Skip dates and purely numeric values
    const text = el.textContent.trim();
    const hasDirectText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 0);
    if (hasDirectText && /^[\d\.\-\/]+$/.test(text)) return '';

    if (TYPO_TAGS.has(tag) || (el.classList && el.classList.contains('stack-items'))) {
      let lh = s.lineHeight;
      if (lh !== 'normal') lh = Math.round(parseFloat(lh)) + 'px';
      parts.push(shortFont(s.fontFamily) + ' ' + Math.round(parseFloat(s.fontSize)) + 'px / ' + lh);
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

  // ── Single-element annotation ──
  // Creates the label DOM node, handles clip-path host relocation and
  // overflow correction. The seenKeys set tracks duplicate siblings.
  const annotateElement = (el, seenKeys) => {
    // Deduplicate siblings sharing the same class combination
    if (el.parentElement && el.classList.length > 0) {
      try {
        const classes = [...el.classList].map(c => CSS.escape(c)).join('.');
        const siblings = el.parentElement.querySelectorAll(':scope > .' + classes);
        if (siblings.length > 1) {
          const key = el.parentElement.tagName + '-' + classes;
          if (seenKeys.has(key)) return;
          seenKeys.add(key);
        }
      } catch (e) { }
    }

    const desc = describeElement(el);
    if (!desc) return;

    // Move label to the parent container if clip-path hides this element
    let labelHost = el;
    const cp = getComputedStyle(el).clipPath;
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

    // Relocate label if it overflows the right edge of the viewport
    const rect = label.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      const overflow = rect.right - window.innerWidth + 8;
      label.style.transform = 'translateX(-' + overflow + 'px)';
    }
  };

  // ── Section-level annotations ──
  // Adds spacing rulers and the hero wrapper box.
  const annotateSections = () => {
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
        ruler.textContent = '\u2195 ' + Math.round(pt) + 'px';
        section.appendChild(ruler);
      }
    });

    // Hero wrapper gets a special dashed outline + label
    const heroWrapper = document.querySelector('.hero-title-wrapper');
    const heroTop = document.querySelector('.hero-title-top');
    const heroBottom = document.querySelector('.hero-title-bottom');
    if (heroWrapper && heroTop && heroBottom) {
      heroWrapper.style.position = 'relative';

      const wrapperBox = document.createElement('div');
      wrapperBox.className = 'bp-hero-wrapper-box bp-hero-box';
      wrapperBox.style.cssText =
        'position:absolute;top:0;bottom:0;left:0;right:0;' +
        'border:1px dashed var(--bp-color, oklch(60% 0.12 250));' +
        'pointer-events:none;z-index:54;';
      heroWrapper.appendChild(wrapperBox);

      const wrapperLabel = document.createElement('div');
      wrapperLabel.className = 'bp-label';
      wrapperLabel.textContent = describeElement(heroTop) || 'vivid';
      wrapperBox.appendChild(wrapperLabel);
    }
  };

  // ── Create / remove all annotations ──
  const createAnnotations = () => {
    removeAnnotations();

    const seenKeys = new Set();
    document.querySelectorAll('section, section *').forEach(el => {
      if (shouldAnnotate(el)) annotateElement(el, seenKeys);
    });

    annotateSections();
  };

  const removeAnnotations = () => {
    document.querySelectorAll('.bp-label, .bp-spacing, .bp-hero-box').forEach(el => el.remove());
    document.querySelectorAll('[data-bp-was-static]').forEach(el => {
      el.style.position = '';
      delete el.dataset.bpWasStatic;
    });
  };

  // ── Shared deactivation ──
  const deactivate = () => {
    isActive = false;
    document.body.classList.remove('is-blueprint');
    removeAnnotations();
    setHint('HOLD SPACE');
  };

  // ── Keyboard handling ──
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
      if (isActive) {
        isLocked = !isLocked;
        if (!isLocked && !isSpaceDown) {
          deactivate();
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

    if (isActive && !isLocked) deactivate();
  }, { passive: false });

  window.addEventListener('blur', () => {
    isSpaceDown = false;
    if (isActive && !isLocked) deactivate();
  });
};
