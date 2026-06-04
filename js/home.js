const initHero = () => {
  if (!document.querySelector('.hero-title-wrapper')) return;

  const tl = gsap.timeline({ delay: 0.3 });

  tl.fromTo(['.hero-title-top', '.hero-title-bottom'],
    { opacity: 0, y: 40 },
    { opacity: 1, y: 0, duration: 1.2, ease: "power4.out", stagger: 0.05 }
  )
    .fromTo('.hero-sub',
      { opacity: 0 },
      { opacity: 0.6, duration: 1, ease: "power2.out" },
      "-=0.4"
    )
    .to('.hero-title-top', { y: -25, duration: 0.9, ease: "expo.inOut" }, "+=0.6")
    .to('.hero-title-bottom', { y: 25, duration: 0.9, ease: "expo.inOut" }, "<")
    .to('.hero-title-core', { opacity: 1, duration: 0.5, ease: "power2.out" }, ">")
    .to('.hero-title-top', { y: 0, duration: 0.6, ease: "power3.out" }, "+=0.8")
    .to('.hero-title-bottom', { y: 0, duration: 0.6, ease: "power3.out" }, "<")
    .to('.hero-title-core', { opacity: 0, duration: 0.3, ease: "power2.in" }, "<0.1");

  gsap.fromTo('.hero-name-structure',
    { opacity: 0, x: -15 },
    { opacity: 0.4, x: 0, duration: 1.5, ease: "power2.out", delay: 0.1 }
  );
  gsap.fromTo('.hero-name-solid',
    { clipPath: 'polygon(0 0, 0% 0, 0% 100%, 0% 100%)' },
    { clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0% 100%)', duration: 4.5, ease: "power2.inOut", delay: 0.3 }
  );

  tl.call(() => {
    const wrapper = document.querySelector('.hero-title-wrapper');
    if (!wrapper) return;

    let isOpen = false;

    const closeHero = () => {
      if (!isOpen) return;
      isOpen = false;
      // Prevent overlapping animation layouts
      gsap.to('.hero-title-core', { opacity: 0, duration: 0.2, ease: "power2.in", overwrite: true });
      gsap.to('.hero-title-top', { y: 0, duration: 0.4, delay: 0.15, ease: "power3.inOut", overwrite: true });
      gsap.to('.hero-title-bottom', { y: 0, duration: 0.4, delay: 0.15, ease: "power3.inOut", overwrite: true });
    };

    wrapper.addEventListener('mouseenter', () => {
      if (isOpen) return;
      isOpen = true;
      gsap.to('.hero-title-top', { y: -25, duration: 0.4, ease: "power3.inOut", overwrite: true });
      gsap.to('.hero-title-bottom', { y: 25, duration: 0.4, ease: "power3.inOut", overwrite: true });
      gsap.to('.hero-title-core', { opacity: 1, duration: 0.25, delay: 0.4, ease: "power2.out", overwrite: true });
    });

    wrapper.addEventListener('mouseleave', closeHero);
    document.addEventListener('mouseleave', closeHero);
  });

  gsap.fromTo('.nav > *',
    { y: -15, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.8, stagger: 0.08, ease: "power3.out", delay: 0.5 }
  );
};

const initBlog = () => {
  const posts = document.querySelectorAll('.blog-post');
  if (!posts.length) return;

  posts.forEach(post => {
    gsap.from(post, {
      scrollTrigger: {
        trigger: post,
        start: "top 85%",
      },
      y: 40,
      opacity: 0,
      duration: 0.8,
      ease: "power3.out"
    });
  });
};

const initStackRows = () => {
  const rows = document.querySelectorAll('.stack-row');
  if (!rows.length) return;

  gsap.fromTo(rows,
    { opacity: 0, y: 40 },
    {
      opacity: 1,
      y: 0,
      duration: 1.0,
      stagger: 0.1,
      ease: "power3.out",
      scrollTrigger: {
        trigger: '.stack-grid',
        start: "top 85%",
        toggleActions: "restart none none reset"
      }
    }
  );
};

const initWritingTeaser = () => {
  const items = document.querySelectorAll('.writing-item');
  if (!items.length) return;

  gsap.fromTo(items,
    { opacity: 0, y: 30 },
    {
      opacity: 1,
      y: 0,
      duration: 0.8,
      stagger: 0.1,
      ease: "power3.out",
      scrollTrigger: {
        trigger: '.writing-grid',
        start: "top 80%",
        toggleActions: "play none none none"
      }
    }
  );
};

const initAccordion = () => {
  let activeItem = null;
  let activeTl = null;
  let hoverTimer = null;
  let pendingItem = null;
  let lastMouseMoveTime = Date.now();

  // Ignore passive scroll hovers
  document.addEventListener('mousemove', () => {
    lastMouseMoveTime = Date.now();
  });

  document.querySelectorAll('.accordion-item').forEach(item => {
    const body = item.querySelector('.accordion-body');
    const img = item.querySelector('.proj-img');
    const mask = item.querySelector('.proj-img-mask');

    const tl = gsap.timeline({
      paused: true,
      defaults: { ease: "power3.inOut" },
      onComplete: () => ScrollTrigger.refresh(),
      onReverseComplete: () => {
        item.isReversingForScroll = false;
        ScrollTrigger.refresh();
      },
      onUpdate: () => {
        if (item.isReversingForScroll) {
          const currentHeight = body.offsetHeight;
          const diff = item._prevHeight - currentHeight;
          if (diff !== 0) {
            lenis.scrollTo(lenis.scroll - diff, { immediate: true });
          }
          item._prevHeight = currentHeight;
        }
      }
    });

    tl.to(body, { height: 'auto', duration: 0.55 })
      .to(mask, { scaleY: 0, duration: 0.5 }, "<0.08")
      .fromTo(img, { scale: 1.15 }, { scale: 1, duration: 0.7 }, "<");

    item.addEventListener('mouseenter', () => {
      // Avoid scroll layout jitter
      if (Date.now() - lastMouseMoveTime > 100) return;

      pendingItem = item;
      clearTimeout(hoverTimer);

      hoverTimer = setTimeout(() => {
        if (pendingItem !== item) return;
        if (activeItem === item) return;

        if (activeItem && activeTl) {
          const isAbove = activeItem.compareDocumentPosition(item) & Node.DOCUMENT_POSITION_FOLLOWING;
          if (isAbove) {
            activeItem.isReversingForScroll = true;
            const activeBody = activeItem.querySelector('.accordion-body');
            activeItem._prevHeight = activeBody.offsetHeight;
          } else {
            activeItem.isReversingForScroll = false;
          }
          activeTl.reverse();
        }

        tl.play();
        activeItem = item;
        activeTl = tl;

        setTimeout(() => {
          if (activeItem !== item) return;

          lenis.scrollTo(item, {
            offset: -20,
            duration: 1.0,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
          });
        }, 750);

      }, 100);
    });

    item.addEventListener('mouseleave', () => {
      if (Date.now() - lastMouseMoveTime > 100) return;
      if (pendingItem === item) pendingItem = null;
    });
  });

  const accordionContainer = document.querySelector('.accordion');
  if (accordionContainer) {
    accordionContainer.addEventListener('mouseleave', () => {
      // Persistent hover avoids flickering
      if (Date.now() - lastMouseMoveTime > 100) return;

      pendingItem = null;

      if (activeItem && activeTl) {
        activeItem.isReversingForScroll = true;
        const activeBody = activeItem.querySelector('.accordion-body');
        activeItem._prevHeight = activeBody.offsetHeight;

        activeTl.reverse();
        activeItem = null;
        activeTl = null;
      }
    });
  }
};

const initEthos = () => {
  document.querySelectorAll('.ethos-line').forEach((line, i) => {
    const isVivid = line.classList.contains('ethos-line--vivid');

    gsap.fromTo(line,
      { opacity: 0, y: isVivid ? 30 : 20 },
      {
        opacity: 1,
        y: 0,
        duration: isVivid ? 1.1 : 0.8,
        ease: isVivid ? "expo.out" : "power3.out",
        immediateRender: false,
        scrollTrigger: {
          trigger: line,
          start: "top 85%",
          toggleActions: "play none none reset",
        }
      }
    );
  });
};

const initClosing = () => {
  if (!document.querySelector('.closing')) return;

  gsap.from('.closing-lead', {
    y: 30,
    opacity: 0,
    duration: 1,
    ease: "power3.out",
    scrollTrigger: {
      trigger: '.closing',
      start: "top 70%",
    }
  });

  gsap.from('.closing-initiate', {
    y: 20,
    opacity: 0,
    duration: 0.8,
    ease: "power3.out",
    scrollTrigger: {
      trigger: '.closing',
      start: "top 60%",
    }
  });
};

const initBehindCode = () => {
  const depthBtn = document.querySelector('.depth');
  if (!depthBtn) return;

  depthBtn.setAttribute('data-cursor', 'expand');
  depthBtn.style.cursor = 'none';

  let isNavigating = false;

  const navigateToBehind = (e) => {
    if (isNavigating) return;
    isNavigating = true;

    const rect = depthBtn.getBoundingClientRect();
    const x = (e && e.clientX !== undefined) ? e.clientX : (rect.left + rect.width / 2);
    const y = (e && e.clientY !== undefined) ? e.clientY : (rect.top + rect.height / 2);

    const overlay = document.createElement('div');
    overlay.className = 'btc-transition-overlay is-exit-overlay';

    const maxRadius = Math.max(
      Math.hypot(x, y),
      Math.hypot(window.innerWidth - x, y),
      Math.hypot(x, window.innerHeight - y),
      Math.hypot(window.innerWidth - x, window.innerHeight - y)
    ) + 100;

    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: oklch(65% 0.16 250);
      pointer-events: none;
      clip-path: circle(0px at ${x}px ${y}px);
    `;
    document.body.appendChild(overlay);

    gsap.to('main, .nav, .bg-grid, .section-tracker', {
      scale: 0.95,
      filter: 'blur(10px)',
      opacity: 0,
      duration: 1.2,
      ease: 'power3.inOut',
      transformOrigin: `${x}px ${y}px`
    });

    gsap.to(overlay, {
      clipPath: `circle(${maxRadius}px at ${x}px ${y}px)`,
      duration: 1.2,
      ease: 'expo.inOut',
      onComplete: () => {
        window.location.href = `pages/behind.html?x=${x}&y=${y}`;
      }
    });
  };

  depthBtn.addEventListener('click', navigateToBehind);
  depthBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigateToBehind(e);
    }
  });
};

document.addEventListener('homeDataLoaded', () => {
  initHero();
  initBlog();
  initStackRows();
  initWritingTeaser();
  initEthos();
  initClosing();
  initBehindCode();
  initAccordion();
  if (window.revealPage) window.revealPage();
});

window.reinitPage = function() {
  initHero();
  initBlog();
  initStackRows();
  initWritingTeaser();
  initEthos();
  initClosing();
  initBehindCode();
  initAccordion();
};

document.addEventListener('DOMContentLoaded', () => {
});
