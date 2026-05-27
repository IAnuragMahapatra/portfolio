// Populates blog feed by fetching and sorting entries from posts database

(function () {
  'use strict';

  const POST_PAGE = 'post.html';

  const feedEl = document.querySelector('.blog-feed');
  if (!feedEl) return;

  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function renderCard(post, isFeatured) {
    const tags = (post.tags || []).join(' · ');
    const titleTag = isFeatured ? 'h2' : 'h3';
    const featuredClass = isFeatured ? ' is-featured' : '';

    return "<a href=\"" + POST_PAGE + "?slug=" + esc(post.slug) + "\" class=\"blog-post" + featuredClass + "\" data-cursor=\"expand\">" +
      "<div class=\"blog-post-visual\">" +
        "<img src=\"" + esc(post.cover) + "\" alt=\"" + esc(post.title) + "\" loading=\"lazy\">" +
      "</div>" +
      "<div class=\"blog-post-content\">" +
        "<div class=\"blog-post-meta\">" +
          "<span class=\"blog-post-date\">" + esc(post.date) + "</span>" +
          "<span class=\"blog-post-tag\">" + esc(tags) + "</span>" +
        "</div>" +
        "<" + titleTag + " class=\"blog-post-title\">" + esc(post.title) + "</" + titleTag + ">" +
        "<p class=\"blog-post-excerpt\">" + esc(post.excerpt) + "</p>" +
      "</div>" +
    "</a>";
  }

  async function loadFeed() {
    try {
      const posts = await window.fetchData('posts.json', 'json', false);

      // Sort by date newest first and filter for live content only
      const published = posts
        .filter(p => p.status === 'published')
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      if (!published.length) {
        feedEl.innerHTML = '<p style="opacity:0.4; font-family: var(--font-mono); font-size: 0.8rem; letter-spacing: 0.1em;">NO POSTS YET</p>';
        if (typeof window.scrollToHash === 'function') window.scrollToHash();
        return;
      }

      const heroIndex = document.querySelector('.page-hero__index');
      if (heroIndex) {
        const count = published.length.toString().padStart(2, '0');
        heroIndex.textContent = `${count} ENTRIES`;
      }

      feedEl.innerHTML = '';
      feedEl.insertAdjacentHTML('beforeend', published
        .map((p, i) => renderCard(p, i === 0 && p.featured))
        .join(''));

    } catch (err) {
      console.warn('[blog-loader] Could not load posts.json:', err.message);
      window.renderErrorBoundary('.blog-feed', 'Writing feed is temporarily unavailable.');
    } finally {
      document.dispatchEvent(new Event('blogDataLoaded'));
      if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
      if (typeof window.scrollToHash === 'function') {
        window.scrollToHash();
      }
    }
  }

  loadFeed();
})();
