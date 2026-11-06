/**
 * ASIRI Motion — microinteracciones y scroll narrativo con GSAP 3.15 / ScrollTrigger.
 * Enhancement progresivo: el sitio sigue siendo completamente usable si falla la CDN.
 * La animación se omite cuando el visitante prefiere movimiento reducido.
 */
(() => {
  'use strict';
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!gsap || !ScrollTrigger || reduceMotion) {
    document.documentElement.classList.add('motion-static');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  gsap.config({ nullTargetWarn: false });
  gsap.defaults({ ease: 'power3.out' });
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const narrow = window.matchMedia('(max-width: 767px)').matches;
  const T = { short: 0.4, medium: 0.7, slow: 1.05 };

  // Intro editorial: secuencia sutil para la marca, el titular y la ilustración.
  const intro = gsap.timeline({ defaults: { duration: T.medium, ease: 'power3.out' } });
  intro
    .fromTo('.site-header .logo', { autoAlpha: 0, y: -13 }, { autoAlpha: 1, y: 0, duration: 0.65 })
    .fromTo('.hero-copy .eyebrow', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0 }, '-=0.27')
    .fromTo('.hero-copy h1', { autoAlpha: 0, y: 32 }, { autoAlpha: 1, y: 0, duration: 0.95 }, '-=0.4')
    .fromTo('.hero-copy > p', { autoAlpha: 0, y: 21 }, { autoAlpha: 1, y: 0 }, '-=0.62')
    .fromTo('.hero-actions > *', { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, stagger: 0.11, duration: 0.56 }, '-=0.46')
    .fromTo('.hero-note', { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.5 }, '-=0.35')
    .fromTo('.hero-visual > img', { autoAlpha: 0, scale: 1.07, y: 24 }, { autoAlpha: 1, scale: 1, y: 0, duration: 1.25, ease: 'power2.out' }, 0.14)
    .fromTo('.floating-sticker', { autoAlpha: 0, scale: 0.7, rotation: -3 }, { autoAlpha: 1, scale: 1, rotation: 12, duration: 0.88, ease: 'back.out(1.35)' }, 0.65)
    .fromTo('.hero-visual-label', { autoAlpha: 0, x: 18 }, { autoAlpha: 1, x: 0, duration: 0.6 }, 0.85);

  intro.eventCallback('onComplete', () => {
    gsap.to('.floating-sticker', {
      y: -8,
      rotation: 16,
      repeat: -1,
      yoyo: true,
      duration: 2.65,
      ease: 'sine.inOut',
    });
  });

  // Parallax ligero, sin secuestrar el desplazamiento nativo.
  if (!narrow) {
    gsap.to('.hero-visual > img', {
      yPercent: 9,
      ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.65 },
    });
  }

  // Barra editorial de progreso; no crea trabajo adicional entre scrolls.
  const progress = $('#scrollProgress');
  if (progress) {
    gsap.set(progress, { transformOrigin: 'left center', scaleX: 0 });
    ScrollTrigger.create({
      start: 0,
      end: () => Math.max(1, document.documentElement.scrollHeight - window.innerHeight),
      onUpdate: self => gsap.set(progress, { scaleX: self.progress }),
    });
  }

  function reveal(trigger, targets, options = {}) {
    if (!$(trigger)) return;
    gsap.fromTo(targets,
      { autoAlpha: 0, y: options.y ?? 28 },
      {
        autoAlpha: 1,
        y: 0,
        duration: options.duration ?? T.medium,
        stagger: options.stagger ?? 0.09,
        ease: 'power3.out',
        clearProps: 'transform,opacity,visibility',
        scrollTrigger: { trigger, start: options.start ?? 'top 86%', once: true },
      }
    );
  }

  reveal('.features-grid', '.feature', { y: 18, stagger: 0.09, duration: 0.65, start: 'top 94%' });
  reveal('.categories .section-header', '.categories .section-kicker, .categories .section-header > *', { stagger: 0.1 });
  reveal('.category-grid', '.category-card', { y: 34, stagger: 0.105, duration: 0.72 });
  reveal('.products-section .section-header', '.products-section .section-kicker, .products-section .section-header > *', { stagger: 0.1 });
  reveal('.statement', '.statement-visual, .statement-copy > *', { y: 27, stagger: 0.1, start: 'top 82%', duration: 0.7 });
  reveal('.newsletter', '.newsletter-inner > *', { y: 22, stagger: 0.14, duration: 0.75 });

  // El catálogo se renderiza en JS; al buscar o filtrar, se anima la lista nueva.
  const grid = $('#productsGrid');
  let gridEntered = false;
  let catalogAnimation;
  const animateCards = () => {
    const cards = $$('.product-card', grid);
    if (!cards.length) return;
    if (catalogAnimation) catalogAnimation.kill();
    // Si todavía no hemos alcanzado el catálogo, los ítems esperan al ScrollTrigger.
    if (!gridEntered) return;
    catalogAnimation = gsap.fromTo(cards,
      { autoAlpha: 0, y: 20, scale: 0.98 },
      { autoAlpha: 1, y: 0, scale: 1, stagger: 0.055, duration: 0.54, ease: 'power2.out', clearProps: 'transform,opacity,visibility' }
    );
  };
  if (grid) {
    ScrollTrigger.create({
      trigger: grid,
      start: 'top 89%',
      once: true,
      onEnter: () => { gridEntered = true; animateCards(); },
    });
    const observer = new MutationObserver(() => {
      if (gridEntered) animateCards();
      ScrollTrigger.refresh(true);
    });
    observer.observe(grid, { childList: true });
  }

  // Respuestas táctiles en tarjetas (accesibles también mediante focus).
  $$('.category-card').forEach(card => {
    const art = $('.category-art > span', card);
    if (!art) return;
    const lift = () => gsap.to(art, { y: -9, rotation: 7, scale: 1.08, duration: 0.4, overwrite: 'auto' });
    const reset = () => gsap.to(art, { y: 0, rotation: 0, scale: 1, duration: 0.48, overwrite: 'auto' });
    card.addEventListener('pointerenter', lift);
    card.addEventListener('pointerleave', reset);
    card.addEventListener('focus', lift);
    card.addEventListener('blur', reset);
  });

  // La insignia del carrito reacciona a cambios de cantidad.
  const cartCount = $('#cartCount');
  if (cartCount) {
    const badgeObserver = new MutationObserver(() => {
      gsap.fromTo(cartCount,
        { scale: 0.68 },
        { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)', overwrite: 'auto', clearProps: 'transform' }
      );
    });
    badgeObserver.observe(cartCount, { childList: true, characterData: true, subtree: true });
  }

  grid?.addEventListener('click', event => {
    const add = event.target.closest('[data-add]');
    if (!add) return;
    gsap.fromTo(add, { scale: 0.8 }, { scale: 1, duration: 0.48, ease: 'back.out(2.5)', clearProps: 'transform' });
  });

  // Contenido de overlays: GSAP anima los elementos interiores; CSS mantiene
  // los estados y el bloqueo de foco establecidos por app.js.
  const drawer = $('#cartDrawer');
  const productModal = $('#productModal');
  if (drawer) {
    new MutationObserver(() => {
      if (drawer.classList.contains('visible')) {
        gsap.fromTo('.drawer-header > *, .drawer-footer > *', { autoAlpha: 0, y: 12 }, {
          autoAlpha: 1, y: 0, stagger: 0.07, duration: 0.43, clearProps: 'transform,opacity,visibility',
        });
        const lines = $$('.cart-line', drawer);
        if (lines.length) gsap.fromTo(lines, { autoAlpha: 0, x: 16 }, { autoAlpha: 1, x: 0, stagger: 0.07, duration: 0.44, clearProps: 'transform,opacity,visibility' });
      }
    }).observe(drawer, { attributes: true, attributeFilter: ['class'] });
  }
  if (productModal) {
    new MutationObserver(() => {
      if (!productModal.classList.contains('visible')) return;
      gsap.fromTo('.modal-content > *', { autoAlpha: 0, y: 14 }, {
        autoAlpha: 1, y: 0, stagger: 0.09, duration: 0.54, clearProps: 'transform,opacity,visibility',
      });
    }).observe(productModal, { attributes: true, attributeFilter: ['class'] });
  }

  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
