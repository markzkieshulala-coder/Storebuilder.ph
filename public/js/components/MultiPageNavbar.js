/**
 * ═══════════════════════════════════════════
 * MULTI-PAGE NAVBAR
 * Maps navigation items to real, separate
 * route locations (e.g. /about, /services, /contact)
 * instead of single-page scroll hashes.
 * ═══════════════════════════════════════════
 */

export class MultiPageNavbar {
  constructor(config = {}) {
    this.brand = config.brand || 'MDX';
    this.brandSubtitle = config.brandSubtitle || '';
    this.routes = config.routes || [];
    this.onNavigate = config.onNavigate || (() => {});
    this.isCompact = config.isCompact ?? false;
    this.transparentAtTop = config.transparentAtTop ?? true;
    this.element = null;
    this.mobileOpen = false;
  }

  render() {
    const nav = document.createElement('nav');
    nav.className = `mdx-nav${this.transparentAtTop ? ' mdx-nav--transparent' : ''}${this.isCompact ? ' mdx-nav--compact' : ''}`;
    this.element = nav;

    /* Brand block */
    const brand = document.createElement('a');
    brand.className = 'mdx-nav__brand';
    brand.href = '/';
    brand.innerHTML = `
      <span class="mdx-nav__brand-mark">${this.brand}</span>
      ${this.brandSubtitle ? `<span class="mdx-nav__brand-sub">${this.brandSubtitle}</span>` : ''}
    `;
    brand.addEventListener('click', (e) => {
      e.preventDefault();
      this.onNavigate('/');
    });

    /* Desktop links */
    const linksWrap = document.createElement('div');
    linksWrap.className = 'mdx-nav__links';

    this.routes.forEach((route, idx) => {
      const link = document.createElement('a');
      link.className = `mdx-nav__link${route.active ? ' mdx-nav__link--active' : ''}`;
      link.href = route.path;
      link.textContent = route.label;
      link.style.animationDelay = `${0.05 * idx}s`;
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.onNavigate(route.path);
      });
      linksWrap.appendChild(link);
    });

    /* Mobile toggle */
    const toggle = document.createElement('button');
    toggle.className = 'mdx-nav__toggle';
    toggle.innerHTML = `<span></span><span></span><span></span>`;
    toggle.setAttribute('aria-label', 'Toggle menu');
    toggle.addEventListener('click', () => this.toggleMobile(nav));

    /* Assemble */
    nav.appendChild(brand);
    nav.appendChild(linksWrap);
    nav.appendChild(toggle);

    /* Scroll behavior */
    if (this.transparentAtTop) {
      this.bindScroll(nav);
    }

    return nav;
  }

  bindScroll(nav) {
    let lastY = 0;
    const threshold = 60;

    const onScroll = () => {
      const y = window.scrollY;
      if (y > threshold) {
        nav.classList.add('mdx-nav--scrolled');
        nav.classList.remove('mdx-nav--transparent');
      } else {
        nav.classList.remove('mdx-nav--scrolled');
        nav.classList.add('mdx-nav--transparent');
      }
      if (y > lastY && y > threshold * 2) {
        nav.classList.add('mdx-nav--hidden');
      } else {
        nav.classList.remove('mdx-nav--hidden');
      }
      lastY = y;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  toggleMobile(nav) {
    this.mobileOpen = !this.mobileOpen;
    nav.classList.toggle('mdx-nav--mobile-open', this.mobileOpen);
    document.body.style.overflow = this.mobileOpen ? 'hidden' : '';
  }

  setActive(path) {
    if (!this.element) return;
    this.element.querySelectorAll('.mdx-nav__link').forEach(link => {
      const href = link.getAttribute('href');
      link.classList.toggle('mdx-nav__link--active', href === path);
    });
  }
}
