// AI 모델 헬스 상태 표시 컴포넌트

import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  Zap,
  Shield,
  TrendingUp,
  AlertCircle
} from 'lucide-react'
import { useAIModelHealth, type ModelHealthStatus } from '../../hooks/useAIModelHealth'

interface ModelHealthIndicatorProps {
  variant?: 'compact' | 'detailed' | 'badge'
  modelId?: string  // 특정 모델의 상태만 표시
  showActions?: boolean
  className?: string
}

export function ModelHealthIndicator({
  variant = 'compact',
  modelId,
  showActions = false,
  className = ''
}: ModelHealthIndicatorProps) {
  const {
    healthStatus,
    isChecking,
    lastCheckTime,
    performHealthCheck,
    getModelStatus,
    isHealthy,
    isDegraded,
    isCritical,
    healthyCount,
    totalCount,
    attemptModelRecovery
  } = useAIModelHealth()

  if (isChecking && !healthStatus) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Activity className="w-4 h-4 text-accent-blue animate-pulse" />
        <span className="text-text-secondary text-small">Checking models...</span>
      </div>
    )
  }

  if (!healthStatus) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <AlertCircle className="w-4 h-4 text-text-muted" />
        <span className="text-text-muted text-small">No health data</span>
      </div>
    )
  }

  // 특정 모델 상태 표시
  if (modelId) {
    const modelStatus = getModelStatus(modelId)
    if (!modelStatus) return null

    return <SingleModelHealth
      modelStatus={modelStatus}
      variant={variant}
      showActions={showActions}
      onRecovery={() => attemptModelRecovery(modelId)}
      className={className}
    />
  }

  // 전체 상태 표시
  if (variant === 'badge') {
    return (
      <div className={`inline-flex items-center space-x-1 ${className}`}>
        {isHealthy && <CheckCircle className="w-3 h-3 text-accent-green" />}
        {isDegraded && <AlertTriangle className="w-3 h-3 text-accent-orange" />}
        {isCritical && <XCircle className="w-3 h-3 text-accent-red" />}
        <span className={`text-mini font-medium ${
          isHealthy ? 'text-accent-green' :
          isDegraded ? 'text-accent-orange' :
          'text-accent-red'
        }`}>
          {healthyCount}/{totalCount}
        </span>
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center justify-between p-2 bg-bg-tertiary/30 rounded-md ${className}`}>
        <div className="flex items-center space-x-2">
          {isHealthy && (
            <>
              <CheckCircle className="w-4 h-4 text-accent-green" />
              <span className="text-text-primary text-small font-medium">All Systems Healthy</span>
            </>
          )}
          {isDegraded && (
            <>
              <AlertTriangle className="w-4 h-4 text-accent-orange" />
              <span className="text-text-primary text-small font-medium">Some Issues Detected</span>
            </>
          )}
          {isCritical && (
            <>
              <XCircle className="w-4 h-4 text-accent-red" />
              <span className="text-text-primary text-small font-medium">Critical Issues</span>
            </>
          )}
          <span className="text-text-secondary text-mini">
            ({healthyCount}/{totalCount} healthy)
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {lastCheckTime && (
            <span className="text-text-muted text-mini" title={`Last check: ${new Date(lastCheckTime).toLocaleString()}`}>
              <Clock className="w-3 h-3 inline mr-1" />
              {new Date(lastCheckTime).toLocaleTimeString()}
            </span>
          )}
          {showActions && (
            <button
              onClick={performHealthCheck}
              disabled={isChecking}
              className={`p-1 rounded transition-colors ${
                isChecking
                  ? 'text-accent-blue animate-pulse'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
              }`}
              title="헬스 체크 재실행"
            >
              <Activity className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    )
  }

  // detailed variant
  return (
    <div className={`space-y-3 ${className}`}>
      {/* 전체 상태 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h3 className="text-text-primary text-medium font-semibold">Model Health Status</h3>
          {isHealthy && <CheckCircle className="w-5 h-5 text-accent-green" />}
          {isDegraded && <AlertTriangle className="w-5 h-5 text-accent-orange" />}
          {isCritical && <XCircle className="w-5 h-5 text-accent-red" />}
        </div>

        {showActions && (
          <button
            onClick={performHealthCheck}
            disabled={isChecking}
            className={`flex items-center space-x-1 px-2 py-1 rounded text-small transition-colors ${
              isChecking
                ? 'text-accent-blue bg-accent-blue/10'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
            }`}
          >
            <Activity className={`w-4 h-4 ${isChecking ? 'animate-pulse' : ''}`} />
            <span>{isChecking ? 'Checking...' : 'Check Health'}</span>
          </button>
        )}
      </div>

      {/* 상태 요약 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-bg-tertiary/20 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-accent-green" />
            <span className="text-text-secondary text-small">Healthy</span>
          </div>
          <div className="text-text-primary text-large font-semibold mt-1">
            {healthStatus.healthy_models}
          </div>
        </div>

        <div className="bg-bg-tertiary/20 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-accent-orange" />
            <span className="text-text-secondary text-small">Degraded</span>
          </div>
          <div className="text-text-primary text-large font-semibold mt-1">
            {healthStatus.degraded_models}
          </div>
        </div>

        <div className="bg-bg-tertiary/20 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <XCircle className="w-4 h-4 text-accent-red" />
            <span className="text-text-secondary text-small">Down</span>
          </div>
          <div className="text-text-primary text-large font-semibold mt-1">
            {healthStatus.down_models}
          </div>
        </div>

        <div className="bg-bg-tertiary/20 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-primary-500" />
            <span className="text-text-secondary text-small">Total</span>
          </div>
          <div className="text-text-primary text-large font-semibold mt-1">
            {healthStatus.total_models}
          </div>
        </div>
      </div>

      {/* 개별 모델 상태 */}
      {healthStatus.models.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-text-secondary text-small font-medium uppercase tracking-wide">
            Individual Models
          </h4>
          <div className="space-y-1">
            {healthStatus.models.map((model) => (
              <SingleModelHealth
                key={model.model_id}
                modelStatus={model}
                variant="compact"
                showActions={showActions}
                onRecovery={() => attemptModelRecovery(model.model_id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 마지막 체크 시간 */}
      {lastCheckTime && (
        <div className="text-text-muted text-mini">
          Last checked: {new Date(lastCheckTime).toLocaleString()}
        </div>
      )}
    </div>
  )
}

// 개별 모델 헬스 상태 컴포넌트
function SingleModelHealth({
  modelStatus,
  variant,
  showActions,
  onRecovery,
  className = ''
}: {
  modelStatus: ModelHealthStatus
  variant: 'compact' | 'detailed' | 'badge'
  showActions?: boolean
  onRecovery?: () => void
  className?: string
}) {
  const getStatusIcon = () => {
    switch (modelStatus.status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-accent-green" />
      case 'degraded':
        return <AlertTriangle className="w-4 h-4 text-accent-orange" />
      case 'down':
        return <XCircle className="w-4 h-4 text-accent-red" />
      default:
        return <AlertCircle className="w-4 h-4 text-text-muted" />
    }
  }

  const getStatusColor = () => {
    switch (modelStatus.status) {
      case 'healthy':
        return 'text-accent-green'
      case 'degraded':
        return 'text-accent-orange'
      case 'down':
        return 'text-accent-red'
      default:
        return 'text-text-muted'
    }
  }

  if (variant === 'badge') {
    return (
      <div className={`inline-flex items-center space-x-1 ${className}`}>
        {getStatusIcon()}
        <span className={`text-mini font-medium ${getStatusColor()}`}>
          {modelStatus.name}
        </span>
      </div>
    )
  }

  return (
    <div className={`flex items-center justify-between p-2 bg-bg-tertiary/20 rounded-md ${className}`}>
      <div className="flex items-center space-x-3">
        {getStatusIcon()}
        <div>
          <div className="text-text-primary text-small font-medium">
            {modelStatus.name}
          </div>
          <div className="text-text-secondary text-mini">
            {modelStatus.provider} • {modelStatus.status}
          </div>
          {modelStatus.issues.length > 0 && (
            <div className="text-accent-orange text-mini mt-1">
              {modelStatus.issues[0]}
              {modelStatus.issues.length > 1 && ` (+${modelStatus.issues.length - 1} more)`}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2 text-mini text-text-muted">
        {modelStatus.response_time && (
          <div className="flex items-center space-x-1">
            <Zap className="w-3 h-3" />
            <span>{modelStatus.response_time}ms</span>
          </div>
        )}
        {modelStatus.availability && (
          <div className="flex items-center space-x-1">
            <TrendingUp className="w-3 h-3" />
            <span>{modelStatus.availability.toFixed(1)}%</span>
          </div>
        )}
        {showActions && modelStatus.status !== 'healthy' && onRecovery && (
          <button
            onClick={onRecovery}
            className="px-2 py-1 bg-primary-500/10 text-primary-500 rounded text-mini hover:bg-primary-500/20 transition-colors"
          >
            Recover
          </button>
        )}
      </div>
    </div>
  )
}