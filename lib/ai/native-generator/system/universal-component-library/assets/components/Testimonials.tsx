import React from 'react';
import { Container } from './Container';
import { Card } from './Card';

type TestimonialLayout = 'single-column' | 'card-grid' | 'editorial';

interface Testimonial {
  id: string;
  quote: string;
  name: string;
  role: string;
  company: string;
  avatar?: string;
  rating?: number;
}

interface TestimonialsProps {
  title?: string;
  subtitle?: string;
  testimonials: Testimonial[];
  layout?: TestimonialLayout;
  columns?: 2 | 3;
  className?: string;
}

const layoutMap: Record<TestimonialLayout, { container: string; item: string; quoteSize: string }> = {
  'single-column': {
    container: 'flex flex-col gap-[var(--layout-gap)] max-w-3xl mx-auto',
    item: '',
    quoteSize: 'text-[var(--text-size-h2)]',
  },
  'card-grid': {
    container: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[var(--layout-gap)]',
    item: '',
    quoteSize: 'text-[var(--text-size-body)]',
  },
  'editorial': {
    container: 'grid grid-cols-1 lg:grid-cols-12 gap-[var(--layout-gap)]',
    item: '',
    quoteSize: 'text-[var(--text-size-h2)]',
  },
};

export const Testimonials: React.FC<TestimonialsProps> = ({
  title,
  subtitle,
  testimonials,
  layout = 'card-grid',
  columns = 3,
  className = '',
}) => {
  const layoutClasses = layoutMap[layout];
  const featured = testimonials[0];
  const rest = testimonials.slice(1);

  // Column override for card-grid
  const columnClass = layout === 'card-grid'
    ? `grid-cols-1 md:grid-cols-2 ${columns >= 3 ? 'lg:grid-cols-3' : ''}`
    : '';

  return (
    <section
      className={`
        bg-[var(--color-surface)]
        text-[var(--color-text)]
        udm-section-padding
        ${className}
      `.trim()}
    >
      <Container>
        {/* Header */}
        {(title || subtitle) && (
          <div className="flex flex-col gap-[var(--space-sm)] mb-[var(--space-xl)] text-center">
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
                  mx-auto
                "
              >
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* Testimonials */}
        <div className={layout === 'card-grid' ? columnClass : layoutClasses.container}>
          {layout === 'editorial' && featured && (
            <>
              {/* Featured testimonial */}
              <div className="lg:col-span-7">
                <Card padding="lg" bg="primary" shadow={false} border={false} className="h-full flex flex-col justify-between">
                  <blockquote>
                    <p
                      className={`
                        font-[family-name:var(--font-heading)]
                        ${layoutClasses.quoteSize}
                        leading-[var(--line-height-normal)]
                        text-[var(--color-text-inverse)]
                        italic
                      `}
                    >
                      "{featured.quote}"
                    </p>
                  </blockquote>
                  <div className="flex items-center gap-[var(--space-sm)] mt-[var(--space-lg)]">
                    {featured.avatar && (
                      <img
                        src={featured.avatar}
                        alt={featured.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    )}
                    <div>
                      <p className="font-[family-name:var(--font-heading)] text-[var(--text-size-body)] text-[var(--color-text-inverse)]">
                        {featured.name}
                      </p>
                      <p className="font-[family-name:var(--font-body)] text-[var(--text-size-small)] text-[var(--color-text-inverse)] opacity-70">
                        {featured.role}, {featured.company}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Supporting testimonials */}
              <div className="lg:col-span-5 flex flex-col gap-[var(--layout-gap)]">
                {rest.slice(0, 2).map((t) => (
                  <TestimonialCard key={t.id} testimonial={t} layout={layout} />
                ))}
              </div>

              {/* Additional grid below */}
              {rest.slice(2).length > 0 && (
                <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-[var(--layout-gap)] mt-[var(--layout-gap)]">
                  {rest.slice(2).map((t) => (
                    <TestimonialCard key={t.id} testimonial={t} layout="card-grid" />
                  ))}
                </div>
              )}
            </>
          )}

          {(layout === 'single-column' || layout === 'card-grid') &&
            testimonials.map((t) => (
              <TestimonialCard key={t.id} testimonial={t} layout={layout} />
            ))}
        </div>
      </Container>
    </section>
  );
};

/* ── Individual Testimonial Card ── */
const TestimonialCard: React.FC<{
  testimonial: Testimonial;
  layout: TestimonialLayout;
}> = ({ testimonial, layout }) => {
  const isSingleColumn = layout === 'single-column';
  const isEditorial = layout === 'editorial';
  const isCardGrid = layout === 'card-grid';

  return (
    <Card
      padding={isEditorial ? 'md' : 'lg'}
      bg={isEditorial ? 'surface' : 'background'}
      shadow={true}
      hover={true}
      border={!isEditorial}
      className="h-full flex flex-col"
    >
      {/* Rating */}
      {testimonial.rating !== undefined && (
        <div className="flex gap-1 mb-[var(--space-sm)]">
          {Array.from({ length: 5 }).map((_, i) => (
            <svg
              key={i}
              className={`w-4 h-4 ${i < Math.round(testimonial.rating || 0) ? 'text-[var(--color-accent)]' : 'text-[var(--color-border)]'}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
      )}

      {/* Quote */}
      <blockquote className="flex-1">
        <p
          className={`
            font-[family-name:var(--font-body)]
            ${isSingleColumn ? 'text-[var(--text-size-h2)]' : 'text-[var(--text-size-body)]'}
            ${isSingleColumn ? 'leading-[var(--line-height-normal)]' : 'leading-[var(--line-height-relaxed)]'}
            text-[var(--color-text)]
            italic
          `}
        >
          "{testimonial.quote}"
        </p>
      </blockquote>

      {/* Author */}
      <div className={`flex items-center gap-[var(--space-sm)] ${isCardGrid ? 'mt-[var(--space-md)] pt-[var(--space-md)] border-t border-[var(--color-border)]' : 'mt-[var(--space-lg)]'}`}>
        {testimonial.avatar && (
          <img
            src={testimonial.avatar}
            alt={testimonial.name}
            className="w-10 h-10 rounded-full object-cover"
          />
        )}
        <div>
          <p className="font-[family-name:var(--font-heading)] text-[var(--text-size-body)] text-[var(--color-text)] leading-[var(--line-height-tight)]">
            {testimonial.name}
          </p>
          <p className="font-[family-name:var(--font-body)] text-[var(--text-size-small)] text-[var(--color-text-muted)]">
            {testimonial.role}, {testimonial.company}
          </p>
        </div>
      </div>
    </Card>
  );
};
