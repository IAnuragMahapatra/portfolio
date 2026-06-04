function init404() {
  if (typeof gsap === "undefined") return;

  const layers = document.querySelectorAll(".not-found__layer");
  const cascade = document.querySelector(".not-found__cascade");
  const btn = document.querySelector(".not-found__btn");
  const msg = document.querySelector(".not-found__msg");

  gsap.set(layers, { opacity: 0, scale: 0.8 });
  gsap.set(msg, { opacity: 0, y: 20 });
  gsap.set(btn, { opacity: 0, y: 20 });

  const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
  
  layers.forEach((layer, i) => {
    if (i === 0) return;
    gsap.set(layer, { opacity: Math.max(0.04, 1 - (i * 0.18)) });
  });

  tl.to(layers, {
    opacity: (i) => (i === 0 ? 1 : Math.max(0.04, 1 - (i * 0.18))),
    scale: 1,
    duration: 2,
    stagger: 0.1,
  })
  .to(msg, { opacity: 0.8, y: 0, duration: 1.5 }, "-=1.5")
  .to(btn, { opacity: 1, y: 0, duration: 1.5 }, "-=1.3");

  // Mouse parallax effect
  let mouseX = 0;
  let mouseY = 0;
  let targetX = 0;
  let targetY = 0;
  
  window.addEventListener("mousemove", (e) => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = (e.clientY / window.innerHeight) * 2 - 1;
  });

  gsap.ticker.add(() => {
    targetX += (mouseX - targetX) * 0.08;
    targetY += (mouseY - targetY) * 0.08;

    layers.forEach((layer, i) => {
      const depth = i * 20; 
      const moveX = targetX * depth;
      const moveY = targetY * depth;
      
      gsap.set(layer, {
        x: -moveX,
        y: -moveY
      });
    });
  });

  // Text scramble effect on hover
  if (msg && cascade) {
    const originalText = msg.innerText;
    const chars = "!<>-_\\/[]{}—=+*^?#_";
    
    cascade.addEventListener("mouseenter", () => {
      let iteration = 0;
      const maxIterations = 15;
      
      if (msg.scrambleInterval) clearInterval(msg.scrambleInterval);
      
      msg.scrambleInterval = setInterval(() => {
        msg.innerText = originalText.split("").map((letter, index) => {
          if (index < iteration || letter === " " || letter === "\n") {
            return originalText.charAt(index);
          }
          return chars.charAt(Math.floor(Math.random() * chars.length));
        }).join("");
        
        if (iteration >= originalText.length) {
          clearInterval(msg.scrambleInterval);
        }
        
        iteration += originalText.length / maxIterations;
      }, 30);
    });
  }

  if (window.revealPage) window.revealPage();
}

document.addEventListener("DOMContentLoaded", init404);

window.reinitPage = function() {
  init404();
};
