export const MOCK_WEBSITE_JSON = {
  name: "Ethica",
  type: "STORE",
  seoTitle: "Ethica — Premium Sustainable Footwear Philippines",
  seoDesc:
    "Discover Ethica's collection of premium sustainable shoes. Handcrafted in the Philippines, designed for the conscious consumer.",
  fonts: {
    heading: "Playfair Display",
    body: "Syne",
  },
  colors: {
    primary: "#1a1a2e",
    secondary: "#c9a84c",
    accent: "#e8d5b7",
    background: "#0d0d1a",
    text: "#f5f0e8",
  },
  sections: [
    {
      id: "nav-1",
      type: "nav",
      data: {
        logo: "ETHICA",
        logoSubtext: "est. 2019",
        links: [
          { label: "Collection", href: "#products" },
          { label: "Our Story", href: "#about" },
          { label: "Sustainability", href: "#features" },
          { label: "Contact", href: "#contact" },
        ],
        ctaText: "Shop Now",
        ctaHref: "#products",
        transparent: true,
        showCart: true,
      },
      styles: {
        background: "transparent",
        textColor: "#f5f0e8",
      },
    },
    {
      id: "hero-1",
      type: "hero",
      data: {
        variant: "fullscreen",
        headline: "Walk with Purpose.",
        subheadline: "Premium sustainable footwear crafted for the modern Filipino.",
        description:
          "Every pair tells a story of responsible craftsmanship. Made with ethically sourced materials, built to last a lifetime.",
        ctaPrimary: { text: "Explore Collection", href: "#products" },
        ctaSecondary: { text: "Our Story", href: "#about" },
        backgroundImage:
          "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1600&q=80",
        overlay: "rgba(13, 13, 26, 0.7)",
        badge: "New AW25 Collection",
      },
      styles: {
        background: "#0d0d1a",
        textColor: "#f5f0e8",
        minHeight: "100vh",
      },
    },
    {
      id: "features-1",
      type: "features",
      data: {
        headline: "Crafted with Conviction",
        subheadline: "Every decision we make has a purpose",
        features: [
          {
            icon: "leaf",
            title: "Sustainably Sourced",
            description:
              "All materials are ethically sourced from certified suppliers across Southeast Asia.",
          },
          {
            icon: "hand",
            title: "Handcrafted Quality",
            description:
              "Each pair is hand-stitched by master craftsmen in our Marikina workshop.",
          },
          {
            icon: "recycle",
            title: "Zero Waste Process",
            description:
              "We repurpose 95% of all material waste. Our packaging is 100% biodegradable.",
          },
          {
            icon: "heart",
            title: "Fair Wages Always",
            description:
              "Every artisan earns 40% above minimum wage. We believe in dignified work.",
          },
          {
            icon: "shield",
            title: "Lifetime Repair",
            description:
              "Bring your worn Ethica shoes back and we'll repair them for free. Forever.",
          },
          {
            icon: "star",
            title: "B-Corp Certified",
            description:
              "Independently verified to meet the highest standards of social and environmental performance.",
          },
        ],
      },
      styles: {
        background: "#12122a",
        textColor: "#f5f0e8",
        accentColor: "#c9a84c",
      },
    },
    {
      id: "products-1",
      type: "products",
      data: {
        headline: "The Collection",
        subheadline: "AW25 — Walk Lightly",
        categories: ["All", "Men", "Women", "Unisex"],
        products: [
          {
            id: "p1",
            name: "The Marikina Classic",
            price: 4850,
            originalPrice: 6200,
            category: "Unisex",
            image:
              "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=600&q=80",
            badge: "Best Seller",
            description: "Our iconic oxford, reimagined in vegetable-tanned leather.",
            colors: ["#1a1a2e", "#8B7355", "#2d5a27"],
            sizes: [36, 37, 38, 39, 40, 41, 42, 43, 44, 45],
          },
          {
            id: "p2",
            name: "Luna Slip-On",
            price: 3600,
            category: "Women",
            image:
              "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&q=80",
            badge: "New",
            description: "Effortless elegance in recycled canvas and cork sole.",
            colors: ["#c9a84c", "#f5f0e8", "#1a1a2e"],
            sizes: [35, 36, 37, 38, 39, 40, 41],
          },
          {
            id: "p3",
            name: "Dune Chelsea Boot",
            price: 6200,
            category: "Men",
            image:
              "https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=600&q=80",
            description: "Built for the city. Made for the earth.",
            colors: ["#3d2b1f", "#1a1a2e"],
            sizes: [39, 40, 41, 42, 43, 44, 45],
          },
          {
            id: "p4",
            name: "Sol Sandal",
            price: 2800,
            category: "Unisex",
            image:
              "https://images.unsplash.com/photo-1603487742131-4160ec999306?w=600&q=80",
            badge: "Eco Pick",
            description: "Handwoven straps, natural rubber sole. Pure summer.",
            colors: ["#c9a84c", "#8B7355"],
            sizes: [35, 36, 37, 38, 39, 40, 41, 42, 43],
          },
          {
            id: "p5",
            name: "Alto Runner",
            price: 5400,
            category: "Unisex",
            image:
              "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80",
            description: "Performance meets sustainability. Recycled mesh upper.",
            colors: ["#f5f0e8", "#1a1a2e", "#2d5a27"],
            sizes: [36, 37, 38, 39, 40, 41, 42, 43, 44, 45],
          },
          {
            id: "p6",
            name: "Selva Mule",
            price: 3200,
            category: "Women",
            image:
              "https://images.unsplash.com/photo-1612902688026-2c3f87c50a06?w=600&q=80",
            badge: "Limited",
            description: "Limited edition. Hand-painted botanical motif.",
            colors: ["#f5f0e8"],
            sizes: [35, 36, 37, 38, 39, 40],
          },
        ],
      },
      styles: {
        background: "#0d0d1a",
        textColor: "#f5f0e8",
        accentColor: "#c9a84c",
      },
    },
    {
      id: "about-1",
      type: "about",
      data: {
        headline: "Born in Marikina, Made for the World",
        story:
          "In 2019, Maria Santos returned from Milan with one mission: prove that Philippine craftsmanship can compete on a global stage — without sacrificing the environment or the people who make it possible.\n\nEthica was born in a 40sqm workshop in Marikina, the shoe capital of the Philippines. Today, we employ 34 artisans, all earning living wages, all proud of the work they create.\n\nWe believe a shoe should last decades, not seasons. We believe beauty and ethics are not opposites. We believe in the power of Filipino hands.",
        image:
          "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1000&q=80",
        stats: [
          { value: "34", label: "Artisans employed" },
          { value: "₱0", label: "Waste to landfill" },
          { value: "6", label: "Years of craft" },
          { value: "40%", label: "Above min wage" },
        ],
        founderName: "Maria Santos",
        founderTitle: "Founder & Creative Director",
        founderImage:
          "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80",
      },
      styles: {
        background: "#12122a",
        textColor: "#f5f0e8",
        accentColor: "#c9a84c",
      },
    },
    {
      id: "testimonials-1",
      type: "testimonials",
      data: {
        headline: "What Our Community Says",
        testimonials: [
          {
            name: "Andrea Reyes",
            location: "BGC, Manila",
            rating: 5,
            text: "I've had my Marikina Classics for 3 years now. They've been resoled once and they look better than ever. Best investment I've made.",
            image:
              "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80",
            verified: true,
          },
          {
            name: "James Villanueva",
            location: "Cebu City",
            rating: 5,
            text: "Finally a Filipino brand I'm genuinely proud to wear abroad. People in Singapore kept asking where I got my shoes.",
            image:
              "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80",
            verified: true,
          },
          {
            name: "Camille Ong",
            location: "Quezon City",
            rating: 5,
            text: "The Luna Slip-Ons are my everyday shoe now. Light, beautiful, and knowing they're sustainable makes them even better.",
            image:
              "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80",
            verified: true,
          },
          {
            name: "Marco Dela Cruz",
            location: "Makati",
            rating: 5,
            text: "Bought the Dune Chelsea for a business trip. Got compliments every single day. Solid quality, zero guilt.",
            image:
              "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80",
            verified: true,
          },
        ],
      },
      styles: {
        background: "#0d0d1a",
        textColor: "#f5f0e8",
        accentColor: "#c9a84c",
      },
    },
    {
      id: "newsletter-1",
      type: "newsletter",
      data: {
        headline: "Join the Movement",
        subheadline:
          "Be the first to know about new collections, artisan stories, and sustainable living tips.",
        placeholder: "Your email address",
        ctaText: "Subscribe",
        incentive: "Get ₱500 off your first order",
        privacy: "We respect your privacy. No spam, ever.",
      },
      styles: {
        background: "linear-gradient(135deg, #1a1a2e 0%, #2d1b4e 100%)",
        textColor: "#f5f0e8",
        accentColor: "#c9a84c",
      },
    },
    {
      id: "footer-1",
      type: "footer",
      data: {
        logo: "ETHICA",
        tagline: "Walk with Purpose.",
        links: {
          Shop: [
            { label: "Men's Collection", href: "#" },
            { label: "Women's Collection", href: "#" },
            { label: "New Arrivals", href: "#" },
            { label: "Sale", href: "#" },
          ],
          Company: [
            { label: "Our Story", href: "#" },
            { label: "Sustainability", href: "#" },
            { label: "Artisans", href: "#" },
            { label: "Careers", href: "#" },
          ],
          Support: [
            { label: "Size Guide", href: "#" },
            { label: "Shipping & Returns", href: "#" },
            { label: "Lifetime Repair", href: "#" },
            { label: "Contact Us", href: "#" },
          ],
        },
        social: {
          instagram: "@ethica.ph",
          facebook: "Ethica Philippines",
          tiktok: "@ethica.ph",
        },
        contact: {
          address: "123 Sumulong Highway, Marikina City, Metro Manila",
          email: "hello@ethica.ph",
          phone: "+63 917 123 4567",
        },
        copyright: "© 2025 Ethica Philippines. All rights reserved.",
        paymentMethods: ["gcash", "maya", "visa", "mastercard"],
      },
      styles: {
        background: "#080814",
        textColor: "#f5f0e8",
        accentColor: "#c9a84c",
      },
    },
  ],
};
