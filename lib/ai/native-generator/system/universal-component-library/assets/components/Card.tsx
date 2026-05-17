import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  bg?: 'background' | 'surface' | 'primary' | 'secondary';
  shadow?: boolean;
  hover?: boolean;
  border?: boolean;
  interactive?: boolean;
}

const paddingMap = {
  none: 'p-0',
  sm:   'p-[var(--space-sm)]',
  md:   'p-[var(--card-padding)]',
  lg:   'p-[var(--space-lg)]',
};

const bgMap = {
  background: 'bg-[var(--color-background)]',
  surface:    'bg-[var(--color-surface)]',
  primary:    'bg-[var(--color-primary)] text-[var(--color-text-inverse)]',
  secondary:  'bg-[var(--color-secondary)] text-[var(--color-text-inverse)]',
};

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = 'md',
  bg = 'surface',
  shadow = true,
  hover = false,
  border = true,
  interactive = false,
}) => {
  const shadowClass = shadow
    ? 'shadow-[var(--shadow-md)]'
    : 'shadow-none';

  const hoverClass = hover
    ? 'hover:shadow-[var(--shadow-lg)] hover:-translate-y-1'
    : '';

  const borderClass = border
    ? 'border border-[var(--color-border)]'
    : 'border border-transparent';

  const interactiveClass = interactive
    ? 'cursor-pointer active:scale-[0.98]'
    : '';

  return (
    <div
      className={`
        ${paddingMap[padding]}
        ${bgMap[bg]}
        ${shadowClass}
        ${hoverClass}
        ${borderClass}
        ${interactiveClass}
        rounded-[var(--shape-radius)]
        udm-transition
        overflow-hidden
        ${className}
      `.trim()}
    >
      {children}
    </div>
  );
};
