import React from 'react';
import { cn } from '@/lib/utils';

interface ScrollAreaProps {
  children: React.ReactNode;
  className?: string;
  orientation?: 'vertical' | 'horizontal' | 'both';
}

export const ScrollArea: React.FC<ScrollAreaProps> = ({
  children,
  className,
  orientation = 'vertical'
}) => {
  return (
    <div
      className={cn(
        'relative overflow-hidden',
        className
      )}
    >
      <div
        className={cn(
          'h-full w-full rounded-inherit',
          orientation === 'vertical' && 'overflow-y-auto overflow-x-hidden',
          orientation === 'horizontal' && 'overflow-x-auto overflow-y-hidden',
          orientation === 'both' && 'overflow-auto',
          // Custom scrollbar styles
          '[&::-webkit-scrollbar]:w-2',
          '[&::-webkit-scrollbar]:h-2',
          '[&::-webkit-scrollbar-track]:bg-bg-secondary',
          '[&::-webkit-scrollbar-track]:rounded-full',
          '[&::-webkit-scrollbar-thumb]:bg-border-primary',
          '[&::-webkit-scrollbar-thumb]:rounded-full',
          '[&::-webkit-scrollbar-thumb:hover]:bg-text-tertiary'
        )}
      >
        {children}
      </div>
    </div>
  );
};