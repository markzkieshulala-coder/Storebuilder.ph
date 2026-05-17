# Output Project Template

The final deployable bundle structure and file contents.

---

## Directory Tree

```
my-website/
├── package.json
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── postcss.config.js
├── .gitignore
├── .env.local                  # Optional: API keys, image domains
├── README.md                   # Deployment instructions
├── public/
│   ├── favicon.ico
│   └── og-image.jpg           # Generated from ACM assets
├── app/
│   ├── layout.tsx             # Root layout: Nav, Footer, globals.css
│   ├── globals.css            # Generated from UDM tokens
│   ├── page.tsx               # Home page
│   ├── about/
│   │   └── page.tsx
│   ├── products/
│   │   └── page.tsx
│   ├── contact/
│   │   └── page.tsx
│   └── not-found.tsx          # 404 page
├── src/
│   ├── components/
│   │   ├── Nav.tsx
│   │   ├── Footer.tsx
│   │   ├── Hero.tsx
│   │   ├── ProductGrid.tsx
│   │   ├── Gallery.tsx
│   │   ├── Testimonials.tsx
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Container.tsx
│   │   ├── CtaSection.tsx
│   │   ├── FeaturesGrid.tsx
│   │   ├── PricingTiers.tsx
│   │   ├── ContactForm.tsx
│   │   └── LogoCloud.tsx
│   ├── data/
│   │   ├── udm.json           # Universal Design Manifest
│   │   ├── acm.json           # Asset + Copy Manifest
│   │   └── layout-tree.json  # Layout hierarchy
│   └── lib/
│       └── utils.ts           # cn() utility, helper functions
└── components.json            # shadcn/ui config (if used)
```

---

## File Templates

### package.json
```json
{
  "name": "generated-website",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

### tailwind.config.js
```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

### postcss.config.js
```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### tsconfig.json
```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### next.config.js
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['images.unsplash.com', 'cdn.example.com'],
  },
};
module.exports = nextConfig;
```

### app/layout.tsx
```tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Nav } from '../src/components/Nav';
import { Footer } from '../src/components/Footer';
import udm from '../src/data/udm.json';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: udm.intent.brand_name,
  description: udm.niche_requirements.seo?.default_description,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-density={udm.resolved_tokens.spacing.density}
      className={inter.variable}
    >
      <body className="bg-[var(--color-background)] text-[var(--color-text)] antialiased">
        <Nav />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
```

### app/globals.css

The `globals.css` is entirely generated from the UDM. See `universal-component-library/assets/globals.css` for the template. The compiler replaces all fallback values with actual UDM tokens.

### app/page.tsx

See `code-generation-patterns.md` for the full home page template.

### app/not-found.tsx
```tsx
import { Container } from '../src/components/Container';
import { Button } from '../src/components/Button';

export default function NotFound() {
  return (
    <Container className="py-[var(--space-3xl)] text-center">
      <h1 className="font-[family-name:var(--font-heading)] text-[var(--text-size-hero)] text-[var(--color-text)]">
        404
      </h1>
      <p className="font-[family-name:var(--font-body)] text-[var(--text-size-body)] text-[var(--color-text-muted)] mt-[var(--space-md)]">
        Page not found
      </p>
      <Button variant="primary" href="/" className="mt-[var(--space-lg)]">
        Go Home
      </Button>
    </Container>
  );
}
```

---

## Additional Generated Components

### Nav.tsx (generated from UDM navigation)
- Logo: text or image based on `design_dna.branding`
- Links: from `udm.navigation.links`
- CTA: from `niche_requirements.component_rules.nav_cta`
- Mobile: hamburger with slide-out panel
- Sticky: controlled by `layout.nav_behavior`

### Footer.tsx (generated from UDM footer requirements)
- Columns: brand, links, contact, social
- Links: from `niche_requirements.footer.links`
- Copyright: auto-generated year + brand name

### CtaSection.tsx
- Centered headline + subheadline + dual CTAs
- Contrasting background (uses `color-surface` or `color-primary`)

### FeaturesGrid.tsx
- 2-4 column grid of icon + headline + body cards
- Icons: inline SVGs, never emojis

### PricingTiers.tsx
- 2-4 tiered cards with feature lists
- Highlighted "recommended" tier

### ContactForm.tsx
- Name, email, message fields
- Styled with UDM form tokens

### LogoCloud.tsx
- Horizontal row of partner/client logos
- Grayscale filter, hover color

---

## Deployment

### Vercel (recommended for Next.js)
```bash
npm i -g vercel
vercel --prod
```

### Static Export
```bash
# next.config.js
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
};

npm run build
# Output in ./dist/
```

### Netlify
Drag `./dist/` folder to Netlify deploy UI, or use Netlify CLI.

### README.md Content
```markdown
# Generated Website

## Getting Started
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

## Deploy
- Vercel: `vercel --prod`
- Netlify: drag `dist/` folder
- Static: `npm run build` then serve `dist/`

## Customization
Edit `src/data/udm.json` to update design tokens.
Edit `src/data/acm.json` to update content and assets.
```
