import React from 'react';
import { cn } from '@/lib/utils';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  className,
  ...props
}) => {
  return (
    <textarea
      className={cn(
        'flex min-h-[80px] w-full rounded-md border border-border-primary bg-bg-secondary px-3 py-2 text-sm text-text-primary',
        'placeholder:text-text-tertiary',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'resize-none',
        className
      )}
      {...props}
    />
  );
};