/**
 * ═══════════════════════════════════════════
 * MINIMALIST LUXURY FOOTER MODULE
 * Expansive multi-page site map structure
 * linked via distinct page paths.
 * ═══════════════════════════════════════════
 */

export class MinimalistLuxuryFooter {
  constructor(config = {}) {
    this.sitemap = config.sitemap || [];
    this.tagline = config.tagline || 'Crafted without compromise.';
    this.copyright = config.copyright || `© ${new Date().getFullYear()} Marcelo Design X. All rights reserved.`;
    this.onNavigate = config.onNavigate || (() => {});
    this.socials = config.socials || [];
  }

  render() {
    const footer = document.createElement('footer');
    footer.className = 'mdx-footer';

    /* Top section: sitemap + brand */
    const top = document.createElement('div');
    top.className = 'mdx-footer__top';

    const sitemapWrap = document.createElement('div');
    sitemapWrap.className = 'mdx-footer__sitemap';

    this.sitemap.forEach(column => {
      const col = document.createElement('div');
      col.className = 'mdx-footer__col';

      const title = document.createElement('h4');
      title.className = 'mdx-footer__col-title';
      title.textContent = column.title;

      const list = document.createElement('ul');
      list.className = 'mdx-footer__col-list';

      column.links.forEach(link => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.className = 'mdx-footer__col-link';
        a.href = link.path;
        a.textContent = link.label;
        a.addEventListener('click', (e) => {
          e.preventDefault();
          this.onNavigate(link.path);
        });
        li.appendChild(a);
        list.appendChild(li);
      });

      col.appendChild(title);
      col.appendChild(list);
      sitemapWrap.appendChild(col);
    });

    /* Brand side */
    const brand = document.createElement('div');
    brand.className = 'mdx-footer__brand';

    const brandMark = document.createElement('span');
    brandMark.className = 'mdx-footer__brand-mark';
    brandMark.textContent = 'MDX';

    const brandTagline = document.createElement('p');
    brandTagline.className = 'mdx-footer__brand-tagline';
    brandTagline.textContent = this.tagline;

    brand.appendChild(brandMark);
    brand.appendChild(brandTagline);

    top.appendChild(sitemapWrap);
    top.appendChild(brand);

    /* Bottom bar */
    const bottom = document.createElement('div');
    bottom.className = 'mdx-footer__bottom';

    const copy = document.createElement('span');
    copy.className = 'mdx-footer__copy';
    copy.textContent = this.copyright;

    const socialWrap = document.createElement('div');
    socialWrap.className = 'mdx-footer__socials';

    if (this.socials.length) {
      this.socials.forEach(s => {
        const a = document.createElement('a');
        a.className = 'mdx-footer__social';
        a.href = s.url;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = s.label;
        socialWrap.appendChild(a);
      });
    } else {
      ['Instagram', 'LinkedIn', 'Behance'].forEach(label => {
        const a = document.createElement('a');
        a.className = 'mdx-footer__social';
        a.href = '#';
        a.textContent = label;
        socialWrap.appendChild(a);
      });
    }

    bottom.appendChild(copy);
    bottom.appendChild(socialWrap);

    /* Decorative line */
    const line = document.createElement('div');
    line.className = 'mdx-footer__line';

    footer.appendChild(line);
    footer.appendChild(top);
    footer.appendChild(bottom);

    return footer;
  }
}
