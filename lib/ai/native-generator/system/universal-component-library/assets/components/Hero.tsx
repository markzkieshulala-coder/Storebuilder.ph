import React from 'react';
import { Container } from './Container';
import { Button } from './Button';
import { Badge } from './Badge';

type HeroLayout = 'split' | 'centered' | 'fullscreen' | 'bento' | 'editorial' | 'minimal';

interface HeroProps {
  layout?: HeroLayout;
  preTitle?: string;
  headline: string;
  subheadline?: string;
  ctaPrimary?: { text: string; href: string };
  ctaSecondary?: { text: string; href: string };
  media?: {
    src: string;
    alt: string;
    type?: 'image' | 'video';
  };
  stats?: Array<{ label: string; value: string }>;
  className?: string;
}

const layoutMap: Record<HeroLayout, { container: string; content: string; media: string }> = {
  split: {
    container: 'grid grid-cols-1 lg:grid-cols-2 gap-[var(--layout-gap)] items-center',
    content: 'flex flex-col gap-[var(--space-md)]',
    media: 'relative aspect-[4/3] lg:aspect-auto lg:h-full rounded-[var(--shape-radius)] overflow-hidden',
  },
  centered: {
    container: 'flex flex-col items-center text-center gap-[var(--space-lg)]',
    content: 'flex flex-col items-center gap-[var(--space-md)] max-w-3xl',
    media: 'relative w-full aspect-video rounded-[var(--shape-radius)] overflow-hidden max-w-4xl',
  },
  fullscreen: {
    container: 'relative min-h-[100dvh] flex items-center justify-center',
    content: 'relative z-10 flex flex-col items-center text-center gap-[var(--space-md)] max-w-3xl px-[var(--space-md)]',
    media: 'absolute inset-0 z-0',
  },
  bento: {
    container: 'grid grid-cols-1 md:grid-cols-4 auto-rows-[minmax(180px,auto)] gap-[var(--layout-gap)]',
    content: 'md:col-span-2 md:row-span-2 flex flex-col justify-center gap-[var(--space-md)] p-[var(--space-lg)] bg-[var(--color-surface)] rounded-[var(--shape-radius)]',
    media: 'md:col-span-2 relative rounded-[var(--shape-radius)] overflow-hidden',
  },
  editorial: {
    container: 'grid grid-cols-1 lg:grid-cols-12 gap-[var(--layout-gap)] items-start',
    content: 'lg:col-span-5 flex flex-col gap-[var(--space-md)] lg:sticky lg:top-[var(--nav-height)]',
    media: 'lg:col-span-7 relative aspect-[3/4] rounded-[var(--shape-radius)] overflow-hidden',
  },
  minimal: {
    container: 'flex flex-col items-start lg:items-center lg:text-center gap-[var(--space-lg)] py-[var(--space-3xl)]',
    content: 'flex flex-col gap-[var(--space-md)] max-w-2xl',
    media: 'hidden',
  },
};

export const Hero: React.FC<HeroProps> = ({
  layout = 'split',
  preTitle,
  headline,
  subheadline,
  ctaPrimary,
  ctaSecondary,
  media,
  stats,
  className = '',
}) => {
  const layoutClasses = layoutMap[layout];
  const isFullscreen = layout === 'fullscreen';

  return (
    <section
      className={`
        relative
        bg-[var(--color-background)]
        text-[var(--color-text)]
        udm-section-padding
        ${className}
      `.trim()}
    >
      <Container flush={isFullscreen} wide={isFullscreen}>
        <div className={layoutClasses.container}>
          {/* ── Content ── */}
          <div className={layoutClasses.content}>
            {preTitle && (
              <Badge variant="accent" size="sm">
                {preTitle}
              </Badge>
            )}
            <h1
              className="
                font-[family-name:var(--font-heading)]
                text-[var(--text-size-hero)]
                leading-[var(--line-height-tight)]
                tracking-[var(--letter-spacing-tight)]
                text-[var(--color-text)]
              "
            >
              {headline}
            </h1>
            {subheadline && (
              <p
                className="
                  font-[family-name:var(--font-body)]
                  text-[var(--text-size-body)]
                  leading-[var(--line-height-relaxed)]
                  text-[var(--color-text-muted)]
                  max-w-2xl
                "
              >
                {subheadline}
              </p>
            )}
            <div className="flex flex-wrap gap-[var(--space-sm)] mt-[var(--space-xs)]">
              {ctaPrimary && (
                <Button variant="primary" size="lg" href={ctaPrimary.href}>
                  {ctaPrimary.text}
                </Button>
              )}
              {ctaSecondary && (
                <Button variant="ghost" size="lg" href={ctaSecondary.href}>
                  {ctaSecondary.text}
                </Button>
              )}
            </div>
            {stats && stats.length > 0 && layout !== 'minimal' && (
              <div className="flex flex-wrap gap-[var(--space-lg)] mt-[var(--space-md)]">
                {stats.map((stat, i) => (
                  <div key={i} className="flex flex-col gap-[var(--space-xs)]">
                    <span className="font-[family-name:var(--font-heading)] text-[var(--text-size-h2)] text-[var(--color-text)] leading-[var(--line-height-tight)]">
                      {stat.value}
                    </span>
                    <span className="font-[family-name:var(--font-body)] text-[var(--text-size-small)] text-[var(--color-text-muted)] tracking-[var(--letter-spacing-wide)] uppercase">
                      {stat.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Media ── */}
          {media && layoutClasses.media !== 'hidden' && (
            <div className={layoutClasses.media}>
              {isFullscreen && (
                <div className="absolute inset-0 bg-[var(--color-primary)] opacity-60 z-[1]" />
              )}
              {media.type === 'video' ? (
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full h-full object-cover"
                >
                  <source src={media.src} />
                </video>
              ) : (
                <img
                  src={media.src}
                  alt={media.alt}
                  className="w-full h-full object-cover"
                  loading="eager"
                />
              )}
            </div>
          )}

          {/* Bento stats grid */}
          {layout === 'bento' && stats && (
            <>
              {stats.map((stat, i) => (
                <div
                  key={i}
                  className="
                    flex flex-col justify-center
                    p-[var(--space-md)]
                    bg-[var(--color-background)]
                    border border-[var(--color-border)]
                    rounded-[var(--shape-radius)]
                  "
                >
                  <span className="font-[family-name:var(--font-heading)] text-[var(--text-size-h2)] text-[var(--color-text)]">
                    {stat.value}
                  </span>
                  <span className="font-[family-name:var(--font-body)] text-[var(--text-size-small)] text-[var(--color-text-muted)]">
                    {stat.label}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      </Container>
    </section>
  );
};
