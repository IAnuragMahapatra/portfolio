
(function () {
  'use strict';

  function init() {

    const progressBar = document.getElementById('readProgressBar');
    const sidebarFill = document.getElementById('sidebarProgressFill');
    const sidebarPct = document.getElementById('sidebarPct');
    const article = document.getElementById('postArticle');

    function updateProgress() {
      if (!article || !progressBar) return;
      const rect = article.getBoundingClientRect();
      const total = article.offsetHeight - window.innerHeight;
      const scrolled = Math.max(0, -rect.top);
      const pct = Math.min(100, (scrolled / total) * 100);
      const pctStr = pct.toFixed(0) + '%';

      progressBar.style.width = pctStr;
      if (sidebarFill) sidebarFill.style.width = pctStr;
      if (sidebarPct) sidebarPct.textContent = pctStr;
    }

    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();

    const headings = document.querySelectorAll('.post-h2[id]');
    const tocLinks = document.querySelectorAll('.toc__link');

    const tocObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const link = document.querySelector(`.toc__link[href="#${entry.target.id}"]`);
        if (!link) return;
        if (entry.isIntersecting) {
          tocLinks.forEach(l => l.classList.remove('is-active'));
          link.classList.add('is-active');
        }
      });
    }, {
      rootMargin: '-80px 0px -60% 0px',
      threshold: 0,
    });

    headings.forEach(h => tocObserver.observe(h));

    const readTimeEl = document.getElementById('readTimeEl');
    if (readTimeEl && article) {
      const words = article.innerText.trim().split(/\s+/).length;
      const mins = Math.max(1, Math.round(words / 200));
      readTimeEl.textContent = `${mins} MIN READ`;
    }

    const toast = document.getElementById('bmToast');
    let toastTimer;

    function showToast(msg, durationMs = 2800) {
      if (!toast) return;
      toast.textContent = msg;
      toast.classList.add('is-visible');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.remove('is-visible'), durationMs);
    }

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const shortcut = isMac ? 'CMD+D' : 'CTRL+D';

    const bookmarkBtn = document.getElementById('bookmarkBtn');
    const bookmarkBtn2 = document.getElementById('bookmarkBtn2');

    [bookmarkBtn, bookmarkBtn2].forEach(btn => {
      if (!btn) return;
      btn.addEventListener('click', () => {
        showToast(`PRESS ${shortcut} TO BOOKMARK THIS PAGE`);
        
        // Visual feedback on button
        const label = btn.querySelector('.post-action-btn__label');
        const orig = label ? label.textContent : '';
        if (label) label.textContent = shortcut;
        btn.classList.add('is-active');
        
        setTimeout(() => {
          btn.classList.remove('is-active');
          if (label) label.textContent = orig;
        }, 2000);
      });
    });

    function copyLink(btn, labelId) {
      if (!btn) return;
      btn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          const label = labelId
            ? document.getElementById(labelId)
            : btn.querySelector('.post-action-btn__label');
          const orig = label ? label.textContent : '';
          if (label) label.textContent = 'COPIED!';
          btn.classList.add('is-active');
          setTimeout(() => {
            btn.classList.remove('is-active');
            if (label) label.textContent = orig;
          }, 2000);
          showToast('LINK COPIED TO CLIPBOARD ✓');
        } catch {
          showToast('COPY FAILED, PLEASE COPY FROM ADDRESS BAR');
        }
      });
    }

    copyLink(document.getElementById('copyLinkBtn'), 'copyLinkLabel');
    copyLink(document.getElementById('copyLinkBtn2'), null);

    // Native share API with fallback to clipboard

    const shareBtn = document.getElementById('shareBtn');
    if (shareBtn) {
      shareBtn.addEventListener('click', async () => {
        if (navigator.share) {
          try {
            await navigator.share({
              title: document.title,
              text: document.querySelector('meta[name="description"]')?.content || '',
              url: window.location.href,
            });
          } catch (err) {
            if (err.name !== 'AbortError') showToast('SHARE FAILED');
          }
        } else {
          try {
            await navigator.clipboard.writeText(window.location.href);
            showToast('LINK COPIED, SHARE AWAY!');
          } catch {
            showToast('PRESS CTRL+D TO BOOKMARK · COPY URL TO SHARE');
          }
        }
      });
    }

    document.querySelectorAll('.post-code-block__copy').forEach(btn => {
      btn.addEventListener('click', async () => {
        const code = btn.closest('.post-code-block').querySelector('pre code');
        if (!code) return;
        try {
          await navigator.clipboard.writeText(code.innerText);
          const orig = btn.textContent;
          btn.textContent = 'COPIED!';
          setTimeout(() => { btn.textContent = orig; }, 2000);
        } catch {
          btn.textContent = 'ERROR';
        }
      });
    });

    if (typeof gsap !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger);

      const heroTl = gsap.timeline({ delay: 0.4 });

      heroTl.fromTo('.post-hero__eyebrow',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }
      );

      const titleLines = document.querySelectorAll('[data-hero-word]');
      titleLines.forEach((line, i) => {
        heroTl.fromTo(line,
          { yPercent: 110, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: 0.9, ease: 'power4.out' },
          i === 0 ? '-=0.1' : '<0.1'
        );
      });

      heroTl
        .fromTo('.post-hero__sub',
          { opacity: 0, y: 15 },
          { opacity: 0.65, y: 0, duration: 0.7, ease: 'power3.out' },
          '-=0.3'
        )
        .fromTo('.post-actions',
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' },
          '-=0.3'
        );

      const coverImg = document.getElementById('postCoverImg');
      if (coverImg) {
        gsap.to(coverImg, {
          yPercent: 20,
          ease: 'none',
          scrollTrigger: {
            trigger: '.post-hero',
            start: 'top top',
            end: 'bottom top',
            scrub: true,
          }
        });
      }

      gsap.fromTo('.nav > *',
        { y: -15, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.07, ease: 'power3.out', delay: 0.3 }
      );

      gsap.fromTo('.post-sidebar',
        { opacity: 0, x: -20 },
        {
          opacity: 1, x: 0, duration: 0.8, ease: 'power3.out',
          scrollTrigger: {
            trigger: '.post-layout',
            start: 'top 80%',
          }
        }
      );

      gsap.utils.toArray('.post-article > p, .post-h2, .post-callout, .post-quote, .post-code-block, .post-stats-grid').forEach(el => {
        gsap.fromTo(el,
          { opacity: 0, y: 25 },
          {
            opacity: 1, y: 0,
            duration: 0.7,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: el,
              start: 'top 90%',
              toggleActions: 'play none none none',
            }
          }
        );
      });

      gsap.utils.toArray('.post-stat').forEach((stat, i) => {
        gsap.fromTo(stat,
          { opacity: 0, y: 30 },
          {
            opacity: 1, y: 0,
            duration: 0.6,
            delay: i * 0.1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: stat,
              start: 'top 90%',
            }
          }
        );
      });

      document.querySelectorAll('.post-nav__item').forEach(item => {
        const title = item.querySelector('.post-nav__title');
        item.addEventListener('mouseenter', () => {
          gsap.to(title, { x: item.classList.contains('is-reversed') ? -6 : 6, duration: 0.3, ease: 'power2.out' });
        });
        item.addEventListener('mouseleave', () => {
          gsap.to(title, { x: 0, duration: 0.3, ease: 'power2.out' });
        });
      });
    }

    if (window.revealPage) window.revealPage();
  }

  window.__postInit = init;

  window.reinitPage = function() {
    init();
  };

})();
