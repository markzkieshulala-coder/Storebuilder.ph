/**
 * ═══════════════════════════════════════════
 * CINEMATIC VIEWPORT SHOWCASE MODULE
 * Heavy widescreen imagery layouts with
 * sticky layers and deep scrolling parallax depths.
 * ═══════════════════════════════════════════
 */

export class CinematicViewportShowcase {
  constructor(config = {}) {
    this.heading = config.heading || 'Selected Works';
    this.subheading = config.subheading || '';
    this.slides = config.slides || [];
    this.parallaxIntensity = config.parallaxIntensity ?? 0.4;
  }

  render() {
    const section = document.createElement('section');
    section.className = 'cinematic-showcase section-reveal';
    section.id = 'showcase';

    const header = document.createElement('div');
    header.className = 'cinematic-showcase__header';

    const heading = document.createElement('h2');
    heading.className = 'cinematic-showcase__heading font-gradient';
    heading.textContent = this.heading;
    header.appendChild(heading);

    if (this.subheading) {
      const sub = document.createElement('p');
      sub.className = 'cinematic-showcase__subheading';
      sub.textContent = this.subheading;
      header.appendChild(sub);
    }

    section.appendChild(header);

    /* Widescreen sticky parallax slides */
    const viewport = document.createElement('div');
    viewport.className = 'cinematic-showcase__viewport';

    this.slides.forEach((slide, idx) => {
      const slideEl = this.buildSlide(slide, idx);
      viewport.appendChild(slideEl);
    });

    section.appendChild(viewport);
    this.bindParallax(viewport);
    return section;
  }

  buildSlide(slide, idx) {
    const slideEl = document.createElement('div');
    slideEl.className = 'cinematic-slide';
    slideEl.style.setProperty('--slide-index', idx);

    /* Sticky image layer */
    const visual = document.createElement('div');
    visual.className = 'cinematic-slide__visual';

    const img = document.createElement('img');
    img.className = 'cinematic-slide__img';
    img.src = this.resolveImageUrl(slide.imageKeyword);
    img.alt = slide.imageKeyword || slide.title;
    img.loading = idx === 0 ? 'eager' : 'lazy';

    const imgOverlay = document.createElement('div');
    imgOverlay.className = 'cinematic-slide__img-overlay';

    /* Parallax depth layers */
    const depth1 = document.createElement('div');
    depth1.className = 'cinematic-slide__depth cinematic-slide__depth--back';

    const depth2 = document.createElement('div');
    depth2.className = 'cinematic-slide__depth cinematic-slide__depth--mid';

    const depth3 = document.createElement('div');
    depth3.className = 'cinematic-slide__depth cinematic-slide__depth--front';

    visual.appendChild(depth1);
    visual.appendChild(img);
    visual.appendChild(imgOverlay);
    visual.appendChild(depth2);
    visual.appendChild(depth3);

    /* Text layer */
    const text = document.createElement('div');
    text.className = 'cinematic-slide__text';

    const meta = document.createElement('div');
    meta.className = 'cinematic-slide__meta';
    meta.innerHTML = `<span>${slide.category}</span><span class="cinematic-slide__divider">—</span><span>${slide.year}</span>`;

    const title = document.createElement('h3');
    title.className = 'cinematic-slide__title font-gradient';
    title.textContent = slide.title;

    const desc = document.createElement('p');
    desc.className = 'cinematic-slide__desc';
    desc.textContent = slide.description;

    text.appendChild(meta);
    text.appendChild(title);
    text.appendChild(desc);

    slideEl.appendChild(visual);
    slideEl.appendChild(text);

    return slideEl;
  }

  bindParallax(viewport) {
    const slides = viewport.querySelectorAll('.cinematic-slide');

    const onScroll = () => {
      const vRect = viewport.getBoundingClientRect();
      const vTop = vRect.top;
      const vHeight = vRect.height;

      slides.forEach((slide, idx) => {
        const sRect = slide.getBoundingClientRect();
        const progress = -(vTop - sRect.top) / vHeight;
        const clamped = Math.max(0, Math.min(1, progress));

        const img = slide.querySelector('.cinematic-slide__img');
        const text = slide.querySelector('.cinematic-slide__text');
        const depthBack = slide.querySelector('.cinematic-slide__depth--back');
        const depthMid = slide.querySelector('.cinematic-slide__depth--mid');
        const depthFront = slide.querySelector('.cinematic-slide__depth--front');

        if (img) {
          img.style.transform = `translateY(${clamped * 30 * this.parallaxIntensity}px) scale(${1 + clamped * 0.05})`;
        }
        if (text) {
          text.style.transform = `translateY(${-clamped * 20 * this.parallaxIntensity}px)`;
          text.style.opacity = 0.3 + clamped * 0.7;
        }
        if (depthBack) {
          depthBack.style.transform = `translateY(${clamped * 60 * this.parallaxIntensity}px)`;
        }
        if (depthMid) {
          depthMid.style.transform = `translateY(${clamped * 35 * this.parallaxIntensity}px)`;
        }
        if (depthFront) {
          depthFront.style.transform = `translateY(${clamped * 15 * this.parallaxIntensity}px)`;
        }
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  resolveImageUrl(keyword) {
    if (!keyword) return 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1920&q=80';
    const keywordMap = {
      'luxury-black-marble-product-photography': 'https://images.unsplash.com/photo-1616047006789-b7af5afb8c20?w=1920&q=80',
      'luxury-penthouse-interior-night': 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1920&q=80',
      'luxury-perfume-bottle-gold-dark': 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=1920&q=80',
      'luxury-mechanical-watch-macro-dark': 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=1920&q=80'
    };
    return keywordMap[keyword] || `https://source.unsplash.com/1920x1080/?${encodeURIComponent(keyword)}`;
  }
}
