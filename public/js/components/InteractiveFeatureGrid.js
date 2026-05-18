/**
 * ═══════════════════════════════════════════
 * INTERACTIVE FEATURE GRID MODULE
 * Product/service cards with premium lighting/
 * blur micro-animations on hover and unique
 * links routing to separate item description pages.
 * ═══════════════════════════════════════════
 */

export class InteractiveFeatureGrid {
  constructor(config = {}) {
    this.heading = config.heading || 'Capabilities';
    this.subheading = config.subheading || '';
    this.items = config.items || [];
    this.columns = config.columns ?? 3;
    this.onNavigate = config.onNavigate || (() => {});
    this.gap = config.gap ?? '1.5rem';
  }

  render() {
    const section = document.createElement('section');
    section.className = 'feature-grid section-reveal';
    section.id = 'services';

    const header = document.createElement('div');
    header.className = 'feature-grid__header';

    const heading = document.createElement('h2');
    heading.className = 'feature-grid__heading font-gradient';
    heading.textContent = this.heading;

    header.appendChild(heading);

    if (this.subheading) {
      const sub = document.createElement('p');
      sub.className = 'feature-grid__subheading';
      sub.textContent = this.subheading;
      header.appendChild(sub);
    }

    const grid = document.createElement('div');
    grid.className = 'feature-grid__grid';
    grid.style.setProperty('--grid-columns', this.columns);
    grid.style.setProperty('--grid-gap', this.gap);

    this.items.forEach((item, idx) => {
      const card = this.buildCard(item, idx);
      grid.appendChild(card);
    });

    section.appendChild(header);
    section.appendChild(grid);
    return section;
  }

  buildCard(item, idx) {
    const card = document.createElement('a');
    card.className = 'feature-card';
    card.href = item.link || '#';
    card.style.setProperty('--card-index', idx);

    /* Image with premium keyword context */
    const imgWrap = document.createElement('div');
    imgWrap.className = 'feature-card__visual';

    const img = document.createElement('img');
    img.className = 'feature-card__img';
    img.src = this.resolveImageUrl(item.imageKeyword);
    img.alt = item.imageKeyword || item.title;
    img.loading = 'lazy';

    const imgOverlay = document.createElement('div');
    imgOverlay.className = 'feature-card__img-overlay';

    /* Lighting layer for hover */
    const lighting = document.createElement('div');
    lighting.className = 'feature-card__lighting';

    imgWrap.appendChild(img);
    imgWrap.appendChild(imgOverlay);
    imgWrap.appendChild(lighting);

    /* Content */
    const body = document.createElement('div');
    body.className = 'feature-card__body';

    const title = document.createElement('h3');
    title.className = 'feature-card__title';
    title.textContent = item.title;

    const desc = document.createElement('p');
    desc.className = 'feature-card__desc';
    desc.textContent = item.description;

    const arrow = document.createElement('span');
    arrow.className = 'feature-card__arrow';
    arrow.innerHTML = '→';

    body.appendChild(title);
    body.appendChild(desc);
    body.appendChild(arrow);

    card.appendChild(imgWrap);
    card.appendChild(body);

    card.addEventListener('click', (e) => {
      e.preventDefault();
      this.onNavigate(item.link);
    });

    /* Premium hover micro-animations */
    card.addEventListener('mouseenter', () => {
      card.classList.add('feature-card--hover');
      this.animateLighting(lighting, 'in');
    });

    card.addEventListener('mouseleave', () => {
      card.classList.remove('feature-card--hover');
      this.animateLighting(lighting, 'out');
    });

    return card;
  }

  animateLighting(el, direction) {
    if (direction === 'in') {
      el.style.opacity = '1';
      el.style.transform = 'scale(1.5)';
    } else {
      el.style.opacity = '0';
      el.style.transform = 'scale(1)';
    }
  }

  resolveImageUrl(keyword) {
    if (!keyword) return 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800&q=80';
    const keywordMap = {
      'luxury-brand-identity-monogram': 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&q=80',
      'futuristic-digital-interface-dark': 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&q=80',
      'abstract-motion-graphics-gold-dark': 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80',
      'luxury-exhibition-space-minimal': 'https://images.unsplash.com/photo-1600607686527-6fb886090705?w=800&q=80',
      'fashion-editorial-dark-gold': 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&q=80',
      'luxury-audio-studio-minimal': 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&q=80'
    };
    return keywordMap[keyword] || `https://source.unsplash.com/800x600/?${encodeURIComponent(keyword)}`;
  }
}
