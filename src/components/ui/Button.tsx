import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/utils/cn'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-lg text-regular font-medium transition-all duration-fast focus-visible:outline-none focus-visible:border-linear-glow disabled:pointer-events-none disabled:opacity-50 text-linear-body',
  {
    variants: {
      variant: {
        default: 'bg-primary-500 text-white hover:bg-primary-400 active:bg-primary-600 active:scale-[0.98]',
        primary: 'bg-primary-500 text-white hover:bg-primary-400 active:bg-primary-600 active:scale-[0.98]',
        destructive: 'bg-error text-white hover:bg-error/90 active:scale-[0.98]',
        outline: 'border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-text-primary',
        secondary: 'bg-bg-tertiary text-text-secondary hover:bg-bg-elevated border border-border-secondary',
        ghost: 'hover:bg-bg-secondary text-text-secondary hover:text-text-primary',
        link: 'text-primary-500 underline-offset-4 hover:underline hover:text-primary-400',
      },
      size: {
        default: 'h-10 px-6 py-3',
        sm: 'h-8 px-4 py-2 text-small',
        lg: 'h-12 px-8 py-4 text-large',
        icon: 'h-10 w-10 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }