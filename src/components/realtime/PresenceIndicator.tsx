import { useState } from 'react'
import { Users, Circle, Clock, Eye } from 'lucide-react'
import type { UserPresence } from '../../services/realtimeService'
import { useAuth } from '../../contexts/AuthContext'

interface PresenceIndicatorProps {
  presenceList: UserPresence[]
  isConnected: boolean
  maxVisible?: number
  showDetails?: boolean
  className?: string
}

export function PresenceIndicator({
  presenceList,
  isConnected,
  maxVisible = 5,
  showDetails = false,
  className = ''
}: PresenceIndicatorProps) {
  const { user } = useAuth()
  const [showAll, setShowAll] = useState(false)

  // 자신을 제외한 사용자 목록
  const otherUsers = presenceList.filter(p => p.user_id !== user?.id)
  const visibleUsers = showAll ? otherUsers : otherUsers.slice(0, maxVisible)
  const hiddenCount = Math.max(0, otherUsers.length - maxVisible)

  const getStatusColor = (status: UserPresence['status']) => {
    switch (status) {
      case 'online':
        return 'bg-accent-green'
      case 'away':
        return 'bg-accent-orange'
      case 'busy':
        return 'bg-accent-red'
      default:
        return 'bg-text-muted'
    }
  }

  const getStatusIcon = (status: UserPresence['status']) => {
    switch (status) {
      case 'online':
        return <Circle className="w-2 h-2 fill-current" />
      case 'away':
        return <Clock className="w-2 h-2" />
      case 'busy':
        return <Eye className="w-2 h-2" />
      default:
        return <Circle className="w-2 h-2 fill-current" />
    }
  }

  const formatLastSeen = (lastSeen: string) => {
    const now = new Date()
    const seen = new Date(lastSeen)
    const diffMs = now.getTime() - seen.getTime()
    const diffMin = Math.floor(diffMs / (1000 * 60))

    if (diffMin < 1) return '방금 전'
    if (diffMin < 60) return `${diffMin}분 전`

    const diffHour = Math.floor(diffMin / 60)
    if (diffHour < 24) return `${diffHour}시간 전`

    return seen.toLocaleDateString('ko-KR')
  }

  if (!isConnected) {
    return (
      <div className={`flex items-center space-x-2 text-text-muted ${className}`}>
        <Circle className="w-2 h-2 fill-current text-accent-red" />
        <span className="text-sm">연결 끊김</span>
      </div>
    )
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* 연결 상태 표시 */}
      <div className="flex items-center space-x-1">
        <Circle className="w-2 h-2 fill-current text-accent-green animate-pulse" />
        <span className="text-sm text-text-secondary">실시간</span>
      </div>

      {/* 접속자 수 */}
      <div className="flex items-center space-x-1 text-text-primary">
        <Users className="w-4 h-4" />
        <span className="text-sm font-medium">{otherUsers.length + 1}</span>
      </div>

      {/* 사용자 아바타 목록 */}
      {otherUsers.length > 0 && (
        <div className="flex items-center">
          <div className="flex -space-x-2">
            {visibleUsers.map((presence) => (
              <div
                key={presence.user_id}
                className="relative group"
                title={`${presence.user_name} (${presence.status})`}
              >
                <div className="relative">
                  {presence.user_avatar ? (
                    <img
                      src={presence.user_avatar}
                      alt={presence.user_name}
                      className="w-8 h-8 rounded-full border-2 border-bg-secondary bg-bg-primary"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full border-2 border-bg-secondary bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-sm font-medium">
                      {presence.user_name[0]?.toUpperCase() || 'U'}
                    </div>
                  )}

                  {/* 상태 표시 */}
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-bg-secondary flex items-center justify-center ${getStatusColor(presence.status)}`}>
                    <div className="text-white text-xs">
                      {getStatusIcon(presence.status)}
                    </div>
                  </div>
                </div>

                {/* 상세 정보 툴팁 */}
                {showDetails && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                    <div className="bg-bg-elevated border border-border-primary rounded-lg shadow-lg p-3 min-w-[200px]">
                      <div className="flex items-center space-x-2 mb-2">
                        {presence.user_avatar ? (
                          <img
                            src={presence.user_avatar}
                            alt={presence.user_name}
                            className="w-6 h-6 rounded-full"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-xs font-medium">
                            {presence.user_name[0]?.toUpperCase() || 'U'}
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-text-primary text-sm">
                            {presence.user_name}
                          </div>
                          <div className="flex items-center space-x-1 text-xs text-text-muted">
                            <div className={`w-2 h-2 rounded-full ${getStatusColor(presence.status)}`} />
                            <span className="capitalize">{presence.status}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-xs text-text-muted">
                        <div>마지막 활동: {formatLastSeen(presence.last_seen)}</div>
                        {presence.current_document_id && (
                          <div>현재 문서: {presence.current_document_id}</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 숨겨진 사용자 수 표시 */}
          {hiddenCount > 0 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="ml-2 w-8 h-8 rounded-full border-2 border-border-primary bg-bg-tertiary flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-secondary transition-colors text-xs font-medium"
            >
              +{hiddenCount}
            </button>
          )}
        </div>
      )}

      {/* 전체 목록 토글 */}
      {otherUsers.length > maxVisible && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-xs text-primary-500 hover:text-primary-600 transition-colors"
        >
          {showAll ? '접기' : '더보기'}
        </button>
      )}
    </div>
  )
}