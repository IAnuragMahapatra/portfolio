// Logic for behind the code interactive modules and transitions

(function () {
  'use strict';

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
  gsap.registerPlugin(ScrollTrigger);
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  const cursor = document.querySelector('.cursor');
  if (cursor) gsap.set(cursor, { xPercent: -50, yPercent: -50 });
  const xSet = cursor ? gsap.quickTo(cursor, 'x', { duration: 0.08, ease: 'power2.out' }) : null;
  const ySet = cursor ? gsap.quickTo(cursor, 'y', { duration: 0.08, ease: 'power2.out' }) : null;

  window.addEventListener('mousemove', (e) => {
    if (xSet && ySet) { xSet(e.clientX); ySet(e.clientY); }
  });
  document.addEventListener('mouseover', (e) => {
    if (cursor && e.target.closest('a, button, [data-cursor]')) cursor.classList.add('is-expanded');
  });
  document.addEventListener('mouseout', (e) => {
    if (cursor && e.target.closest('a, button, [data-cursor]')) cursor.classList.remove('is-expanded');
  });
  document.addEventListener('mouseleave', () => { if (cursor) gsap.to(cursor, { opacity: 0, duration: 0.15 }); });
  document.addEventListener('mouseenter', () => { if (cursor) gsap.to(cursor, { opacity: 1, duration: 0.15 }); });

  const initEntrance = () => {
    const params = new URLSearchParams(window.location.search);
    const x = params.has('x') ? parseFloat(params.get('x')) : window.innerWidth / 2;
    const y = params.has('y') ? parseFloat(params.get('y')) : window.innerHeight / 2;

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
    
    overlay.className = 'btc-transition-overlay';
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 99999;
      background: oklch(65% 0.16 250);
      mask-image: radial-gradient(circle at ${x}px ${y}px, transparent 0px, black 1px);
      -webkit-mask-image: radial-gradient(circle at ${x}px ${y}px, transparent 0px, black 1px);
    `;

    const proxy = { r: 0 };
    gsap.to(proxy, {
      r: maxRadius,
      duration: 1.2,
      ease: 'expo.inOut',
      delay: 0.1,
      onUpdate: () => {
        overlay.style.maskImage = `radial-gradient(circle at ${x}px ${y}px, transparent ${proxy.r}px, black ${proxy.r + 1}px)`;
        overlay.style.webkitMaskImage = `radial-gradient(circle at ${x}px ${y}px, transparent ${proxy.r}px, black ${proxy.r + 1}px)`;
      },
      onComplete: () => {
        overlay.remove();
        if (params.has('x')) {
          const newUrl = window.location.pathname + window.location.hash;
          window.history.replaceState({}, '', newUrl);
        }
      }
    });
  };

  const initScramble = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    document.querySelectorAll('[data-scramble]').forEach((el, idx) => {
      const original = el.textContent;
      const len = original.length;
      let frame = 0;
      const totalFrames = 22;
      const scramble = () => {
        let result = '';
        for (let i = 0; i < len; i++) {
          if (original.charAt(i) === ' ') result += ' ';
          else if (frame / totalFrames > i / len) result += original.charAt(i);
          else result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        el.textContent = result;
        frame++;
        if (frame <= totalFrames) requestAnimationFrame(scramble);
      };
      setTimeout(scramble, 600 + idx * 180);
    });
  };

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

    let audioCtx = null, analyser = null, gainNode = null, audioEl = null, source = null;
    let isPlaying = false, animFrameId = null;

    const createAudio = () => {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;
      gainNode = audioCtx.createGain();
      gainNode.gain.value = 0;
      gainNode.connect(analyser);
      analyser.connect(audioCtx.destination);

      audioEl = new Audio('../data/song.mp3');
      audioEl.loop = true;
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
    gsap.fromTo('.btc-closing__socials', { opacity: 0, y: 15 }, {
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
      overlay.className = 'btc-transition-overlay';
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

  const loadBtcData = async () => {
    try {
      const res = await fetch('../data/btc.json');
      if (!res.ok) return;
      const btc = await res.json();

      // Inject raw HTML for bio formatting sourced from local JSON
      const heroBio = document.getElementById('heroBio');
      if (heroBio) {
        heroBio.innerHTML = '';
        heroBio.insertAdjacentHTML('beforeend',
          "<p>" + esc(btc.hero.bioParagraph1 || '') + "</p>" +
          "<div class=\"btc-hero__pull\">" + esc(btc.hero.pullQuote) + "</div>" +
          "<p>" + esc(btc.hero.bioParagraph2 || '') + "</p>" +
          "<p>" + esc(btc.hero.bioParagraph3 || '') + "</p>"
        );
      }

      const heroPhotoWrap = document.getElementById('heroPhotoWrap');
      if (heroPhotoWrap) {
        const photoContent = btc.hero.photoUrl
          ? "<img class=\"btc-hero__photo\" src=\"" + esc(btc.hero.photoUrl) + "\" alt=\"" + esc(btc.hero.photoCaption) + "\">"
          : "<div class=\"btc-hero__photo-placeholder\">YOUR PHOTO</div>";
        heroPhotoWrap.innerHTML = '';
        heroPhotoWrap.insertAdjacentHTML('beforeend',
          "<div class=\"btc-hero__polaroid\" data-cursor=\"expand\">" +
            photoContent +
            "<span class=\"btc-hero__polaroid-caption\">" + esc(btc.hero.photoCaption) + "</span>" +
          "</div>"
        );
      }

      const gamesTrack = document.getElementById('gamesTrack');
      if (gamesTrack && btc.games) {
        gamesTrack.innerHTML = '';
        gamesTrack.insertAdjacentHTML('beforeend', btc.games.map(game => 
          "<div class=\"game-card\">" +
            "<img src=\"" + esc(game.image) + "\" alt=\"" + esc(game.title) + "\" loading=\"lazy\">" +
            "<div class=\"game-info\">" +
              "<a href=\"" + esc(game.link) + "\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"game-info__title\" style=\"text-decoration: underline; text-decoration-color: var(--color-surface-muted); text-underline-offset: 4px;\">" + esc(game.title) + "</a>" +
              "<span class=\"game-info__hours\">" + esc(game.hours) + "</span>" +
            "</div>" +
          "</div>"
        ).join(''));
      }

      const setupGrid = document.getElementById('setupGrid');
      if (setupGrid && btc.hardware) {
        setupGrid.innerHTML = '';
        setupGrid.insertAdjacentHTML('beforeend', btc.hardware.map(item => 
          "<div class=\"setup-card\">" +
            "<span class=\"setup-card__label\">" + esc(item.label) + "</span>" +
            "<span class=\"setup-card__value\">" + esc(item.value) + "</span>" +
            "<span class=\"setup-card__detail\">" + esc(item.detail) + "</span>" +
          "</div>"
        ).join(''));
      }

      const musicTrack = document.getElementById('musicTrack');
      const musicArtist = document.getElementById('musicArtist');
      const musicAlbum = document.getElementById('musicAlbum');
      if (musicTrack && btc.music) musicTrack.textContent = btc.music.track;
      if (musicArtist && btc.music) musicArtist.textContent = btc.music.artist;
      if (musicAlbum && btc.music) musicAlbum.textContent = btc.music.album;

      const polaroidDesk = document.getElementById('polaroidDesk');
      if (polaroidDesk && btc.gallery) {
        polaroidDesk.innerHTML = '';
        polaroidDesk.insertAdjacentHTML('beforeend', btc.gallery.map((pic, i) => 
          "<div class=\"polaroid polaroid--" + (i + 1) + "\" data-cursor=\"expand\">" +
            "<img src=\"" + esc(pic.image) + "\" alt=\"" + esc(pic.alt) + "\" loading=\"lazy\">" +
            "<span class=\"polaroid__caption\">" + esc(pic.caption) + "</span>" +
          "</div>"
        ).join(''));
      }
    } catch (err) {
      console.error('Failed to load BTC data:', err);
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    // Easter Egg: Console Greeting
    console.log(
      "%chey, dev\n\nglad you looked under the hood.\n\n→ hold [space] anywhere to enter Blueprint Mode\n→ explore section 6 on the home page to find Behind the Code\n→ got feedback or thoughts on the site? feel free to drop a mail\n→ if you’d like to work together, please reach out through the contact section\n\nhope you have an amazing day.\n— Anurag Mahapatra\n",
      "color: oklch(65% 0.16 250); font-size: 14px; line-height: 1.8;"
    );
    console.log(
      "%cthanks for visiting",
      "color: #888888; font-size: 11px; font-family: monospace;"
    );

    loadBtcData().then(() => {
      initEntrance();
      initScramble();
      initHorizontalGames();
      initVinyl();
      initPolaroids();
      initLightbox();
      initAnimations();
      initBack();
    });
  });

})();
