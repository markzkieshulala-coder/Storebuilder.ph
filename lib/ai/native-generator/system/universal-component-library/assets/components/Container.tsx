import React from 'react';

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
  narrow?: boolean;
  wide?: boolean;
  flush?: boolean;
}

export const Container: React.FC<ContainerProps> = ({
  children,
  className = '',
  as: Tag = 'div',
  narrow = false,
  wide = false,
  flush = false,
}) => {
  const maxWidth = narrow
    ? 'max-w-[960px]'
    : wide
    ? 'max-w-[1440px]'
    : 'max-w-[var(--layout-max-width)]';

  const padding = flush
    ? 'px-0'
    : 'px-[var(--space-sm)] md:px-[var(--space-md)] lg:px-[var(--space-lg)]';

  return (
    <Tag
      className={`
        mx-auto
        w-full
        ${maxWidth}
        ${padding}
        ${className}
      `.trim()}
    >
      {children}
    </Tag>
  );
};
