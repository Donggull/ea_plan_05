import React, { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface SliderProps {
  value: number[];
  onValueChange: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
}

export const Slider: React.FC<SliderProps> = ({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  className
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  const currentValue = value[0] || min;
  const percentage = ((currentValue - min) / (max - min)) * 100;

  const updateValue = useCallback((clientX: number) => {
    if (!sliderRef.current || disabled) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newValue = min + percent * (max - min);
    const steppedValue = Math.round(newValue / step) * step;
    const clampedValue = Math.max(min, Math.min(max, steppedValue));

    onValueChange([clampedValue]);
  }, [min, max, step, disabled, onValueChange]);

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (disabled) return;

    setIsDragging(true);
    updateValue(event.clientX);

    const handleMouseMove = (event: MouseEvent) => {
      updateValue(event.clientX);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [disabled, updateValue]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (disabled) return;

    let newValue = currentValue;

    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        newValue = Math.max(min, currentValue - step);
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        newValue = Math.min(max, currentValue + step);
        break;
      case 'Home':
        newValue = min;
        break;
      case 'End':
        newValue = max;
        break;
      default:
        return;
    }

    event.preventDefault();
    onValueChange([newValue]);
  }, [currentValue, min, max, step, disabled, onValueChange]);

  return (
    <div
      className={cn(
        'relative flex w-full touch-none select-none items-center',
        className
      )}
    >
      <div
        ref={sliderRef}
        className="relative h-2 w-full grow overflow-hidden rounded-full bg-bg-tertiary cursor-pointer"
        onMouseDown={handleMouseDown}
      >
        <div
          className="absolute h-full bg-primary-500 transition-all duration-150 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div
        className={cn(
          'absolute block h-5 w-5 rounded-full border-2 border-primary-500 bg-bg-primary shadow transition-all',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          isDragging && 'scale-110'
        )}
        style={{ left: `calc(${percentage}% - 10px)` }}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
        role="slider"
        aria-valuenow={currentValue}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-disabled={disabled}
      />
    </div>
  );
};