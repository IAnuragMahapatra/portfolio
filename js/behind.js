// behind the code interactive modules and transitions

(function () {
  'use strict';

  const initHorizontalGames = () => {
    const track = document.getElementById('gamesTrack');
    const pin = document.querySelector('.games-pin');
    if (!track || !pin) return;

    gsap.to(track, {
      x: () => -(track.scrollWidth - pin.offsetWidth),
      ease: 'none',
      scrollTrigger: {
        trigger: '.btc-games',
        start: 'top top',
        end: () => `+=${track.scrollWidth - pin.offsetWidth}`,
        pin: true, scrub: 1,
        invalidateOnRefresh: true,
      }
    });
  };

  const initVinyl = () => {
    const player = document.getElementById('vinylPlayer');
    const playBtn = document.getElementById('vinylPlay');
    const vizContainer = document.getElementById('vinylVisualizer');
    if (!player || !playBtn) return;

    const playLabel = playBtn.querySelector('.vinyl-play__label');
    const VIZ_BARS = 32;
    const bars = [];

    if (vizContainer) {
      const frag = document.createDocumentFragment();
      for (let i = 0; i < VIZ_BARS; i++) {
        const bar = document.createElement('div');
        bar.className = 'vinyl-visualizer__bar';
        frag.appendChild(bar);
        bars.push(bar);
      }
      vizContainer.appendChild(frag);
    }

    let audioCtx = null, analyser = null, gainNode = null, source = null;
    let isPlaying = false, animFrameId = null;

    const audioUrl = window.CONFIG?.DATA_BASE_URL ? window.CONFIG.DATA_BASE_URL.replace(/\/$/, '') + '/song.mp3' : '../data/song.mp3';
    const audioEl = new Audio(audioUrl);
    audioEl.crossOrigin = 'anonymous';
    audioEl.loop = true;
    audioEl.preload = 'auto';

    const createAudio = () => {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;
      gainNode = audioCtx.createGain();
      gainNode.gain.value = 0;
      gainNode.connect(analyser);
      analyser.connect(audioCtx.destination);

      source = audioCtx.createMediaElementSource(audioEl);
      source.connect(gainNode);
    };

    let dataArray = null;
    const animateViz = () => {
      if (!analyser || !isPlaying) return;
      if (!dataArray) dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);
      const step = Math.floor(dataArray.length / VIZ_BARS);
      bars.forEach((bar, i) => {
        bar.style.height = Math.max(2, (Reflect.get(dataArray, i * step) || 0) / 255 * 34) + 'px';
      });
      animFrameId = requestAnimationFrame(animateViz);
    };

    const resetViz = () => bars.forEach(b => { b.style.height = '2px'; });

    const play = () => {
      if (!audioCtx) createAudio();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      if (audioEl) audioEl.play();
      gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
      gainNode.gain.setValueAtTime(gainNode.gain.value, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.8, audioCtx.currentTime + 0.3);
      isPlaying = true;
      player.classList.add('is-playing');
      playLabel.textContent = 'PAUSE';
      animateViz();
    };

    const pause = () => {
      if (audioCtx && gainNode) {
        gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
        gainNode.gain.setValueAtTime(gainNode.gain.value, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
        setTimeout(() => {
          if (audioEl) audioEl.pause();
          if (!isPlaying && audioCtx.state === 'running') audioCtx.suspend();
        }, 350);
      }
      isPlaying = false;
      player.classList.remove('is-playing');
      playLabel.textContent = 'PLAY';
      if (animFrameId) cancelAnimationFrame(animFrameId);
      setTimeout(resetViz, 350);
    };

    playBtn.addEventListener('click', () => isPlaying ? pause() : play());
  };

  const initPolaroids = () => {
    const desk = document.getElementById('polaroidDesk');
    if (!desk) return;
    const polaroids = desk.querySelectorAll('.polaroid');

    const movers = Array.from(polaroids).map((p, i) => ({
      xTo: gsap.quickTo(p, 'x', { duration: 0.7, ease: 'power2.out' }),
      yTo: gsap.quickTo(p, 'y', { duration: 0.7, ease: 'power2.out' }),
      speed: 0.4 + (i % 3) * 0.25
    }));

    desk.addEventListener('mousemove', (e) => {
      const rect = desk.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      movers.forEach(m => {
        m.xTo(x * m.speed * 14);
        m.yTo(y * m.speed * 10);
      });
    });

    desk.addEventListener('mouseleave', () => {
      movers.forEach(m => {
        m.xTo(0);
        m.yTo(0);
      });
    });
  };

  const initLightbox = () => {
    const lightbox = document.getElementById('btcLightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    const lightboxCaption = document.getElementById('lightboxCaption');
    const closeBtn = document.getElementById('lightboxClose');
    if (!lightbox || !lightboxImg) return;

    const openLightbox = (imgSrc, caption) => {
      lightboxImg.src = imgSrc;
      lightboxCaption.textContent = caption || '';
      lightbox.classList.add('is-open');
      lightbox.setAttribute('aria-hidden', 'false');
      lenis.stop();
    };

    const closeLightbox = () => {
      lightbox.classList.remove('is-open');
      lightbox.setAttribute('aria-hidden', 'true');
      lenis.start();
      setTimeout(() => { lightboxImg.src = ''; }, 400);
    };

    document.body.addEventListener('click', (e) => {
      const pol = e.target.closest('.polaroid, .btc-hero__polaroid');
      if (pol) {
        e.stopPropagation();
        const img = pol.querySelector('img');
        const caption = pol.querySelector('.polaroid__caption, .btc-hero__polaroid-caption');
        if (img) openLightbox(img.src, caption ? caption.textContent : '');
      }
    });

    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lightbox.classList.contains('is-open')) {
        closeLightbox();
      }
    });
  };

  const initAnimations = () => {
    const heroTl = gsap.timeline({ delay: 0.5 });
    heroTl
      .fromTo('.btc-hero__eyebrow', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' })
      .fromTo('.btc-hero__title span', { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.9, stagger: 0.12, ease: 'power4.out' }, '-=0.2')
      .fromTo('.btc-hero__bio > *', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.12, ease: 'power3.out' }, '-=0.3')
      .fromTo('.btc-hero__scroll', { opacity: 0 }, { opacity: 1, duration: 0.4 }, '-=0.2');

    gsap.fromTo('.btc-hero__photo-wrap', { opacity: 0, x: 40, rotate: 8 }, {
      opacity: 1, x: 0, rotate: 0, duration: 1, ease: 'power3.out', delay: 0.7
    });

    gsap.fromTo('.btc-back', { opacity: 0, x: -15 }, { opacity: 1, x: 0, duration: 0.5, ease: 'power3.out', delay: 0.4 });

    gsap.utils.toArray('.btc-section-label').forEach(label => {
      gsap.fromTo(label, { opacity: 0, x: -20 }, {
        opacity: 1, x: 0, duration: 0.6, ease: 'power3.out',
        scrollTrigger: { trigger: label, start: 'top 88%' }
      });
    });

    gsap.fromTo('.setup-card', { opacity: 0, y: 25 }, {
      opacity: 1, y: 0, duration: 0.5, stagger: 0.06,
      ease: 'power3.out',
      scrollTrigger: { trigger: '.setup-grid', start: 'top 80%' }
    });

    gsap.fromTo('.vinyl-visual', { opacity: 0, scale: 0.92 }, {
      opacity: 1, scale: 1, duration: 0.8, ease: 'power3.out',
      scrollTrigger: { trigger: '.btc-music', start: 'top 75%' }
    });
    gsap.fromTo('.vinyl-info > *', { opacity: 0, y: 15 }, {
      opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'power3.out',
      scrollTrigger: { trigger: '.btc-music', start: 'top 72%' }
    });

    gsap.fromTo('.polaroid', { opacity: 0, y: 30, rotate: '+=4' }, {
      opacity: 1, y: 0, duration: 0.6, stagger: 0.08,
      ease: 'power3.out',
      scrollTrigger: { trigger: '.btc-gallery', start: 'top 80%' }
    });

    gsap.fromTo('.btc-closing__lead', { opacity: 0, y: 20 }, {
      opacity: 1, y: 0, duration: 0.7, ease: 'power3.out',
      scrollTrigger: { trigger: '.btc-closing', start: 'top 75%' }
    });
    gsap.fromTo('.btc-closing__word', { opacity: 0, y: 40 }, {
      opacity: 1, y: 0, duration: 0.9, ease: 'power4.out',
      scrollTrigger: { trigger: '.btc-closing', start: 'top 70%' }
    });
    gsap.fromTo('.closing-socials', { opacity: 0, y: 15 }, {
      opacity: 1, y: 0, duration: 0.5, ease: 'power3.out',
      scrollTrigger: { trigger: '.btc-closing', start: 'top 65%' }
    });
  };

  const initBack = () => {
    const backBtn = document.getElementById('btcBack');
    if (!backBtn) return;
    let isNavigating = false;

    backBtn.addEventListener('click', (e) => {
      if (isNavigating) return;
      isNavigating = true;

      document.documentElement.style.setProperty('cursor', 'none', 'important');

      const rect = backBtn.getBoundingClientRect();
      const x = (e && e.clientX !== undefined) ? e.clientX : (rect.left + rect.width / 2);
      const y = (e && e.clientY !== undefined) ? e.clientY : (rect.top + rect.height / 2);

      const maxRadius = Math.max(
        Math.hypot(x, y),
        Math.hypot(window.innerWidth - x, y),
        Math.hypot(x, window.innerHeight - y),
        Math.hypot(window.innerWidth - x, window.innerHeight - y)
      ) + 100;

      const overlay = document.createElement('div');
      overlay.className = 'btc-transition-overlay is-exit-overlay';
      overlay.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 9999;
        background: oklch(65% 0.16 250);
        clip-path: circle(0px at ${x}px ${y}px);
      `;
      document.body.appendChild(overlay);

      gsap.to(overlay, {
        clipPath: `circle(${maxRadius}px at ${x}px ${y}px)`,
        duration: 1.2,
        ease: 'expo.inOut',
        onComplete: () => { window.location.href = `../index.html?x=${x}&y=${y}`; }
      });
    });
  };

    document.addEventListener('btcDataLoaded', () => {
      initHorizontalGames();
      initVinyl();
      initPolaroids();
      initLightbox();
      initAnimations();
      initBack();

      if (window.revealPage) window.revealPage();
    });

    window.reinitPage = function() {
      initHorizontalGames();
      initVinyl();
      initPolaroids();
      initLightbox();
      initAnimations();
      initBack();
    };

})();
