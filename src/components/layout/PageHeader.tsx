import { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface PageHeaderProps {
  title: string
  subtitle?: string
  description?: string
  actions?: ReactNode
  className?: string
  showBorder?: boolean
}

export function PageHeader({
  title,
  subtitle,
  description,
  actions,
  className,
  showBorder = true
}: PageHeaderProps) {
  return (
    <div className={cn(
      "bg-bg-primary",
      showBorder && "border-b border-border-primary",
      className
    )}>
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-title3 font-semibold text-text-primary tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-regular text-text-secondary">
                {subtitle}
              </p>
            )}
            {description && (
              <p className="text-small text-text-tertiary max-w-2xl">
                {description}
              </p>
            )}
          </div>

          {actions && (
            <div className="flex items-center space-x-3">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}