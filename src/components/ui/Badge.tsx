import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const badgeVariants = {
  default: 'bg-bg-tertiary text-text-secondary border-border-primary',
  primary: 'bg-primary-500/10 text-primary-500 border-primary-500/20',
  success: 'bg-accent-green/10 text-accent-green border-accent-green/20',
  warning: 'bg-semantic-warning/10 text-semantic-warning border-semantic-warning/20',
  error: 'bg-semantic-error/10 text-semantic-error border-semantic-error/20'
};

const badgeSizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-1.5 text-base'
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border',
        badgeVariants[variant],
        badgeSizes[size],
        className
      )}
    >
      {children}
    </span>
  );
};