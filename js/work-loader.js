// Populates the cinematic work showcase by fetching all entries from works database

(function () {
  'use strict';

  const getUrl = (path) => (window.CONFIG && window.CONFIG.DATA_BASE_URL) ? window.CONFIG.DATA_BASE_URL + path : '../data/' + path;
  const DATA_PATH = getUrl('works.json');

  const showcase = document.getElementById('projectShowcase');
  if (!showcase) return;

  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function renderRow(work, index) {
    const isReversed = index % 2 !== 0;
    const reversedClass = isReversed ? ' is-reversed' : '';

    const stackHtml = work.stack.map(s => "<span>" + esc(s) + "</span>").join(' ');

    const links = [];
    if (work.blog) {
      links.push("<a href=\"" + esc(work.blog) + "\" class=\"project-link\" data-cursor=\"expand\">Read Notes <span class=\"arrow\">\u2197</span></a>");
    }
    if (work.github) {
      links.push("<a href=\"" + esc(work.github) + "\" class=\"project-link\" target=\"_blank\" rel=\"noopener noreferrer\" data-cursor=\"expand\">GitHub <span class=\"arrow\">\u2197</span></a>");
    }
    if (work.live) {
      links.push("<a href=\"" + esc(work.live) + "\" class=\"project-link\" target=\"_blank\" rel=\"noopener noreferrer\" data-cursor=\"expand\">Live <span class=\"arrow\">\u2197</span></a>");
    }
    const linksHtml = links.length ? "<div class=\"project-links\">" + links.join('') + "</div>" : '';

    return "<div class=\"project-row" + reversedClass + "\">" +
        "<div class=\"project-visual\">" +
          "<div class=\"project-img-mask\">" +
            "<img src=\"" + esc(work.image) + "\" alt=\"" + esc(work.imageAlt) + "\" class=\"project-img\" loading=\"lazy\">" +
          "</div>" +
        "</div>" +
        "<div class=\"project-info\">" +
          "<div class=\"project-header\">" +
            "<span class=\"project-num\">" + esc(work.id) + "</span>" +
            "<h2 class=\"project-title\">" + esc(work.name) + "</h2>" +
            "<span class=\"project-tag\">" + esc(work.tag) + "</span>" +
          "</div>" +
          "<div class=\"project-details\">" +
            "<p class=\"project-desc\">" + esc(work.description) + "</p>" +
            "<div class=\"project-meta\">" +
              "<div class=\"project-stack\">" + stackHtml + "</div>" +
              linksHtml +
            "</div>" +
          "</div>" +
        "</div>" +
      "</div>";
  }

  async function loadShowcase() {
    try {
      const res = await fetch(DATA_PATH);
      if (!res.ok) throw new Error(res.statusText);
      const works = await res.json();

      // Update hero eyebrow count from total project length
      const countLabel = document.getElementById('work-count-label');
      if (countLabel) {
        countLabel.textContent = String(works.length).padStart(2, '0') + ' PROJECTS';
      }

      showcase.innerHTML = '';
      showcase.insertAdjacentHTML('beforeend', works.map(renderRow).join(''));

    } catch (err) {
      console.warn('[work-loader] Could not load works.json:', err.message);
      window.location.href = '../404.html';
    } finally {
      document.dispatchEvent(new Event('workDataLoaded'));
      if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
      if (typeof window.scrollToHash === 'function') {
        window.scrollToHash();
      }
    }
  }

  loadShowcase();
})();
