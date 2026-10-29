// Enhanced public site v2 (index_v2.html, index_v3.html): scroll reveals, price count-up, review marquee
// pause and review carousel. Motion only runs when the visitor allows it: html[data-motion] gates every
// animation in site-v2-plus.css, so with reduced motion the page is static and fully visible.
(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduceMotion) document.documentElement.dataset.motion = "on";

  function onVisible(elements, callback, threshold = 0.15) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          callback(entry.target);
        }
      },
      { threshold, rootMargin: "0px 0px -40px 0px" },
    );
    for (const element of elements) observer.observe(element);
  }

  // Reveals: [data-reveal] gains .is-revealed once it scrolls into view.
  function initReveals() {
    const elements = document.querySelectorAll("[data-reveal]");
    if (reduceMotion) return elements.forEach((element) => element.classList.add("is-revealed"));
    onVisible(elements, (element) => element.classList.add("is-revealed"), 0.1);
  }

  // Count-up: [data-count-to="270"] counts from 0 when first seen. The final value is already in the markup.
  function initCounters() {
    if (reduceMotion) return;
    onVisible(document.querySelectorAll("[data-count-to]"), (element) => {
      const target = Number(element.dataset.countTo);
      const prefix = element.dataset.countPrefix || "";
      const duration = 1200;
      const start = performance.now();
      const step = (now) => {
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - (1 - progress) ** 3;
        element.textContent = `${prefix}${Math.round(target * eased)}`;
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, 0.6);
  }

  // Marquee: [data-marquee] with a [data-marquee-toggle] button that pauses and resumes the rows.
  function initMarquees() {
    for (const marquee of document.querySelectorAll("[data-marquee]")) {
      const toggle = marquee.querySelector("[data-marquee-toggle]");
      toggle?.addEventListener("click", () => {
        const paused = marquee.classList.toggle("is-paused");
        toggle.setAttribute("aria-pressed", String(paused));
        toggle.querySelector("span").textContent = paused ? "Play reviews" : "Pause reviews";
        toggle.querySelector("use").setAttribute("href", paused ? "#play" : "#paused");
      });
    }
  }

  // Carousel: [data-carousel] > [data-carousel-track] of slides, [data-carousel-prev|next], dots [data-carousel-dot].
  function initCarousels() {
    for (const carousel of document.querySelectorAll("[data-carousel]")) {
      const track = carousel.querySelector("[data-carousel-track]");
      const slides = [...track.children];
      const dots = [...carousel.querySelectorAll("[data-carousel-dot]")];
      const prev = carousel.querySelector("[data-carousel-prev]");
      const next = carousel.querySelector("[data-carousel-next]");

      const goTo = (index) => {
        const slide = slides[Math.max(0, Math.min(slides.length - 1, index))];
        track.scrollTo({ left: slide.offsetLeft - track.offsetLeft, behavior: reduceMotion ? "auto" : "smooth" });
      };
      const currentIndex = () => {
        const left = track.scrollLeft + track.offsetLeft;
        return slides.reduce((best, slide, i) => (Math.abs(slide.offsetLeft - left) < Math.abs(slides[best].offsetLeft - left) ? i : best), 0);
      };
      const update = () => {
        const index = currentIndex();
        const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
        dots.forEach((dot, i) => dot.setAttribute("aria-current", String(i === index)));
        prev.disabled = index === 0;
        next.disabled = atEnd;
      };

      prev.addEventListener("click", () => goTo(currentIndex() - 1));
      next.addEventListener("click", () => goTo(currentIndex() + 1));
      dots.forEach((dot, i) => dot.addEventListener("click", () => goTo(i)));
      let frame = 0;
      track.addEventListener("scroll", () => { frame ||= requestAnimationFrame(() => { frame = 0; update(); }); }, { passive: true });
      update();
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    initReveals();
    initCounters();
    initMarquees();
    initCarousels();
  });
})();
