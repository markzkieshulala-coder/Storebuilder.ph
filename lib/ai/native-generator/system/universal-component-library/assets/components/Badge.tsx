import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'accent' | 'outline' | 'inverse';
  size?: 'sm' | 'md';
}

const variantMap = {
  default: `
    bg-[var(--color-surface)]
    text-[var(--color-text)]
    border border-[var(--color-border)]
  `,
  accent: `
    bg-[var(--color-accent)]
    text-[var(--color-text-inverse)]
  `,
  outline: `
    bg-transparent
    text-[var(--color-accent)]
    border border-[var(--color-accent)]
  `,
  inverse: `
    bg-[var(--color-text-inverse)]
    text-[var(--color-primary)]
  `,
};

const sizeMap = {
  sm: 'text-[var(--text-size-small)] px-[var(--space-xs)] py-[calc(var(--space-xs)*0.5)]',
  md: 'text-[var(--text-size-small)] px-[var(--space-sm)] py-[var(--space-xs)]',
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  className = '',
  variant = 'default',
  size = 'md',
}) => {
  return (
    <span
      className={`
        inline-flex
        items-center
        justify-center
        font-[family-name:var(--font-body)]
        font-medium
        rounded-[var(--shape-radius-pill)]
        leading-[var(--line-height-tight)]
        whitespace-nowrap
        ${variantMap[variant]}
        ${sizeMap[size]}
        ${className}
      `.trim()}
    >
      {children}
    </span>
  );
};
