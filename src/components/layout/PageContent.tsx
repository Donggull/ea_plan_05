import { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface PageContentProps {
  children: ReactNode
  className?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl' | 'full'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const maxWidthMap = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  '2xl': 'max-w-8xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full'
}

const paddingMap = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8'
}

export function PageContent({
  children,
  className,
  maxWidth = '7xl',
  padding = 'md'
}: PageContentProps) {
  return (
    <div className={cn(
      maxWidthMap[maxWidth],
      'mx-auto',
      paddingMap[padding],
      className
    )}>
      {children}
    </div>
  )
}