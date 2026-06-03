// Populate behind the code page

(function () {
  'use strict';

  const esc = (str) => {
    const d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
  };

  const loadBtcData = async () => {
    try {
      const btc = await window.fetchData('btc.json', 'json', false);

      // Inject bio paragraphs and pullquote
      const heroBio = document.getElementById('heroBio');
      if (heroBio) {
        heroBio.innerHTML = '';
        heroBio.insertAdjacentHTML('beforeend',
          "<p>" + (btc.hero.bioParagraph1 || '').replace(/\n/g, '<br>') + "</p>" +
          "<p>" + (btc.hero.bioParagraph2 || '').replace(/\n/g, '<br>') + "</p>" +
          "<div class=\"btc-hero__pull\">" + esc(btc.hero.pullQuote).replace(/\n/g, '<br>') + "</div>" +
          "<p>" + (btc.hero.bioParagraph3 || '').replace(/\n/g, '<br>') + "</p>"
        );
      }

      const heroPhotoWrap = document.getElementById('heroPhotoWrap');
      if (heroPhotoWrap) {
        let resolvedPhotoUrl = btc.hero.photoUrl;
        if (resolvedPhotoUrl && !resolvedPhotoUrl.startsWith('http') && !resolvedPhotoUrl.startsWith('data:')) {
          const baseUrl = window.CONFIG?.DATA_BASE_URL ? window.CONFIG.DATA_BASE_URL.replace(/\/$/, '') : '../data';
          resolvedPhotoUrl = baseUrl + '/' + resolvedPhotoUrl;
        }
        
        const photoContent = resolvedPhotoUrl
          ? "<img class=\"btc-hero__photo\" src=\"" + esc(resolvedPhotoUrl) + "\" alt=\"" + esc(btc.hero.photoCaption) + "\">"
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
            "<span class=\"setup-card__value\">" + esc(item.value).replace(/\n/g, '<br>') + "</span>" +
            "<span class=\"setup-card__detail\">" + esc(item.detail).replace(/\n/g, '<br>') + "</span>" +
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
      window.renderErrorBoundary('main', 'Behind The Code data is temporarily unavailable.');
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
