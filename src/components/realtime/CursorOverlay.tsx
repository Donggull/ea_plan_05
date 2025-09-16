import { useEffect, useState } from 'react'
import { MousePointer2 } from 'lucide-react'
import type { CursorPosition } from '../../services/realtimeService'

interface CursorOverlayProps {
  cursors: CursorPosition[]
  containerRef?: React.RefObject<HTMLElement>
  className?: string
}

interface AnimatedCursor extends CursorPosition {
  isAnimating: boolean
  prevX?: number
  prevY?: number
}

export function CursorOverlay({ cursors, containerRef, className = '' }: CursorOverlayProps) {
  const [animatedCursors, setAnimatedCursors] = useState<AnimatedCursor[]>([])

  // 커서 위치 변화 애니메이션 처리
  useEffect(() => {
    setAnimatedCursors(prev => {
      const newCursors: AnimatedCursor[] = []

      cursors.forEach(cursor => {
        const existing = prev.find(c => c.user_id === cursor.user_id)

        if (existing) {
          // 기존 커서의 위치가 변경된 경우
          const hasMovement = existing.x !== cursor.x || existing.y !== cursor.y

          newCursors.push({
            ...cursor,
            isAnimating: hasMovement,
            prevX: existing.x,
            prevY: existing.y
          })
        } else {
          // 새로운 커서
          newCursors.push({
            ...cursor,
            isAnimating: false
          })
        }
      })

      return newCursors
    })

    // 애니메이션 플래그 리셋
    const timer = setTimeout(() => {
      setAnimatedCursors(prev =>
        prev.map(cursor => ({ ...cursor, isAnimating: false }))
      )
    }, 300)

    return () => clearTimeout(timer)
  }, [cursors])

  // 커서가 없으면 렌더링하지 않음
  if (animatedCursors.length === 0) {
    return null
  }

  // 컨테이너 기준 좌표계 계산
  const getRelativePosition = (cursor: CursorPosition) => {
    if (!containerRef?.current) {
      return { x: cursor.x, y: cursor.y }
    }

    const containerRect = containerRef.current.getBoundingClientRect()
    return {
      x: cursor.x - containerRect.left,
      y: cursor.y - containerRect.top
    }
  }

  return (
    <div className={`absolute inset-0 pointer-events-none z-50 ${className}`}>
      {animatedCursors.map((cursor) => {
        const position = getRelativePosition(cursor)

        // 컨테이너 밖의 커서는 표시하지 않음
        if (containerRef?.current) {
          const containerRect = containerRef.current.getBoundingClientRect()
          if (position.x < 0 || position.y < 0 ||
              position.x > containerRect.width || position.y > containerRect.height) {
            return null
          }
        }

        return (
          <div key={cursor.user_id}>
            {/* 커서 포인터 */}
            <div
              className={`absolute transform -translate-x-1 -translate-y-1 transition-all duration-300 ease-out ${
                cursor.isAnimating ? 'scale-110' : 'scale-100'
              }`}
              style={{
                left: position.x,
                top: position.y,
                zIndex: 1000
              }}
            >
              {/* 커서 아이콘 */}
              <div className="relative">
                <MousePointer2
                  className="w-5 h-5 text-primary-500 drop-shadow-lg filter"
                  style={{
                    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))'
                  }}
                />

                {/* 커서 움직임 트레일 효과 */}
                {cursor.isAnimating && cursor.prevX !== undefined && cursor.prevY !== undefined && (
                  <div
                    className="absolute w-1 h-1 bg-primary-500/30 rounded-full animate-ping"
                    style={{
                      left: (cursor.prevX || 0) - position.x + 2,
                      top: (cursor.prevY || 0) - position.y + 2
                    }}
                  />
                )}
              </div>

              {/* 사용자 이름 태그 */}
              <div className="absolute top-6 left-0 transform -translate-x-1/2">
                <div className="bg-primary-500 text-white text-xs px-2 py-1 rounded-md shadow-lg whitespace-nowrap">
                  <div className="flex items-center space-x-1">
                    {cursor.user_avatar && (
                      <img
                        src={cursor.user_avatar}
                        alt={cursor.user_name}
                        className="w-3 h-3 rounded-full"
                      />
                    )}
                    <span>{cursor.user_name}</span>
                  </div>

                  {/* 말풍선 꼬리 */}
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2">
                    <div className="w-2 h-2 bg-primary-500 rotate-45"></div>
                  </div>
                </div>
              </div>

              {/* 클릭 효과 */}
              {cursor.isAnimating && (
                <div className="absolute -inset-2 bg-primary-500/20 rounded-full animate-ping" />
              )}
            </div>

            {/* 연결선 (특정 요소에 연결된 경우) */}
            {cursor.element_id && (
              <div
                className="absolute w-px bg-primary-500/30 animate-pulse"
                style={{
                  left: position.x + 2,
                  top: position.y + 20,
                  height: '20px'
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// 커서 트래킹을 위한 HOC
interface WithCursorTrackingProps {
  onCursorMove?: (x: number, y: number, elementId?: string) => void
  children: React.ReactNode
  className?: string
}

export function WithCursorTracking({
  onCursorMove,
  children,
  className = ''
}: WithCursorTrackingProps) {
  const handleMouseMove = (e: React.MouseEvent) => {
    if (onCursorMove) {
      const x = e.clientX
      const y = e.clientY

      // 요소 ID 감지 (data-element-id 속성 활용)
      const target = e.target as HTMLElement
      const elementId = target.closest('[data-element-id]')?.getAttribute('data-element-id') || undefined

      onCursorMove(x, y, elementId)
    }
  }

  return (
    <div
      className={`relative ${className}`}
      onMouseMove={handleMouseMove}
    >
      {children}
    </div>
  )
}

// 커서 추적 가능한 요소를 위한 컴포넌트
interface TrackableElementProps {
  elementId: string
  children: React.ReactNode
  className?: string
  highlight?: boolean
}

export function TrackableElement({
  elementId,
  children,
  className = '',
  highlight = false
}: TrackableElementProps) {
  return (
    <div
      data-element-id={elementId}
      className={`${className} ${
        highlight
          ? 'ring-2 ring-primary-500/30 ring-offset-2 ring-offset-bg-primary transition-all'
          : ''
      }`}
    >
      {children}
    </div>
  )
}