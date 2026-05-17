import React from 'react';
import { Container } from './Container';
import { Card } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';

type GridRhythm = 'card-grid' | 'masonry' | 'bento';

interface Product {
  id: string;
  name: string;
  description?: string;
  price?: string;
  originalPrice?: string;
  image: string;
  imageAlt: string;
  badge?: string;
  badgeVariant?: 'default' | 'accent' | 'outline';
  rating?: number;
  ratingCount?: number;
  ctaText?: string;
  ctaHref?: string;
}

interface ProductGridProps {
  title?: string;
  subtitle?: string;
  products: Product[];
  rhythm?: GridRhythm;
  columns?: 2 | 3 | 4;
  className?: string;
  ctaText?: string;
  ctaHref?: string;
}

const rhythmMap: Record<GridRhythm, string> = {
  'card-grid': 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  'masonry': 'columns-1 sm:columns-2 lg:columns-3 xl:columns-4',
  'bento': 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 auto-rows-[minmax(280px,auto)]',
};

const bentoSpan = (index: number) => {
  const spans = ['sm:col-span-2 sm:row-span-2', '', '', '', 'sm:col-span-2', 'sm:row-span-2', '', ''];
  return spans[index % spans.length] || '';
};

export const ProductGrid: React.FC<ProductGridProps> = ({
  title,
  subtitle,
  products,
  rhythm = 'card-grid',
  columns = 4,
  className = '',
  ctaText,
  ctaHref,
}) => {
  // Override columns if explicitly specified (only for card-grid)
  const columnClass = rhythm === 'card-grid'
    ? `grid-cols-1 sm:grid-cols-2 ${columns >= 3 ? 'lg:grid-cols-3' : ''} ${columns >= 4 ? 'xl:grid-cols-4' : ''}`
    : rhythmMap[rhythm];

  return (
    <section
      className={`
        bg-[var(--color-background)]
        text-[var(--color-text)]
        udm-section-padding
        ${className}
      `.trim()}
    >
      <Container>
        {/* Header */}
        {(title || subtitle) && (
          <div className="flex flex-col gap-[var(--space-sm)] mb-[var(--space-xl)]">
            {title && (
              <h2
                className="
                  font-[family-name:var(--font-heading)]
                  text-[var(--text-size-h1)]
                  leading-[var(--line-height-tight)]
                  tracking-[var(--letter-spacing-tight)]
                  text-[var(--color-text)]
                "
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p
                className="
                  font-[family-name:var(--font-body)]
                  text-[var(--text-size-body)]
                  text-[var(--color-text-muted)]
                  max-w-2xl
                "
              >
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* Grid */}
        <div className={`${columnClass} gap-[var(--layout-gap)]`}>
          {products.map((product, index) => {
            const isBentoFeatured = rhythm === 'bento' && (index % 8 === 0);
            const bentoClass = rhythm === 'bento' ? bentoSpan(index) : '';

            return (
              <div
                key={product.id}
                className={`${rhythm === 'masonry' ? 'break-inside-avoid mb-[var(--layout-gap)]' : ''} ${bentoClass}`}
              >
                <Card
                  padding="none"
                  bg="background"
                  shadow={true}
                  hover={true}
                  border={true}
                  interactive={!!product.ctaHref}
                  className={`h-full flex flex-col ${rhythm === 'masonry' ? 'mb-0' : ''}`}
                >
                  {/* Image */}
                  <div
                    className={`
                      relative
                      overflow-hidden
                      ${isBentoFeatured ? 'aspect-[4/3]' : 'aspect-square'}
                    `}
                  >
                    <img
                      src={product.image}
                      alt={product.imageAlt}
                      className="w-full h-full object-cover udm-transition group-hover:scale-105"
                      loading="lazy"
                    />
                    {product.badge && (
                      <div className="absolute top-[var(--space-sm)] left-[var(--space-sm)]">
                        <Badge variant={product.badgeVariant || 'accent'} size="sm">
                          {product.badge}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex flex-col gap-[var(--space-xs)] p-[var(--card-padding)] flex-1">
                    <h3
                      className="
                        font-[family-name:var(--font-heading)]
                        text-[var(--text-size-h3)]
                        leading-[var(--line-height-tight)]
                        text-[var(--color-text)]
                      "
                    >
                      {product.name}
                    </h3>
                    {product.description && (
                      <p
                        className="
                          font-[family-name:var(--font-body)]
                          text-[var(--text-size-body)]
                          text-[var(--color-text-muted)]
                          line-clamp-2
                        "
                      >
                        {product.description}
                      </p>
                    )}

                    {/* Rating */}
                    {product.rating !== undefined && (
                      <div className="flex items-center gap-[var(--space-xs)]">
                        <div className="flex">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <svg
                              key={i}
                              className={`w-4 h-4 ${i < Math.round(product.rating || 0) ? 'text-[var(--color-accent)]' : 'text-[var(--color-border)]'}`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                        {product.ratingCount && (
                          <span className="text-[var(--text-size-small)] text-[var(--color-text-muted)]">
                            ({product.ratingCount})
                          </span>
                        )}
                      </div>
                    )}

                    {/* Price + CTA */}
                    <div className="flex items-center justify-between mt-auto pt-[var(--space-sm)]">
                      <div className="flex items-center gap-[var(--space-xs)]">
                        {product.price && (
                          <span className="font-[family-name:var(--font-heading)] text-[var(--text-size-h3)] text-[var(--color-text)]">
                            {product.price}
                          </span>
                        )}
                        {product.originalPrice && (
                          <span className="font-[family-name:var(--font-body)] text-[var(--text-size-small)] text-[var(--color-text-muted)] line-through">
                            {product.originalPrice}
                          </span>
                        )}
                      </div>
                      {product.ctaText && product.ctaHref && (
                        <Button variant="primary" size="sm" href={product.ctaHref}>
                          {product.ctaText}
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        {ctaText && ctaHref && (
          <div className="flex justify-center mt-[var(--space-xl)]">
            <Button variant="secondary" size="md" href={ctaHref}>
              {ctaText}
            </Button>
          </div>
        )}
      </Container>
    </section>
  );
};
