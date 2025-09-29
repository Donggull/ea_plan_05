import React from 'react';
import { cn } from '@/lib/utils';

interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  showValue?: boolean;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  className,
  showValue = false
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={cn("w-full", className)}>
      <div className="relative w-full bg-bg-tertiary rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-primary-500 transition-all duration-300 ease-out rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showValue && (
        <div className="text-xs text-text-secondary mt-1 text-right">
          {Math.round(percentage)}%
        </div>
      )}
    </div>
  );
};