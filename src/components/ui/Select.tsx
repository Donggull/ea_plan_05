import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}

interface SelectTriggerProps {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

interface SelectContentProps {
  children: React.ReactNode;
  className?: string;
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

interface SelectValueProps {
  placeholder?: string;
  className?: string;
}

const SelectContext = React.createContext<{
  value?: string;
  onValueChange?: (value: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  disabled?: boolean;
}>({
  isOpen: false,
  setIsOpen: () => {}
});

export const Select: React.FC<SelectProps> = ({
  value,
  onValueChange,
  disabled = false,
  children
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <SelectContext.Provider
      value={{
        value,
        onValueChange,
        isOpen,
        setIsOpen,
        disabled
      }}
    >
      <div className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  );
};

export const SelectTrigger: React.FC<SelectTriggerProps> = ({
  children,
  className,
  disabled
}) => {
  const { isOpen, setIsOpen, disabled: contextDisabled } = React.useContext(SelectContext);
  const isDisabled = disabled || contextDisabled;

  return (
    <button
      type="button"
      onClick={() => !isDisabled && setIsOpen(!isOpen)}
      disabled={isDisabled}
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-md border border-border-primary bg-bg-secondary px-3 py-2 text-sm',
        'placeholder:text-text-tertiary',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        isOpen && 'ring-2 ring-primary-500 ring-offset-2',
        className
      )}
    >
      {children}
      <ChevronDown className={cn(
        'h-4 w-4 text-text-tertiary transition-transform',
        isOpen && 'rotate-180'
      )} />
    </button>
  );
};

export const SelectContent: React.FC<SelectContentProps> = ({
  children,
  className
}) => {
  const { isOpen, setIsOpen } = React.useContext(SelectContext);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, setIsOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={contentRef}
      className={cn(
        'absolute top-full z-50 mt-1 w-full rounded-md border border-border-primary bg-bg-secondary shadow-lg',
        'animate-in fade-in-0 zoom-in-95',
        className
      )}
    >
      <div className="max-h-60 overflow-auto p-1">
        {children}
      </div>
    </div>
  );
};

export const SelectItem: React.FC<SelectItemProps> = ({
  value,
  children,
  className
}) => {
  const { value: selectedValue, onValueChange, setIsOpen } = React.useContext(SelectContext);
  const isSelected = selectedValue === value;

  const handleSelect = () => {
    onValueChange?.(value);
    setIsOpen(false);
  };

  return (
    <button
      type="button"
      onClick={handleSelect}
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 pl-8 pr-2 text-sm outline-none',
        'hover:bg-bg-elevated focus:bg-bg-elevated',
        'text-text-primary',
        className
      )}
    >
      {isSelected && (
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          <Check className="h-4 w-4 text-primary-500" />
        </span>
      )}
      {children}
    </button>
  );
};

export const SelectValue: React.FC<SelectValueProps> = ({
  placeholder,
  className
}) => {
  const { value } = React.useContext(SelectContext);

  return (
    <span className={cn(
      'block truncate',
      !value && 'text-text-tertiary',
      className
    )}>
      {value || placeholder}
    </span>
  );
};