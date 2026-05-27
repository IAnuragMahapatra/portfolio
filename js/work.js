const initProjectShowcase = () => {
  const rows = document.querySelectorAll('.project-row');
  if (!rows.length) return;

  rows.forEach((row) => {
    const imgMask = row.querySelector('.project-img-mask');
    const img = row.querySelector('.project-img');
    const info = row.querySelector('.project-info');

    const isReversed = row.classList.contains('is-reversed');
    const insetStart = isReversed ? "inset(0 0 0 100%)" : "inset(0 100% 0 0)";

    if (imgMask) {
      gsap.from(imgMask, {
        scrollTrigger: {
          trigger: row,
          start: "top 85%",
        },
        clipPath: insetStart,
        duration: 1.2,
        ease: "power3.inOut"
      });
    }

    if (img) {
      gsap.fromTo(img,
        { yPercent: -15 },
        {
          yPercent: 15,
          ease: "none",
          scrollTrigger: {
            trigger: row,
            start: "top bottom",
            end: "bottom top",
            scrub: true
          }
        }
      );
    }

    if (info) {
      const details = info.querySelector('.project-details');
      const header = info.querySelector('.project-header');
      const elementsToStagger = [header, ...(details ? Array.from(details.children) : [])].filter(Boolean);

      gsap.from(elementsToStagger, {
        scrollTrigger: {
          trigger: row,
          start: "top 75%",
        },
        y: 30,
        opacity: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: "power3.out"
      });
    }
  });
};

document.addEventListener('workDataLoaded', () => {
  // Initialize animations after work-loader injects the showcase
  initProjectShowcase();
});