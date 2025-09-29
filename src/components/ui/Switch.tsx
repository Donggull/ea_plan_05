import React from 'react';
import { cn } from '@/lib/utils';

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const switchSizes = {
  sm: {
    root: 'h-4 w-7',
    thumb: 'h-3 w-3 data-[state=checked]:translate-x-3'
  },
  md: {
    root: 'h-5 w-9',
    thumb: 'h-4 w-4 data-[state=checked]:translate-x-4'
  },
  lg: {
    root: 'h-6 w-11',
    thumb: 'h-5 w-5 data-[state=checked]:translate-x-5'
  }
};

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onCheckedChange,
  disabled = false,
  size = 'md',
  className
}) => {
  const sizeClasses = switchSizes[size];

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onCheckedChange(!checked)}
      disabled={disabled}
      className={cn(
        'peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-primary-500' : 'bg-bg-tertiary',
        sizeClasses.root,
        className
      )}
      data-state={checked ? 'checked' : 'unchecked'}
    >
      <span
        className={cn(
          'pointer-events-none block rounded-full bg-bg-primary shadow-lg ring-0 transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0',
          sizeClasses.thumb
        )}
        data-state={checked ? 'checked' : 'unchecked'}
      />
    </button>
  );
};