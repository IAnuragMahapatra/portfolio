
(function () {
  'use strict';

  function parseFrontmatter(raw) {
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (!match) return { meta: {}, body: raw };

    const yamlBlock = match[1];
    const body = match[2];
    const meta = {};

    let currentKey = null;
    let inArray = false;
    let arrayKey = null;
    let inNestedObj = false;
    let nestedKey = null;

    yamlBlock.split('\n').forEach(line => {
      const trimmed = line.trimEnd();

      if (inNestedObj && /^  \s\s(\w+):\s*(.+)/.test(trimmed)) {
        const m = trimmed.match(/^\s+(\w+):\s*(.+)/);
        if (m && Reflect.has(meta, nestedKey)) {
          const arr = Reflect.get(meta, nestedKey);
          const last = Reflect.get(arr, arr.length - 1);
          if (last && typeof last === 'object') {
            Reflect.set(last, m[1], m[2].replace(/^["']|["']$/g, ''));
          }
        }
        return;
      }

      if (inArray && /^\s+-\s+(\w+):\s*(.*)/.test(trimmed)) {
        const m = trimmed.match(/^\s+-\s+(\w+):\s*(.*)/);
        if (m) {
          const obj = {};
          Reflect.set(obj, m[1], m[2].replace(/^["']|["']$/g, ''));
          if (!Array.isArray(Reflect.get(meta, arrayKey))) Reflect.set(meta, arrayKey, []);
          Reflect.get(meta, arrayKey).push(obj);
          inNestedObj = true;
          nestedKey = arrayKey;
        }
        return;
      }

      if (inArray && /^\s+-\s+(.+)/.test(trimmed)) {
        const m = trimmed.match(/^\s+-\s+(.+)/);
        if (m) {
          if (!Array.isArray(Reflect.get(meta, arrayKey))) Reflect.set(meta, arrayKey, []);
          Reflect.get(meta, arrayKey).push(m[1].replace(/^["']|["']$/g, ''));
        }
        return;
      }

      if (inArray && /^\s+(\w+):\s*(.+)/.test(trimmed) && !trimmed.includes('- ')) {
        const m = trimmed.match(/^\s+(\w+):\s*(.+)/);
        if (m) {
          if (Array.isArray(Reflect.get(meta, arrayKey))) {
            Reflect.set(meta, arrayKey, {});
          }
          Reflect.set(Reflect.get(meta, arrayKey), m[1], m[2].replace(/^["']|["']$/g, ''));
        }
        return;
      }

      if (/^(\w+):\s*\[(.+)\]/.test(trimmed)) {
        const m = trimmed.match(/^(\w+):\s*\[(.+)\]/);
        Reflect.set(meta, m[1], m[2].split(',').map(s => s.trim().replace(/^["']|["']$/g, '')));
        inArray = false;
        inNestedObj = false;
        return;
      }

      if (/^(\w+):\s*$/.test(trimmed)) {
        const m = trimmed.match(/^(\w+):/);
        currentKey = m[1];
        arrayKey = currentKey;
        Reflect.set(meta, currentKey, []);
        inArray = true;
        inNestedObj = false;
        return;
      }

      if (/^(\w+):\s+(.+)/.test(trimmed)) {
        const m = trimmed.match(/^(\w+):\s+(.+)/);
        Reflect.set(meta, m[1], m[2].replace(/^["']|["']$/g, ''));
        inArray = false;
        inNestedObj = false;
        return;
      }
    });

    return { meta, body };
  }

  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function renderMarkdown(md) {
    let html = '';
    const lines = md.split('\n');
    let i = 0;
    let sectionCount = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Custom callout and stats directives
      if (/^:::callout/.test(line)) {
        const isAccent = line.includes('accent');
        const cls = isAccent ? 'post-callout post-callout--accent' : 'post-callout';
        const marker = isAccent ? '→' : '—';
        let content = '';
        i++;
        while (i < lines.length && lines[i] !== ':::') {
          content += lines[i] + '\n';
          i++;
        }
        i++;
        html += "<div class=\"" + cls + "\"><span class=\"post-callout__marker\">" + marker + "</span><p class=\"post-callout__text\">" + inlineMarkdown(content.trim()) + "</p></div>\n";
        continue;
      }

      if (/^:::stats/.test(line)) {
        let statsHtml = '<div class="post-stats-grid">';
        i++;
        while (i < lines.length && lines[i] !== ':::') {
          const parts = lines[i].split('|').map(s => s.trim());
          if (parts.length >= 2 && parts[0]) {
            statsHtml += "<div class=\"post-stat\"><span class=\"post-stat__num\">" + esc(parts[0]) + "</span><span class=\"post-stat__label\">" + inlineMarkdown(parts[1]) + "</span></div>";
          }
          i++;
        }
        i++;
        statsHtml += '</div>';
        html += statsHtml + '\n';
        continue;
      }

      if (/^```(\w*)/.test(line)) {
        const lang = line.match(/^```(\w*)/)[1] || '';
        let code = '';
        i++;
        while (i < lines.length && !lines[i].startsWith('```')) {
          code += lines[i] + '\n';
          i++;
        }
        i++;
        html += "<div class=\"post-code-block\"><div class=\"post-code-block__header\"><span class=\"post-code-block__lang\">" + esc(lang.toUpperCase()) + "</span><button class=\"post-code-block__copy\" data-cursor=\"expand\">COPY</button></div><pre><code>" + highlightCode(esc(code.trimEnd()), lang) + "</code></pre></div>\n";
        continue;
      }

      if (/^>\s/.test(line)) {
        let quoteLines = [];
        while (i < lines.length && (/^>\s/.test(lines[i]) || /^>$/.test(lines[i]))) {
          quoteLines.push(lines[i].replace(/^>\s?/, ''));
          i++;
        }
        const quoteContent = quoteLines.join('\n').trim();
        const citeMatch = quoteContent.match(/^([\s\S]*?)\n+—\s*(.+)$/);
        if (citeMatch) {
          html += "<blockquote class=\"post-quote\"><p>" + inlineMarkdown(citeMatch[1].trim()) + "</p><cite>— " + esc(citeMatch[2]) + "</cite></blockquote>\n";
        } else {
          html += "<blockquote class=\"post-quote\"><p>" + inlineMarkdown(quoteContent) + "</p></blockquote>\n";
        }
        continue;
      }

      if (/^## (.+)/.test(line)) {
        sectionCount++;
        const text = line.match(/^## (.+)/)[1];
        html += "<h2 id=\"s" + sectionCount + "\" class=\"post-h2\">" + esc(text) + "</h2>\n";
        i++;
        continue;
      }

      if (/^-\s/.test(line)) {
        let listItems = [];
        while (i < lines.length && /^-\s/.test(lines[i])) {
          listItems.push(lines[i].replace(/^-\s/, ''));
          i++;
        }
        html += '<ul class="post-list">' + listItems.map(li => "<li>" + inlineMarkdown(li) + "</li>").join('') + '</ul>\n';
        continue;
      }

      if (line.trim() === '') {
        i++;
        continue;
      }

      let paraLines = [];
      while (i < lines.length && lines[i].trim() !== '' && !/^##\s/.test(lines[i]) && !/^```/.test(lines[i]) && !/^:::/.test(lines[i]) && !/^>\s/.test(lines[i]) && !/^-\s/.test(lines[i])) {
        paraLines.push(lines[i]);
        i++;
      }
      if (paraLines.length) {
        html += "<p>" + inlineMarkdown(paraLines.join(' ')) + "</p>\n";
      }
    }

    return html;
  }

  function inlineMarkdown(text) {
    let out = esc(text);
    out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/\*(.+?)\*/g, '<em>$1</em>');
    out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
    out = out.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, src) => {
      let finalSrc = src;
      if (!/^https?:\/\//i.test(src) && !src.startsWith('/') && !src.startsWith('data:')) {
        const slug = new URLSearchParams(window.location.search).get('slug') || '';
        // Always resolve relative image paths through the CDN
        finalSrc = window.CONFIG.DATA_BASE_URL.replace(/\/$/, '') + '/posts/' + slug + '/' + src.replace(/^\.\//, '');
      }
      return "<img src=\"" + esc(finalSrc) + "\" alt=\"" + esc(alt) + "\" class=\"post-image\" loading=\"lazy\">";
    });
    // Sanitize link URLs to avoid XSS
    out = out.replace(/\[(.+?)\]\((.+?)\)/g, (match, text, href) => {
      if (/^(https?:|mailto:|#)/i.test(href)) {
        return "<a href=\"" + href + "\" class=\"post-link\" data-cursor=\"expand\">" + text + "</a>";
      }
      return text;
    });
    return out;
  }

  function highlightCode(escaped, lang) {
    if (!lang || lang === 'text') return escaped;
    let out = escaped;
    out = out.replace(/(#[^\n]*)/g, '<span class="tok-comment">$1</span>');
    out = out.replace(/(&quot;.*?&quot;|&#39;.*?&#39;)/g, '<span class="tok-str">$1</span>');
    const kwRegex = /\b(def|return|if|elif|else|for|in|and|not|or|import|from|class|while|with|as|try|except|raise|yield|async|await|const|let|var|function)\b/g;
    out = out.replace(kwRegex, '<span class="tok-keyword">$1</span>');
    out = out.replace(/\b(\d+)\b/g, '<span class="tok-num">$1</span>');
    out = out.replace(/\b(\w+)(\()/g, '<span class="tok-fn">$1</span>$2');
    return out;
  }

  function buildToc(html) {
    const headings = [];
    const regex = /<h2 id="(s\d+)" class="post-h2">(.+?)<\/h2>/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
      headings.push({ id: match[1], text: match[2] });
    }
    return headings;
  }

  function populatePage(meta, bodyHtml, tocItems) {
    const titleEl = document.getElementById('postTitle');
    if (titleEl && meta.titleLines) {
      titleEl.innerHTML = '';
      titleEl.insertAdjacentHTML('beforeend', meta.titleLines.map(tl => {
        let cls = 'post-hero__title-line';
        if (tl.style === 'outline') cls += ' post-hero__title-line--outline';
        if (tl.style === 'vivid') cls += ' post-hero__title-line--vivid';
        return "<span class=\"" + cls + "\" data-hero-word>" + esc(tl.text) + "</span>";
      }).join('\n'));
    }

    const subEl = document.getElementById('postSub');
    if (subEl && meta.excerpt) subEl.textContent = meta.excerpt;

    const coverImg = document.getElementById('postCoverImg');
    if (coverImg && meta.cover) {
      coverImg.src = meta.cover;
      coverImg.alt = meta.coverAlt || '';
    }

    const tagEl = document.querySelector('.post-hero__tag');
    if (tagEl && meta.tags) tagEl.textContent = meta.tags.join(' · ');

    const dateEl = document.querySelector('.post-hero__date');
    if (dateEl && meta.date) dateEl.textContent = meta.date;

    if (meta.title) document.title = `${meta.title}, Anurag Mahapatra`;

    const articleEl = document.getElementById('postArticle');
    if (articleEl) {
      articleEl.innerHTML = '';
      articleEl.insertAdjacentHTML('beforeend', bodyHtml);
    }

    if (meta.resources && meta.resources.length) {
      const resourcesHtml = "<div class=\"post-resources\">" +
        "<h3 class=\"post-resources__title\">References & Resources</h3>" +
        "<ul class=\"post-list post-resources__list\">" +
        meta.resources.map(r => "<li><a href=\"" + esc(r.url) + "\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"post-link\" data-cursor=\"expand\">" + esc(r.label) + " <span class=\"arrow\">↗</span></a></li>").join('') +
        "</ul></div>";
      if (articleEl) articleEl.insertAdjacentHTML('beforeend', resourcesHtml);
    }

    if (meta.tags && meta.tags.length) {
      const tagsHtml = "<div class=\"post-tags\">" + meta.tags.map(t => "<span class=\"post-tag-item\">" + esc(t) + "</span>").join('') + "</div>";
      const bottomActions = "<div class=\"post-bottom-actions\">" +
        "<button class=\"post-action-btn post-action-btn--lg\" id=\"bookmarkBtn2\" data-cursor=\"expand\">" +
          "<svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\"><path d=\"M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z\"/></svg>" +
          "ADD TO BOOKMARKS" +
        "</button>" +
        "<button class=\"post-action-btn post-action-btn--lg\" id=\"copyLinkBtn2\" data-cursor=\"expand\">" +
          "<svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\"><path d=\"M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71\"/><path d=\"M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71\"/></svg>" +
          "COPY LINK" +
        "</button>" +
      "</div>";
      if (articleEl) articleEl.insertAdjacentHTML('beforeend', tagsHtml + bottomActions);
    }

    const tocList = document.querySelector('.toc__list');
    if (tocList && tocItems.length) {
      tocList.innerHTML = '';
      tocList.insertAdjacentHTML('beforeend', tocItems.map(h =>
        "<li><a href=\"#" + h.id + "\" class=\"toc__link\" data-cursor=\"expand\">" + esc(h.text) + "</a></li>"
      ).join(''));
    }

    const navEl = document.querySelector('.post-nav');
    const prevEl = document.querySelector('.post-nav__item--prev');
    const nextEl = document.querySelector('.post-nav__item--next');
    const fallbackData = { href: '../pages/blog.html', label: 'Field Notes Archive' };

    if (!meta.prev && !meta.next) {
      if (navEl) navEl.style.gridTemplateColumns = '1fr';
      if (nextEl) nextEl.style.display = 'none';
      if (prevEl) {
        prevEl.href = fallbackData.href;
        const prevTitle = prevEl.querySelector('.post-nav__title');
        if (prevTitle) prevTitle.textContent = fallbackData.label;
        const prevDir = prevEl.querySelector('.post-nav__dir');
        if (prevDir) prevDir.innerHTML = '<span class="arrow">←</span> ALL POSTS';
        prevEl.style.display = '';
        prevEl.style.gridColumn = '1 / -1';
        prevEl.style.alignItems = 'center';
        prevEl.style.textAlign = 'center';
      }
    } else {
      if (navEl) navEl.style.gridTemplateColumns = '';

      if (prevEl) {
        const pData = meta.prev || fallbackData;
        prevEl.href = pData.href;
        const pTitle = prevEl.querySelector('.post-nav__title');
        if (pTitle) pTitle.textContent = pData.label;
        const pDir = prevEl.querySelector('.post-nav__dir');
        if (pDir) pDir.innerHTML = '<span class="arrow">←</span> ' + (meta.prev ? 'PREVIOUS POST' : 'ALL POSTS');
        prevEl.style.display = '';
        prevEl.style.gridColumn = '';
        prevEl.style.alignItems = '';
        prevEl.style.textAlign = '';
      }

      if (nextEl) {
        const nData = meta.next || fallbackData;
        nextEl.href = nData.href;
        const nTitle = nextEl.querySelector('.post-nav__title');
        if (nTitle) nTitle.textContent = nData.label;
        const nDir = nextEl.querySelector('.post-nav__dir');
        if (nDir) nDir.innerHTML = (meta.next ? 'NEXT POST' : 'ALL POSTS') + ' <span class="arrow">→</span>';
        nextEl.style.display = '';
      }
    }
  }

  // Fetch post data based on URL query parameter
  async function loadPost() {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug');
    if (!slug) {
      window.location.href = '../404.html';
      return;
    }

    try {
      const raw = await window.fetchData('posts/' + encodeURIComponent(slug) + '/' + encodeURIComponent(slug) + '.md', 'text', true);

      const { meta, body } = parseFrontmatter(raw);
      const bodyHtml = renderMarkdown(body);
      const tocItems = buildToc(bodyHtml);

      populatePage(meta, bodyHtml, tocItems);

      if (typeof window.__postInit === 'function') {
        window.__postInit();
      }

    } catch (err) {
      console.warn('[post-loader] Could not load post:', err.message);
    } finally {
      if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
      if (typeof window.scrollToHash === 'function') {
        window.scrollToHash();
      }
    }
  }

  loadPost();
})();
