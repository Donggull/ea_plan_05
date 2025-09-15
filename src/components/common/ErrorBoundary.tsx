import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
}

// React 19 Enhanced Error Boundary
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.props.onError?.(error, errorInfo)

    // 에러 로깅 (실제 운영에서는 Sentry 등 사용)
    this.logErrorToService(error, errorInfo)
  }

  private logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // 실제 구현에서는 외부 로깅 서비스로 전송
    console.log('Logging error to service:', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    })
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined })
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4 rounded-lg border border-red-200 bg-red-50 p-8">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="h-6 w-6" />
            <h2 className="text-xl font-semibold">오류가 발생했습니다</h2>
          </div>

          <div className="text-center text-sm text-red-600">
            <p>예상치 못한 오류가 발생했습니다.</p>
            <p className="mt-1 font-mono text-xs">
              {this.state.error?.message}
            </p>
          </div>

          <button
            onClick={this.handleRetry}
            className="flex items-center space-x-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>다시 시도</span>
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

// 함수형 Error Boundary 래퍼 (React 19 스타일)
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`

  return WrappedComponent
}

// 비동기 에러 처리를 위한 HOC
export function withAsyncErrorBoundary<P extends object>(
  Component: React.ComponentType<P>
) {
  return withErrorBoundary(Component, {
    onError: (error, _errorInfo) => {
      // 비동기 에러 특별 처리
      if (error.message.includes('fetch') || error.message.includes('network')) {
        console.log('Network error detected:', error)
        // 네트워크 에러 특별 처리 로직
      }
    },
    fallback: (
      <div className="flex min-h-[200px] flex-col items-center justify-center space-y-3 rounded-lg border border-yellow-200 bg-yellow-50 p-6">
        <div className="flex items-center space-x-2 text-yellow-600">
          <AlertTriangle className="h-5 w-5" />
          <h3 className="font-medium">데이터 로딩 오류</h3>
        </div>
        <p className="text-sm text-yellow-600">
          데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
        </p>
      </div>
    ),
  })
}