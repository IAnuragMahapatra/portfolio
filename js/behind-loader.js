// Populates behind the code page by fetching btc.json

(function () {
  'use strict';

  const esc = (str) => {
    const d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
  };

  const loadBtcData = async () => {
    try {
      const res = await fetch('../data/btc.json');
      if (!res.ok) {
        window.location.href = '../404.html';
        return;
      }
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
          "<div class=\"polaroid polaroid--\" + (i + 1) + \"\" data-cursor=\"expand\">" +
            "<img src=\"" + esc(pic.image) + "\" alt=\"" + esc(pic.alt) + "\" loading=\"lazy\">" +
            "<span class=\"polaroid__caption\">" + esc(pic.caption) + "</span>" +
          "</div>"
        ).join(''));
      }
    } catch (err) {
      console.error('Failed to load BTC data:', err);
      window.location.href = '../404.html';
    } finally {
      document.dispatchEvent(new Event('btcDataLoaded'));
      if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
      if (typeof window.scrollToHash === 'function') {
        window.scrollToHash();
      }
    }
  };

  loadBtcData();
})();
