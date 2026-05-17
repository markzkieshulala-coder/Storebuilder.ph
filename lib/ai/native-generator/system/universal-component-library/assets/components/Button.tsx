import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  href?: string;
  target?: string;
  rel?: string;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const variantMap: Record<ButtonVariant, string> = {
  primary: `
    bg-[var(--color-accent)]
    text-[var(--color-text-inverse)]
    hover:brightness-110
    focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-[var(--color-background)]
  `,
  secondary: `
    bg-[var(--color-surface)]
    text-[var(--color-text)]
    border border-[var(--color-border)]
    hover:bg-[var(--color-primary)] hover:text-[var(--color-text-inverse)]
    focus:ring-2 focus:ring-[var(--color-border)]
  `,
  ghost: `
    bg-transparent
    text-[var(--color-text)]
    hover:bg-[var(--color-surface)]
    focus:ring-2 focus:ring-[var(--color-border)]
  `,
};

const sizeMap: Record<ButtonSize, string> = {
  sm: `
    text-[var(--text-size-small)]
    px-[var(--space-sm)]
    py-[calc(var(--space-xs)*0.8)]
    rounded-[var(--shape-radius-sm)]
  `,
  md: `
    text-[var(--text-size-body)]
    px-[var(--button-padding-x)]
    py-[var(--button-padding-y)]
    rounded-[var(--shape-radius)]
  `,
  lg: `
    text-[var(--text-size-h3)]
    px-[var(--space-lg)]
    py-[var(--space-md)]
    rounded-[var(--shape-radius-lg)]
  `,
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  disabled = false,
  onClick,
  type = 'button',
  href,
  target,
  rel,
  iconLeft,
  iconRight,
}) => {
  const baseClasses = `
    inline-flex
    items-center
    justify-center
    gap-[var(--space-xs)]
    font-[family-name:var(--font-body)]
    font-medium
    leading-[var(--line-height-tight)]
    whitespace-nowrap
    udm-transition-fast
    cursor-pointer
    disabled:opacity-50
    disabled:cursor-not-allowed
    active:scale-[0.98]
  `;

  const combinedClasses = `${baseClasses} ${variantMap[variant]} ${sizeMap[size]} ${className}`.trim();

  const content = (
    <>
      {iconLeft && <span className="flex-shrink-0">{iconLeft}</span>}
      {children}
      {iconRight && <span className="flex-shrink-0">{iconRight}</span>}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target={target}
        rel={rel}
        className={combinedClasses}
        aria-disabled={disabled}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type={type}
      className={combinedClasses}
      disabled={disabled}
      onClick={onClick}
    >
      {content}
    </button>
  );
};
