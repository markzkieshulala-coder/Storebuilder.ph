/**
 * ═══════════════════════════════════════════
 * INTERACTIVE CANVAS HERO MODULE
 * Large 3D-viewport backdrop canvas with
 * high-impact text layouts and distinct
 * landing page buttons routing to sub-pages.
 * ═══════════════════════════════════════════
 */

export class InteractiveCanvasHero {
  constructor(config = {}) {
    this.title = config.title || 'Luxury\nRedefined.';
    this.subtitle = config.subtitle || 'Experience design that transcends the ordinary.';
    this.ctaPrimary = config.ctaPrimary || { label: 'Explore', path: '/services' };
    this.ctaSecondary = config.ctaSecondary || { label: 'Discover', path: '/about' };
    this.onNavigate = config.onNavigate || (() => {});
    this.imageKeyword = config.imageKeyword || 'luxury-architecture-interior-minimal';
    this.canvasDensity = config.canvasDensity ?? 0.7;
    this.particleCount = config.particleCount ?? 80;
  }

  render() {
    const section = document.createElement('section');
    section.className = 'hero-canvas';

    /* 3D-viewport backdrop canvas */
    const canvasWrap = document.createElement('div');
    canvasWrap.className = 'hero-canvas__viewport';

    const canvas = document.createElement('canvas');
    canvas.className = 'hero-canvas__backdrop';
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    const imgBg = document.createElement('img');
    imgBg.className = 'hero-canvas__bg-img';
    imgBg.src = `https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1920&q=80`;
    imgBg.alt = this.imageKeyword;

    const overlay = document.createElement('div');
    overlay.className = 'hero-canvas__overlay';

    canvasWrap.appendChild(imgBg);
    canvasWrap.appendChild(canvas);
    canvasWrap.appendChild(overlay);

    /* Content */
    const content = document.createElement('div');
    content.className = 'hero-canvas__content';

    const eyebrow = document.createElement('span');
    eyebrow.className = 'hero-canvas__eyebrow';
    eyebrow.textContent = 'MARCELO DESIGN X';

    const title = document.createElement('h1');
    title.className = 'hero-canvas__title font-gradient-hero float-depth';
    title.innerHTML = this.title.replace(/\n/g, '<br>');

    const subtitle = document.createElement('p');
    subtitle.className = 'hero-canvas__subtitle';
    subtitle.textContent = this.subtitle;

    const actions = document.createElement('div');
    actions.className = 'hero-canvas__actions';

    const btnPrimary = document.createElement('button');
    btnPrimary.className = 'btn-luxury btn-luxury-filled';
    btnPrimary.textContent = this.ctaPrimary.label;
    btnPrimary.addEventListener('click', () => this.onNavigate(this.ctaPrimary.path));

    const btnSecondary = document.createElement('button');
    btnSecondary.className = 'btn-luxury';
    btnSecondary.textContent = this.ctaSecondary.label;
    btnSecondary.addEventListener('click', () => this.onNavigate(this.ctaSecondary.path));

    actions.appendChild(btnPrimary);
    actions.appendChild(btnSecondary);

    content.appendChild(eyebrow);
    content.appendChild(title);
    content.appendChild(subtitle);
    content.appendChild(actions);

    section.appendChild(canvasWrap);
    section.appendChild(content);

    /* Init canvas after mount */
    requestAnimationFrame(() => this.initCanvas(canvas));

    return section;
  }

  initCanvas(canvas) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      this.ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    this.particles = [];
    const w = canvas.parentElement.offsetWidth;
    const h = canvas.parentElement.offsetHeight;
    const count = Math.floor(this.particleCount * this.canvasDensity);

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 2 + 0.5,
        dx: (Math.random() - 0.5) * 0.3,
        dy: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.5 + 0.2,
        pulseSpeed: Math.random() * 0.02 + 0.005,
        pulseOffset: Math.random() * Math.PI * 2
      });
    }

    let frame = 0;
    let running = true;

    const draw = () => {
      if (!running) return;
      frame++;
      const w = canvas.parentElement.offsetWidth;
      const h = canvas.parentElement.offsetHeight;
      this.ctx.clearRect(0, 0, w, h);

      this.particles.forEach(p => {
        p.x += p.dx;
        p.y += p.dy;

        if (p.x < 0 || p.x > w) p.dx *= -1;
        if (p.y < 0 || p.y > h) p.dy *= -1;

        const pulse = Math.sin(frame * p.pulseSpeed + p.pulseOffset) * 0.3 + 0.7;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.r * pulse, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(201,169,110,${p.opacity * pulse})`;
        this.ctx.fill();
      });

      /* Connect nearby particles with faint lines */
      for (let i = 0; i < this.particles.length; i++) {
        for (let j = i + 1; j < this.particles.length; j++) {
          const dx = this.particles[i].x - this.particles[j].x;
          const dy = this.particles[i].y - this.particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
            this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
            this.ctx.strokeStyle = `rgba(201,169,110,${0.06 * (1 - dist / 120)})`;
            this.ctx.lineWidth = 0.5;
            this.ctx.stroke();
          }
        }
      }

      requestAnimationFrame(draw);
    };

    draw();

    /* Cleanup on section removal */
    const observer = new MutationObserver(mutations => {
      mutations.forEach(m => {
        m.removedNodes.forEach(node => {
          if (node === canvas || (node.contains && node.contains(canvas))) {
            running = false;
            observer.disconnect();
          }
        });
      });
    });
    if (canvas.parentElement) {
      observer.observe(canvas.parentElement.parentElement || document.body, { childList: true, subtree: true });
    }
  }
}
