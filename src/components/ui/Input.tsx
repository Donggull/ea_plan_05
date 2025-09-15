import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/utils/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-lg border border-border-primary bg-bg-secondary px-4 py-3 text-regular text-text-primary transition-all duration-fast file:border-0 file:bg-transparent file:text-regular file:font-medium placeholder:text-text-muted focus:outline-none focus:border-border-focus focus:border-linear-glow disabled:cursor-not-allowed disabled:opacity-50 text-linear-body',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }