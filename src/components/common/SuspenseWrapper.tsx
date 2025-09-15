import { Suspense, ReactNode } from 'react'
import { Loader2, Database, FileText, BarChart3 } from 'lucide-react'

interface SuspenseWrapperProps {
  children: ReactNode
  fallback?: ReactNode
  loadingType?: 'default' | 'data' | 'document' | 'analysis' | 'minimal'
}

// React 19 Enhanced Suspense Loading Components
export const LoadingSpinner = ({
  size = 'md',
  type = 'default'
}: {
  size?: 'sm' | 'md' | 'lg'
  type?: 'default' | 'data' | 'document' | 'analysis'
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  }

  const getIcon = () => {
    switch (type) {
      case 'data':
        return <Database className={`${sizeClasses[size]} animate-pulse`} />
      case 'document':
        return <FileText className={`${sizeClasses[size]} animate-pulse`} />
      case 'analysis':
        return <BarChart3 className={`${sizeClasses[size]} animate-pulse`} />
      default:
        return <Loader2 className={`${sizeClasses[size]} animate-spin`} />
    }
  }

  return (
    <div className="flex items-center justify-center text-gray-500">
      {getIcon()}
    </div>
  )
}

// 다양한 로딩 상태 컴포넌트들
export const DefaultLoadingFallback = () => (
  <div className="flex min-h-[200px] items-center justify-center">
    <div className="flex items-center space-x-3 text-gray-600">
      <LoadingSpinner size="md" />
      <span className="text-sm">로딩 중...</span>
    </div>
  </div>
)

export const DataLoadingFallback = () => (
  <div className="flex min-h-[300px] items-center justify-center">
    <div className="text-center">
      <LoadingSpinner size="lg" type="data" />
      <div className="mt-4 space-y-2">
        <div className="h-3 w-32 animate-pulse rounded bg-gray-200"></div>
        <div className="h-3 w-24 animate-pulse rounded bg-gray-200"></div>
      </div>
    </div>
  </div>
)

export const DocumentLoadingFallback = () => (
  <div className="space-y-4 p-4">
    <div className="flex items-center space-x-3">
      <LoadingSpinner size="sm" type="document" />
      <span className="text-sm text-gray-600">문서 로딩 중...</span>
    </div>
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center space-x-3 rounded-lg border p-3">
          <div className="h-8 w-8 animate-pulse rounded bg-gray-200"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200"></div>
            <div className="h-3 w-1/2 animate-pulse rounded bg-gray-200"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
)

export const AnalysisLoadingFallback = () => (
  <div className="space-y-6 p-6">
    <div className="flex items-center space-x-3">
      <LoadingSpinner size="md" type="analysis" />
      <span className="text-lg font-medium text-gray-700">AI 분석 중...</span>
    </div>

    <div className="grid gap-4 md:grid-cols-2">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-lg border p-4">
          <div className="mb-3 h-4 w-1/3 animate-pulse rounded bg-gray-200"></div>
          <div className="space-y-2">
            <div className="h-20 animate-pulse rounded bg-gray-100"></div>
            <div className="h-3 w-2/3 animate-pulse rounded bg-gray-200"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
)

export const MinimalLoadingFallback = () => (
  <div className="flex items-center justify-center py-8">
    <LoadingSpinner size="sm" />
  </div>
)

// React 19 Enhanced Suspense Wrapper
export function SuspenseWrapper({
  children,
  fallback,
  loadingType = 'default'
}: SuspenseWrapperProps) {
  // 로딩 타입에 따른 fallback 선택
  const getFallback = () => {
    if (fallback) return fallback

    switch (loadingType) {
      case 'data':
        return <DataLoadingFallback />
      case 'document':
        return <DocumentLoadingFallback />
      case 'analysis':
        return <AnalysisLoadingFallback />
      case 'minimal':
        return <MinimalLoadingFallback />
      default:
        return <DefaultLoadingFallback />
    }
  }

  return (
    <Suspense fallback={getFallback()}>
      {children}
    </Suspense>
  )
}

// 중첩된 Suspense 경계를 위한 컴포넌트
export function NestedSuspense({
  children,
  levels = ['default']
}: {
  children: ReactNode
  levels: Array<'default' | 'data' | 'document' | 'analysis' | 'minimal'>
}) {
  return levels.reduceRight(
    (acc, level) => (
      <SuspenseWrapper loadingType={level}>
        {acc}
      </SuspenseWrapper>
    ),
    children as ReactNode
  )
}

// 조건부 Suspense (데이터가 있을 때만 Suspense 적용)
export function ConditionalSuspense({
  children,
  condition,
  fallback
}: {
  children: ReactNode
  condition: boolean
  fallback?: ReactNode
}) {
  if (!condition) {
    return <>{children}</>
  }

  return (
    <Suspense fallback={fallback || <DefaultLoadingFallback />}>
      {children}
    </Suspense>
  )
}

// React 19의 Progressive Enhancement를 위한 래퍼
export function ProgressiveWrapper({
  children,
  enhancedChildren,
  condition = true
}: {
  children: ReactNode
  enhancedChildren: ReactNode
  condition?: boolean
}) {
  return (
    <SuspenseWrapper loadingType="minimal">
      {condition ? enhancedChildren : children}
    </SuspenseWrapper>
  )
}