// Populates the home page dynamic sections (works accordion, skills stack, latest writing)

(function () {
  'use strict';

  function esc(str) {
    const d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
  }

  async function loadHomeData() {
    try {
      const [works, skills, allPosts] = await Promise.all([
        window.fetchData('works.json', 'json', false).catch(err => {
          window.renderErrorBoundary('#workAccordion', 'Project catalogue is temporarily unavailable.');
          return null;
        }),
        window.fetchData('skills.json', 'json', false).catch(err => {
          window.renderErrorBoundary('#stackGrid', 'Skills data is temporarily unavailable.');
          return null;
        }),
        window.fetchData('posts.json', 'json', false).catch(err => {
          window.renderErrorBoundary('.writing-grid', 'Writing feed is temporarily unavailable.');
          return null;
        })
      ]);

      if (works) {
        const workAccordion = document.getElementById('workAccordion');
        if (workAccordion) {
          const featuredWorks = works.filter(function(w) { return w.featured === true; });

          const sectionMeta = document.querySelector('#work .section-meta');
          if (sectionMeta && featuredWorks.length > 0) {
            sectionMeta.textContent = '01\u201300' + featuredWorks.length;
          }

          featuredWorks.forEach(function(work) {
            const stackList = work.stack.map(function(s) { return "<li>" + esc(s) + "</li>"; }).join('');
            const githubLink = work.github ? "<a href=\"" + esc(work.github) + "\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"proj-link\" data-cursor=\"expand\">GitHub</a>" : '';
            const liveLink = work.live ? "<a href=\"" + esc(work.live) + "\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"proj-link\" data-cursor=\"expand\">Live Demo</a>" : '';
            const blogLink = work.blog ? "<a href=\"" + esc(work.blog) + "\" class=\"proj-link\" data-cursor=\"expand\">Read Notes</a>" : '';
            const linksHtml = (githubLink || liveLink || blogLink) ? "<div class=\"proj-links\">" + githubLink + liveLink + blogLink + "</div>" : '';

            const html = "<div class=\"accordion-item\" data-cursor=\"expand\">" +
              "<div class=\"accordion-header\">" +
                "<span class=\"proj-num\">" + esc(work.id) + "</span>" +
                "<h3 class=\"proj-name\">" + esc(work.name) + "</h3>" +
                "<span class=\"proj-tag\">" + esc(work.tag) + "</span>" +
              "</div>" +
              "<div class=\"accordion-body\">" +
                "<div class=\"accordion-inner\">" +
                  "<div class=\"proj-text\">" +
                    "<p>" + esc(work.description) + "</p>" +
                    "<ul class=\"proj-stack\">" + stackList + "</ul>" +
                    linksHtml +
                  "</div>" +
                  "<div class=\"proj-img-wrap\">" +
                    "<img src=\"" + esc(work.image) + "\" alt=\"" + esc(work.imageAlt) + "\" class=\"proj-img\" loading=\"lazy\">" +
                    "<div class=\"proj-img-mask\"></div>" +
                  "</div>" +
                "</div>" +
              "</div>" +
            "</div>";
            workAccordion.insertAdjacentHTML('beforeend', html);
          });
        }
      }

      if (skills) {
        const stackGrid = document.getElementById('stackGrid');
        if (stackGrid) {
          skills.forEach(function(skill, index) {
            const items = skill.items.map(function(item) { return "<span style=\"white-space: nowrap;\">" + esc(item) + "</span>"; }).join('<span class="stack-divider">/</span> ');
            const num = String(index + 1).padStart(2, '0');
            const html = "<div class=\"stack-row\" data-cursor=\"expand\">" +
              "<div class=\"stack-cat-wrapper\">" +
                "<span class=\"stack-num\">" + num + "</span>" +
                "<h3 class=\"stack-cat\">" + esc(skill.category) + "</h3>" +
              "</div>" +
              "<div class=\"stack-items\">" + items + "</div>" +
            "</div>";
            stackGrid.insertAdjacentHTML('beforeend', html);
          });
        }
      }

      if (allPosts) {
        const writingGrid = document.querySelector('.writing-grid');
        if (writingGrid) {
          const latest = allPosts
            .filter(function(p) { return p.status === 'published'; })
            .sort(function(a, b) { return new Date(b.date) - new Date(a.date); })
            .slice(0, 3);

          writingGrid.innerHTML = '';
          latest.forEach(function(post, i) {
            const isFeatured = i === 0;
            const featuredClass = isFeatured ? ' writing-item--featured' : '';
            const tag = (post.tags || []).join(' · ');
            const dateObj = new Date(post.date);
            const dateStr = dateObj.getFullYear() + '.' + String(dateObj.getMonth() + 1).padStart(2, '0');

            const excerptHtml = isFeatured
              ? "<p class=\"writing-excerpt\">" + esc(post.excerpt) + "</p>" +
                "<div class=\"writing-read\">READ ARTICLE <span class=\"arrow\">\u2192</span></div>"
              : '';

            const html = "<a href=\"pages/post.html?slug=" + esc(post.slug) + "\" class=\"writing-item" + featuredClass + "\" data-cursor=\"expand\">" +
              "<div class=\"writing-meta\">" +
                "<span class=\"writing-date\">" + esc(dateStr) + "</span>" +
                "<span class=\"writing-tag\">" + esc(tag) + "</span>" +
              "</div>" +
              "<h3 class=\"writing-title\">" + esc(post.title) + "</h3>" +
              excerptHtml +
            "</a>";

            writingGrid.insertAdjacentHTML('beforeend', html);
          });
        }
      }
    } catch (err) {
      console.error('[home-loader] Failed to load portfolio data:', err);
    } finally {
      // Fire an event to let home.js know it can safely bind DOM animations
      document.dispatchEvent(new Event('homeDataLoaded'));
      if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
      if (typeof window.scrollToHash === 'function') {
        window.scrollToHash();
      }
    }
  }

  loadHomeData();
})();
