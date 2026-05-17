import React from 'react';
import { Container } from './Container';

type GalleryRhythm = 'single-column' | 'card-grid' | 'masonry' | 'bento' | 'editorial';

interface GalleryImage {
  id: string;
  src: string;
  alt: string;
  caption?: string;
  aspectRatio?: '1:1' | '4:3' | '3:4' | '16:9' | '21:9';
}

interface GalleryProps {
  title?: string;
  subtitle?: string;
  images: GalleryImage[];
  rhythm?: GalleryRhythm;
  columns?: 2 | 3 | 4;
  className?: string;
}

const aspectRatioClass: Record<string, string> = {
  '1:1':  'aspect-square',
  '4:3':  'aspect-[4/3]',
  '3:4':  'aspect-[3/4]',
  '16:9': 'aspect-video',
  '21:9': 'aspect-[21/9]',
};

const rhythmMap: Record<GalleryRhythm, { container: string; item: string }> = {
  'single-column': {
    container: 'flex flex-col gap-[var(--layout-gap)]',
    item: 'w-full',
  },
  'card-grid': {
    container: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[var(--layout-gap)]',
    item: '',
  },
  'masonry': {
    container: 'columns-1 sm:columns-2 lg:columns-3 gap-[var(--layout-gap)]',
    item: 'break-inside-avoid mb-[var(--layout-gap)]',
  },
  'bento': {
    container: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 auto-rows-[minmax(200px,auto)] gap-[var(--layout-gap)]',
    item: '',
  },
  'editorial': {
    container: 'grid grid-cols-1 lg:grid-cols-12 gap-[var(--layout-gap)]',
    item: '',
  },
};

const bentoSpan = (index: number) => {
  const spans = [
    'sm:col-span-2 sm:row-span-2',
    '',
    '',
    'sm:col-span-2',
    '',
    'sm:row-span-2',
    'sm:col-span-2',
    '',
  ];
  return spans[index % spans.length] || '';
};

const editorialSpan = (index: number) => {
  const spans = [
    'lg:col-span-7',
    'lg:col-span-5',
    'lg:col-span-4',
    'lg:col-span-4',
    'lg:col-span-4',
    'lg:col-span-6',
    'lg:col-span-6',
  ];
  return spans[index % spans.length] || 'lg:col-span-4';
};

export const Gallery: React.FC<GalleryProps> = ({
  title,
  subtitle,
  images,
  rhythm = 'card-grid',
  columns = 3,
  className = '',
}) => {
  const rhythmClasses = rhythmMap[rhythm];

  // Column override for card-grid
  const columnClass = rhythm === 'card-grid'
    ? `grid-cols-1 sm:grid-cols-2 ${columns >= 3 ? 'lg:grid-cols-3' : ''} ${columns >= 4 ? 'xl:grid-cols-4' : ''}`
    : '';

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

        {/* Gallery */}
        <div className={`${rhythm === 'card-grid' ? columnClass : rhythmClasses.container}`}>
          {images.map((image, index) => {
            const isBento = rhythm === 'bento';
            const isEditorial = rhythm === 'editorial';
            const spanClass = isBento ? bentoSpan(index) : isEditorial ? editorialSpan(index) : '';
            const aspectClass = image.aspectRatio ? aspectRatioClass[image.aspectRatio] : 'aspect-square';

            return (
              <figure
                key={image.id}
                className={`
                  group
                  relative
                  overflow-hidden
                  rounded-[var(--shape-radius)]
                  ${rhythmClasses.item}
                  ${spanClass}
                  ${isBento || isEditorial ? aspectClass : ''}
                  ${rhythm === 'masonry' ? 'mb-0' : ''}
                `.trim()}
              >
                <div className={`relative w-full h-full overflow-hidden ${!isBento && !isEditorial ? aspectClass : ''}`}>
                  <img
                    src={image.src}
                    alt={image.alt}
                    className="
                      w-full
                      h-full
                      object-cover
                      udm-transition
                      group-hover:scale-105
                    "
                    loading="lazy"
                  />
                  {/* Hover overlay */}
                  <div className="
                    absolute
                    inset-0
                    bg-[var(--color-primary)]
                    opacity-0
                    group-hover:opacity-40
                    udm-transition
                  " />
                </div>

                {/* Caption */}
                {image.caption && (
                  <figcaption
                    className="
                      absolute
                      bottom-0
                      left-0
                      right-0
                      p-[var(--space-sm)]
                      bg-gradient-to-t
                      from-[var(--color-primary)]
                      to-transparent
                      text-[var(--color-text-inverse)]
                      font-[family-name:var(--font-body)]
                      text-[var(--text-size-small)]
                      translate-y-full
                      group-hover:translate-y-0
                      udm-transition
                    "
                  >
                    {image.caption}
                  </figcaption>
                )}
              </figure>
            );
          })}
        </div>
      </Container>
    </section>
  );
};
