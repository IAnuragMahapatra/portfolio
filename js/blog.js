const initBlogPage = () => {
  if (!document.querySelector('.blog-hero')) return;

  gsap.fromTo('.blog-title',
    { opacity: 0, y: 30 },
    { opacity: 1, y: 0, duration: 1, ease: "power4.out", delay: 0.3 }
  );

  gsap.fromTo('.blog-sub',
    { opacity: 0 },
    { opacity: 0.4, duration: 0.8, ease: "power2.out", delay: 0.6 }
  );

  gsap.utils.toArray('.blog-post').forEach((post, i) => {
    gsap.fromTo(post,
      { opacity: 0, y: 20 },
      {
        opacity: 1, y: 0,
        duration: 0.6,
        ease: "power3.out",
        scrollTrigger: {
          trigger: post,
          start: "top 90%",
          toggleActions: "play none none none"
        }
      }
    );
  });
};


document.addEventListener('DOMContentLoaded', () => {
  initBlogPage();
});