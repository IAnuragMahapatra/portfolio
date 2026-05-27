// hold space to inspect layout specs
const initBlueprint = () => {
  let isActive = false;
  let isLocked = false;
  let isSpaceDown = false;

  const SKIP_TAGS = new Set([
    'SCRIPT', 'STYLE', 'BR', 'SVG', 'PATH',
    'FILTER', 'FETURBULENCE', 'FEDISPLACEMENTMAP'
  ]);

  const SKIP_CLASSES = [
    '.proj-tag', '.proj-num', '.stack-label', '.stack-num', '.page-hero__index',
    '.proj-stack', '.project-meta', '.project-links',
    '.project-num', '.project-tag', '.arrow', '.hero-title'
  ];

  const TYPO_TAGS = new Set(['H1','H2','H3','H4','H5','H6','P','BUTTON','A']);

  const shortFont = (f) => f.split(',')[0].replace(/['"]/g, '').trim();

  const hintEl = document.getElementById('tracker-hint');
  const setHint = (text) => { if (hintEl) hintEl.textContent = text; };

  const hasDirectText = (el) =>
    [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 0);

  const shouldAnnotate = (el) => {
    if (SKIP_TAGS.has(el.tagName)) return false;
    if (SKIP_CLASSES.some(sel => el.matches && el.matches(sel))) return false;
    if (el.classList.contains('bp-label') || el.classList.contains('bp-spacing')) return false;

    if (hasDirectText(el) && el.children.length === 0 && el.textContent.trim().length <= 3) return false;

    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') return false;
    if (s.display === 'inline' && el.tagName !== 'BUTTON') return false;

    const rect = el.getBoundingClientRect();
    if (rect.width < 50 || rect.height < 15) return false;

    return true;
  };

  const describeElement = (el) => {
    const parts = [];
    const s = getComputedStyle(el);

    if (hasDirectText(el) && /^[\d\.\-\/]+$/.test(el.textContent.trim())) return '';

    if (TYPO_TAGS.has(el.tagName) || (el.classList && (el.classList.contains('stack-items') || el.classList.contains('writing-read') || el.classList.contains('hero-title-core')))) {
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

  const annotateElement = (el) => {
    // Label first sibling only
    if (el.parentElement && el.classList.length > 0) {
      try {
        const classes = [...el.classList].map(c => CSS.escape(c)).join('.');
        const siblings = el.parentElement.querySelectorAll(':scope > .' + classes);
        if (siblings.length > 1 && siblings[0] !== el) {
          return;
        }
      } catch (e) { }
    }

    const desc = describeElement(el);
    if (!desc) return;

    // Use parent for label if child has clip-path
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

    // Avoid right overflow
    const rect = label.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      const overflow = rect.right - window.innerWidth + 8;
      label.style.transform = 'translateX(-' + overflow + 'px)';
    }
  };

  const annotateSections = () => {
    document.querySelectorAll('section').forEach(section => {
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

    const heroWrapper = document.querySelector('.hero-title-wrapper');
    const heroTop = document.querySelector('.hero-title-top');
    if (heroWrapper && heroTop) {
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

  const createAnnotations = () => {
    removeAnnotations();

    document.querySelectorAll('section, section *').forEach(el => {
      if (shouldAnnotate(el)) annotateElement(el);
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

  const deactivate = () => {
    isActive = false;
    document.body.classList.remove('is-blueprint');
    removeAnnotations();
    setHint('HOLD SPACE');
  };

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
