/**
 * ═══════════════════════════════════════════
 *  MDX — MARCELO DESIGN X LUXURY SYSTEM
 *  Ultra-Premium Website System Generator
 *  ═══════════════════════════════════════════
 */

import { PremiumStyleSheetCompiler } from './components/PremiumStyleSheetCompiler.js';
import { MultiPageNavbar } from './components/MultiPageNavbar.js';
import { InteractiveCanvasHero } from './components/InteractiveCanvasHero.js';
import { InteractiveFeatureGrid } from './components/InteractiveFeatureGrid.js';
import { CinematicViewportShowcase } from './components/CinematicViewportShowcase.js';
import { MinimalistLuxuryFooter } from './components/MinimalistLuxuryFooter.js';

class LuxuryApp {
  constructor() {
    this.container = document.getElementById('app');
    this.currentRoute = window.location.pathname;
    this.router = this.buildRouter();
    this.styleCompiler = new PremiumStyleSheetCompiler();
    this.init();
  }

  init() {
    this.styleCompiler.inject();
    this.handleRoute();
    window.addEventListener('popstate', () => this.handleRoute());
    this.observeSections();
  }

  buildRouter() {
    return {
      '/': () => this.renderHome(),
      '/about': () => this.renderAbout(),
      '/services': () => this.renderServices(),
      '/contact': () => this.renderContact(),
      '/item': () => this.renderItemDetail()
    };
  }

  navigate(path) {
    window.history.pushState({}, '', path);
    this.currentRoute = path;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.handleRoute();
  }

  handleRoute() {
    this.currentRoute = window.location.pathname;
    const routeKey = this.currentRoute === '/' ? '/' : this.currentRoute;
    const handler = this.router[routeKey] || this.router['/'];
    this.container.innerHTML = '';
    handler.call(this);
    this.observeSections();
  }

  observeSections() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.section-reveal').forEach(el => observer.observe(el));
  }

  renderSharedNav(activeRoute) {
    const nav = new MultiPageNavbar({
      brand: 'MDX',
      brandSubtitle: 'Marcelo Design X',
      routes: [
        { label: 'Home', path: '/', active: activeRoute === '/' },
        { label: 'About', path: '/about', active: activeRoute === '/about' },
        { label: 'Services', path: '/services', active: activeRoute === '/services' },
        { label: 'Showcase', path: '/#showcase', active: activeRoute === '/showcase' },
        { label: 'Contact', path: '/contact', active: activeRoute === '/contact' }
      ],
      onNavigate: (path) => {
        if (path.startsWith('/#')) {
          if (window.location.pathname !== '/') {
            this.navigate('/');
            setTimeout(() => {
              const id = path.replace('/#', '');
              const el = document.getElementById(id);
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }, 300);
          } else {
            const id = path.replace('/#', '');
            const el = document.getElementById(id);
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }
        } else {
          this.navigate(path);
        }
      }
    });
    return nav.render();
  }

  renderHome() {
    const nav = this.renderSharedNav('/');
    this.container.appendChild(nav);

    const hero = new InteractiveCanvasHero({
      title: 'Timeless\nLuxury.',
      subtitle: 'Where visionary design meets uncompromising craft. We build digital experiences that transcend the ordinary.',
      ctaPrimary: { label: 'Explore Services', path: '/services' },
      ctaSecondary: { label: 'View Showcase', path: '/#showcase' },
      onNavigate: (path) => this.handleNav(path),
      imageKeyword: 'luxury-architecture-interior-minimal'
    });
    this.container.appendChild(hero.render());

    const features = new InteractiveFeatureGrid({
      heading: 'Bespoke Capabilities',
      subheading: 'Every project is a singular work — engineered for distinction.',
      items: [
        {
          title: 'Brand Architecture',
          description: 'Identity systems that resonate across every touchpoint, built on strategic foundations and visual precision.',
          imageKeyword: 'luxury-brand-identity-monogram',
          link: '/item?slug=brand-architecture'
        },
        {
          title: 'Digital Environments',
          description: 'Immersive web experiences engineered with cinematic pacing, 3D spatial depth, and pixel-perfect execution.',
          imageKeyword: 'futuristic-digital-interface-dark',
          link: '/item?slug=digital-environments'
        },
        {
          title: 'Motion Direction',
          description: 'Kinetic storytelling that transforms static narratives into living, breathing visual experiences.',
          imageKeyword: 'abstract-motion-graphics-gold-dark',
          link: '/item?slug=motion-direction'
        },
        {
          title: 'Spatial Design',
          description: 'Three-dimensional brand worlds — from exhibition spaces to virtual showrooms that defy physical limits.',
          imageKeyword: 'luxury-exhibition-space-minimal',
          link: '/item?slug=spatial-design'
        },
        {
          title: 'Art Direction',
          description: 'Curated visual narratives that elevate product, people, and place into iconic cultural moments.',
          imageKeyword: 'fashion-editorial-dark-gold',
          link: '/item?slug=art-direction'
        },
        {
          title: 'Sound & Atmosphere',
          description: 'Sonic identities and ambient scoring that complete the sensorial envelope of every experience.',
          imageKeyword: 'luxury-audio-studio-minimal',
          link: '/item?slug=sound-atmosphere'
        }
      ],
      onNavigate: (path) => this.handleNav(path)
    });
    this.container.appendChild(features.render());

    const showcase = new CinematicViewportShowcase({
      heading: 'Selected Works',
      subheading: 'A curated portfolio of singular achievements in luxury design.',
      slides: [
        {
          title: 'The Obsidian Collection',
          category: 'Brand Identity',
          year: '2025',
          imageKeyword: 'luxury-black-marble-product-photography',
          description: 'A complete identity system for a private aviation concierge — from logotype to livery design.'
        },
        {
          title: 'Nocturne Residences',
          category: 'Digital Experience',
          year: '2024',
          imageKeyword: 'luxury-penthouse-interior-night',
          description: 'An immersive digital platform for ultra-luxury real estate in the world\'s most coveted addresses.'
        },
        {
          title: 'Aurelia Parfums',
          category: 'Art Direction',
          year: '2024',
          imageKeyword: 'luxury-perfume-bottle-gold-dark',
          description: 'Campaign visual direction for a heritage fragrance house launching its first unisex line.'
        },
        {
          title: 'Meridian Watch Co.',
          category: 'Motion & Film',
          year:          '2023',
          imageKeyword: 'luxury-mechanical-watch-macro-dark',
          description: 'Cinematic launch film for a limited edition timepiece — 150 hours of micro-photography distilled into 90 seconds.'
        }
      ]
    });
    this.container.appendChild(showcase.render());

    const footer = new MinimalistLuxuryFooter({
      sitemap: [
        {
          title: 'Navigate',
          links: [
            { label: 'Home', path: '/' },
            { label: 'About', path: '/about' },
            { label: 'Services', path: '/services' },
            { label: 'Contact', path: '/contact' }
          ]
        },
        {
          title: 'Services',
          links: [
            { label: 'Brand Architecture', path: '/item?slug=brand-architecture' },
            { label: 'Digital Environments', path: '/item?slug=digital-environments' },
            { label: 'Motion Direction', path: '/item?slug=motion-direction' },
            { label: 'Spatial Design', path: '/item?slug=spatial-design' }
          ]
        },
        {
          title: 'Studio',
          links: [
            { label: 'Careers', path: '/about' },
            { label: 'Press', path: '/about' },
            { label: 'Journal', path: '/about' },
            { label: 'Privacy', path: '/about' }
          ]
        }
      ],
      tagline: 'Crafted without compromise. Designed for eternity.',
      onNavigate: (path) => this.handleNav(path)
    });
    this.container.appendChild(footer.render());

    document.body.appendChild(document.createElement('div')).className = 'grain-overlay';
  }

  renderAbout() {
    const nav = this.renderSharedNav('/about');
    this.container.appendChild(nav);

    const page = document.createElement('div');
    page.className = 'page page-about';
    page.innerHTML = `
      <section class="page-hero section-reveal">
        <div class="page-hero__bg">
          <img src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1920&q=80" alt="luxury-minimal-studio-interior" class="page-hero__image" />
          <div class="page-hero__overlay"></div>
        </div>
        <div class="page-hero__content">
          <span class="page-hero__eyebrow">The Studio</span>
          <h1 class="page-hero__title font-gradient">Precision.<br>Patience.<br>Purpose.</h1>
          <p class="page-hero__text">Marcelo Design X is a luxury creative studio operating at the intersection of design, technology, and cultural craft. Every engagement is treated as a singular commission — built from first principles, refined through relentless iteration, and delivered with uncompromising fidelity.</p>
        </div>
      </section>
      <section class="page-section section-reveal">
        <div class="page-section__inner">
          <h2 class="page-section__heading font-gradient">Philosophy</h2>
          <div class="philosophy-grid">
            <div class="philosophy-card">
              <span class="philosophy-card__num">01</span>
              <h3>Radical Restraint</h3>
              <p>We believe the most powerful statements are made through precision and elimination. Every element earns its place.</p>
            </div>
            <div class="philosophy-card">
              <span class="philosophy-card__num">02</span>
              <h3>Sensorial Depth</h3>
              <p>Great design engages all senses — the weight of type, the rhythm of motion, the temperature of color.</p>
            </div>
            <div class="philosophy-card">
              <span class="philosophy-card__num">03</span>
              <h3>Enduring Relevance</h3>
              <p>We build for decades, not quarters. Our work is designed to mature gracefully, growing richer with time.</p>
            </div>
          </div>
        </div>
      </section>
    `;
    this.container.appendChild(page);

    const footer = new MinimalistLuxuryFooter({
      sitemap: [
        { title: 'Navigate', links: [{ label: 'Home', path: '/' }, { label: 'Services', path: '/services' }, { label: 'Contact', path: '/contact' }] },
        { title: 'Services', links: [{ label: 'Brand Architecture', path: '/item?slug=brand-architecture' }, { label: 'Digital Environments', path: '/item?slug=digital-environments' }] },
        { title: 'Studio', links: [{ label: 'Careers', path: '/about' }, { label: 'Press', path: '/about' }] }
      ],
      tagline: 'Crafted without compromise.',
      onNavigate: (path) => this.handleNav(path)
    });
    this.container.appendChild(footer.render());
  }

  renderServices() {
    const nav = this.renderSharedNav('/services');
    this.container.appendChild(nav);

    const page = document.createElement('div');
    page.className = 'page page-services';
    page.innerHTML = `
      <section class="page-hero section-reveal">
        <div class="page-hero__bg">
          <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1920&q=80" alt="luxury-creative-workspace-dark" class="page-hero__image" />
          <div class="page-hero__overlay"></div>
        </div>
        <div class="page-hero__content">
          <span class="page-hero__eyebrow">Capabilities</span>
          <h1 class="page-hero__title font-gradient">Comprehensive<br>Excellence.</h1>
          <p class="page-hero__text">Six disciplines. One unified vision. Our services are structured as modular capabilities that can be engaged individually or orchestrated as a complete creative system.</p>
        </div>
      </section>
      <section class="page-section section-reveal">
        <div class="page-section__inner">
          <div class="services-list">
            <div class="service-item">
              <span class="service-item__num">001</span>
              <div class="service-item__content">
                <h3>Brand Architecture</h3>
                <p>Identity systems, naming, voice, and visual strategy built from strategic foundations up.</p>
              </div>
              <a href="/item?slug=brand-architecture" data-nav class="service-item__link">Explore →</a>
            </div>
            <div class="service-item">
              <span class="service-item__num">002</span>
              <div class="service-item__content">
                <h3>Digital Environments</h3>
                <p>Immersive web experiences with cinematic pacing and 3D spatial depth.</p>
              </div>
              <a href="/item?slug=digital-environments" data-nav class="service-item__link">Explore →</a>
            </div>
            <div class="service-item">
              <span class="service-item__num">003</span>
              <div class="service-item__content">
                <h3>Motion Direction</h3>
                <p>Kinetic storytelling that transforms narratives into living visual experiences.</p>
              </div>
              <a href="/item?slug=motion-direction" data-nav class="service-item__link">Explore →</a>
            </div>
            <div class="service-item">
              <span class="service-item__num">004</span>
              <div class="service-item__content">
                <h3>Spatial Design</h3>
                <p>Three-dimensional brand worlds for exhibitions and virtual showrooms.</p>
              </div>
              <a href="/item?slug=spatial-design" data-nav class="service-item__link">Explore →</a>
            </div>
          </div>
        </div>
      </section>
    `;
    this.container.appendChild(page);

    page.querySelectorAll('[data-nav]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigate(link.getAttribute('href'));
      });
    });

    const footer = new MinimalistLuxuryFooter({
      sitemap: [
        { title: 'Navigate', links: [{ label: 'Home', path: '/' }, { label: 'About', path: '/about' }, { label: 'Contact', path: '/contact' }] },
        { title: 'Services', links: [{ label: 'Brand Architecture', path: '/item?slug=brand-architecture' }, { label: 'Digital Environments', path: '/item?slug=digital-environments' }] },
        { title: 'Studio', links: [{ label: 'Careers', path: '/about' }] }
      ],
      tagline: 'Designed for eternity.',
      onNavigate: (path) => this.handleNav(path)
    });
    this.container.appendChild(footer.render());
  }

  renderContact() {
    const nav = this.renderSharedNav('/contact');
    this.container.appendChild(nav);

    const page = document.createElement('div');
    page.className = 'page page-contact';
    page.innerHTML = `
      <section class="page-hero section-reveal">
        <div class="page-hero__bg">
          <img src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&q=80" alt="luxury-minimal-office-interior" class="page-hero__image" />
          <div class="page-hero__overlay"></div>
        </div>
        <div class="page-hero__content">
          <span class="page-hero__eyebrow">Initiate</span>
          <h1 class="page-hero__title font-gradient">Begin a<br>Conversation.</h1>
          <p class="page-hero__text">Every extraordinary partnership begins with a single exchange. We respond to all inquiries within 24 hours.</p>
        </div>
      </section>
      <section class="page-section section-reveal">
        <div class="page-section__inner contact-layout">
          <div class="contact-info">
            <h2 class="contact-info__heading font-gradient">Direct Channels</h2>
            <div class="contact-channel">
              <span class="contact-channel__label">New Business</span>
              <a href="mailto:studio@marcelodesignx.com" class="contact-channel__value">studio@marcelodesignx.com</a>
            </div>
            <div class="contact-channel">
              <span class="contact-channel__label">Press & Media</span>
              <a href="mailto:press@marcelodesignx.com" class="contact-channel__value">press@marcelodesignx.com</a>
            </div>
            <div class="contact-channel">
              <span class="contact-channel__label">Careers</span>
              <a href="mailto:careers@marcelodesignx.com" class="contact-channel__value">careers@marcelodesignx.com</a>
            </div>
          </div>
          <form class="contact-form glow-ambient">
            <div class="contact-form__field">
              <input type="text" placeholder="Name" class="contact-form__input" />
            </div>
            <div class="contact-form__field">
              <input type="email" placeholder="Email" class="contact-form__input" />
            </div>
            <div class="contact-form__field">
              <select class="contact-form__input">
                <option>Inquiry Type</option>
                <option>New Project</option>
                <option>Collaboration</option>
                <option>Press</option>
                <option>Other</option>
              </select>
            </div>
            <div class="contact-form__field">
              <textarea placeholder="Tell us about your vision..." rows="5" class="contact-form__input"></textarea>
            </div>
            <button type="submit" class="btn-luxury btn-luxury-filled">Send Inquiry</button>
          </form>
        </div>
      </section>
    `;
    this.container.appendChild(page);

    const footer = new MinimalistLuxuryFooter({
      sitemap: [
        { title: 'Navigate', links: [{ label: 'Home', path: '/' }, { label: 'About', path: '/about' }, { label: 'Services', path: '/services' }] },
        { title: 'Services', links: [{ label: 'Brand Architecture', path: '/item?slug=brand-architecture' }, { label: 'Digital Environments', path: '/item?slug=digital-environments' }] },
        { title: 'Studio', links: [{ label: 'Careers', path: '/about' }, { label: 'Press', path: '/about' }] }
      ],
      tagline: 'Crafted without compromise.',
      onNavigate: (path) => this.handleNav(path)
    });
    this.container.appendChild(footer.render());
  }

  renderItemDetail() {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug') || 'brand-architecture';

    const itemData = {
      'brand-architecture': {
        title: 'Brand Architecture',
        category: 'Strategic Identity',
        description: 'Identity systems that resonate across every touchpoint, built on strategic foundations and visual precision. We craft logotypes, color systems, typography hierarchies, and comprehensive brand guidelines that serve as the blueprint for every expression of your brand.',
        imageKeyword: 'luxury-brand-identity-monogram',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1600&q=80'
      },
      'digital-environments': {
        title: 'Digital Environments',
        category: 'Immersive Web',
        description: 'Immersive web experiences engineered with cinematic pacing, 3D spatial depth, and pixel-perfect execution. Our digital environments blur the line between interface and installation, creating memorable journeys that captivate and convert.',
        imageKeyword: 'futuristic-digital-interface-dark',
        image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1600&q=80'
      },
      'motion-direction': {
        title: 'Motion Direction',
        category: 'Kinetic Storytelling',
        description: 'Kinetic storytelling that transforms static narratives into living, breathing visual experiences. From micro-interactions to cinematic brand films, motion is the emotional language that brings your story to life.',
        imageKeyword: 'abstract-motion-graphics-gold-dark',
        image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1600&q=80'
      },
      'spatial-design': {
        title: 'Spatial Design',
        category: '3D Brand Worlds',
        description: 'Three-dimensional brand worlds — from exhibition spaces to virtual showrooms that defy physical limits. We design environments that surround your audience, creating immersive contexts where brand and experience become indistinguishable.',
        imageKeyword: 'luxury-exhibition-space-minimal',
        image: 'https://images.unsplash.com/photo-1600607686527-6fb886090705?w=1600&q=80'
      },
      'art-direction': {
        title: 'Art Direction',
        category: 'Visual Curation',
        description: 'Curated visual narratives that elevate product, people, and place into iconic cultural moments. Our art direction ensures every image, every frame, every composition serves the larger story with intention and elegance.',
        imageKeyword: 'fashion-editorial-dark-gold',
        image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1600&q=80'
      },
      'sound-atmosphere': {
        title: 'Sound & Atmosphere',
        category: 'Sonic Identity',
        description: 'Sonic identities and ambient scoring that complete the sensorial envelope of every experience. From logo mnemonics to full environmental soundscapes, we design audio that resonates at a subconscious level.',
        imageKeyword: 'luxury-audio-studio-minimal',
        image: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1600&q=80'
      }
    }[slug] || itemData['brand-architecture'];

    const nav = this.renderSharedNav('/services');
    this.container.appendChild(nav);

    const page = document.createElement('div');
    page.className = 'page page-item';
    page.innerHTML = `
      <section class="page-hero section-reveal">
        <div class="page-hero__bg">
          <img src="${itemData.image}" alt="${itemData.imageKeyword}" class="page-hero__image" />
          <div class="page-hero__overlay"></div>
        </div>
        <div class="page-hero__content">
          <span class="page-hero__eyebrow">${itemData.category}</span>
          <h1 class="page-hero__title font-gradient">${itemData.title}</h1>
          <p class="page-hero__text">${itemData.description}</p>
          <a href="/services" data-nav class="btn-luxury" style="margin-top:2rem;">← All Services</a>
        </div>
      </section>
    `;
    this.container.appendChild(page);

    page.querySelectorAll('[data-nav]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigate(link.getAttribute('href'));
      });
    });

    const footer = new MinimalistLuxuryFooter({
      sitemap: [
        { title: 'Navigate', links: [{ label: 'Home', path: '/' }, { label: 'About', path: '/about' }, { label: 'Services', path: '/services' }] },
        { title: 'Services', links: [{ label: 'Brand Architecture', path: '/item?slug=brand-architecture' }, { label: 'Digital Environments', path: '/item?slug=digital-environments' }] },
        { title: 'Studio', links: [{ label: 'Careers', path: '/about' }] }
      ],
      tagline: 'Crafted without compromise.',
      onNavigate: (path) => this.handleNav(path)
    });
    this.container.appendChild(footer.render());
  }

  handleNav(path) {
    if (path.startsWith('/#')) {
      if (window.location.pathname !== '/') {
        this.navigate('/');
        setTimeout(() => {
          const id = path.replace('/#', '');
          const el = document.getElementById(id);
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 300);
      } else {
        const id = path.replace('/#', '');
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      this.navigate(path);
    }
  }
}

new LuxuryApp();
