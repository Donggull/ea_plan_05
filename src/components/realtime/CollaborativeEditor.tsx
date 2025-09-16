import { useEffect, useRef, useState, useCallback } from 'react'
import { Save, Wifi, WifiOff, AlertCircle } from 'lucide-react'
import { useRealtime } from '../../hooks/useRealtime'
import { PresenceIndicator } from './PresenceIndicator'
import { CursorOverlay, WithCursorTracking, TrackableElement } from './CursorOverlay'
import type { TextEdit } from '../../services/realtimeService'

interface CollaborativeEditorProps {
  projectId: string
  documentId: string
  initialContent?: string
  onContentChange?: (content: string) => void
  onSave?: (content: string) => Promise<void>
  placeholder?: string
  className?: string
  readOnly?: boolean
}

export function CollaborativeEditor({
  projectId,
  documentId,
  initialContent = '',
  onContentChange,
  onSave,
  placeholder = '내용을 입력하세요...',
  className = '',
  readOnly = false
}: CollaborativeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [content, setContent] = useState(initialContent)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // 실시간 협업 훅
  const {
    presenceList,
    isConnected,
    cursors,
    updateCursor,
    pendingEdits,
    broadcastTextEdit,
    updatePresence
  } = useRealtime({
    projectId,
    documentId,
    enableCursorTracking: true,
    enableTextSync: true,
    cursorThrottleMs: 100
  })

  // 초기 내용 설정
  useEffect(() => {
    setContent(initialContent)
  }, [initialContent])

  // 대기 중인 편집 적용
  useEffect(() => {
    if (pendingEdits.length === 0) return

    const textArea = textareaRef.current
    if (!textArea) return

    // Operational Transform 적용
    let newContent = content
    const sortedEdits = [...pendingEdits].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )

    sortedEdits.forEach(edit => {
      newContent = applyTextEdit(newContent, edit)
    })

    setContent(newContent)
    onContentChange?.(newContent)

    // 커서 위치 조정 (다른 사용자의 편집으로 인한 위치 변화 보정)
    adjustCursorPosition(textArea, sortedEdits)
  }, [pendingEdits, content, onContentChange])

  // 텍스트 편집 적용 함수
  const applyTextEdit = (currentContent: string, edit: TextEdit): string => {
    const { operation, position, content: editContent, length } = edit

    switch (operation) {
      case 'insert':
        return currentContent.slice(0, position) + editContent + currentContent.slice(position)

      case 'delete':
        const deleteLength = length || editContent.length
        return currentContent.slice(0, position) + currentContent.slice(position + deleteLength)

      case 'replace':
        const replaceLength = length || 0
        return currentContent.slice(0, position) + editContent + currentContent.slice(position + replaceLength)

      default:
        return currentContent
    }
  }

  // 커서 위치 조정
  const adjustCursorPosition = (textArea: HTMLTextAreaElement, edits: TextEdit[]) => {
    const currentPosition = textArea.selectionStart
    let adjustment = 0

    edits.forEach(edit => {
      if (edit.position <= currentPosition) {
        switch (edit.operation) {
          case 'insert':
            adjustment += edit.content.length
            break
          case 'delete':
            adjustment -= edit.length || edit.content.length
            break
          case 'replace':
            adjustment += edit.content.length - (edit.length || 0)
            break
        }
      }
    })

    const newPosition = Math.max(0, currentPosition + adjustment)
    textArea.setSelectionRange(newPosition, newPosition)
  }

  // 텍스트 변경 처리
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (readOnly) return

    const newContent = e.target.value
    const oldContent = content
    const cursorPosition = e.target.selectionStart

    // 변경 사항 분석
    const edit = analyzeTextChange(oldContent, newContent, cursorPosition)

    if (edit) {
      // 로컬 상태 업데이트
      setContent(newContent)
      onContentChange?.(newContent)

      // 다른 사용자에게 브로드캐스트
      broadcastTextEdit({
        document_id: documentId,
        operation: edit.operation,
        position: edit.position,
        content: edit.content,
        length: edit.length
      })
    }
  }, [content, readOnly, onContentChange, broadcastTextEdit, documentId])

  // 텍스트 변경 분석
  const analyzeTextChange = (oldText: string, newText: string, cursorPos: number) => {
    if (oldText === newText) return null

    if (newText.length > oldText.length) {
      // 삽입
      const insertPos = cursorPos - (newText.length - oldText.length)
      const insertedText = newText.slice(insertPos, cursorPos)

      return {
        operation: 'insert' as const,
        position: insertPos,
        content: insertedText
      }
    } else if (newText.length < oldText.length) {
      // 삭제
      const deleteLength = oldText.length - newText.length

      return {
        operation: 'delete' as const,
        position: cursorPos,
        content: '',
        length: deleteLength
      }
    } else {
      // 교체 (길이가 같은 경우)
      let diffStart = 0
      let diffEnd = oldText.length

      // 차이점 찾기
      while (diffStart < oldText.length && oldText[diffStart] === newText[diffStart]) {
        diffStart++
      }

      while (diffEnd > diffStart && oldText[diffEnd - 1] === newText[diffEnd - 1]) {
        diffEnd--
      }

      if (diffStart < diffEnd) {
        return {
          operation: 'replace' as const,
          position: diffStart,
          content: newText.slice(diffStart, diffEnd),
          length: diffEnd - diffStart
        }
      }
    }

    return null
  }

  // 커서 이동 처리
  const handleCursorMove = useCallback((x: number, y: number, elementId?: string) => {
    updateCursor(x, y, elementId)
  }, [updateCursor])

  // 저장 처리
  const handleSave = async () => {
    if (!onSave || isSaving) return

    setIsSaving(true)
    setSaveError(null)

    try {
      await onSave(content)
      setLastSaved(new Date())
      updatePresence('online', documentId)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : '저장에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  // 자동 저장 (5초 간격)
  useEffect(() => {
    if (!onSave) return

    const autoSaveTimer = setInterval(() => {
      if (!isSaving && content !== initialContent) {
        handleSave()
      }
    }, 5000)

    return () => clearInterval(autoSaveTimer)
  }, [content, initialContent, isSaving, onSave, handleSave])

  // 포커스/블러 시 상태 업데이트
  const handleFocus = () => {
    updatePresence('online', documentId)
  }

  const handleBlur = () => {
    updatePresence('away', documentId)
  }

  return (
    <div ref={containerRef} className={`relative border border-border-primary rounded-lg ${className}`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between p-3 border-b border-border-secondary bg-bg-secondary">
        <div className="flex items-center space-x-4">
          {/* 연결 상태 */}
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <Wifi className="w-4 h-4 text-accent-green" />
            ) : (
              <WifiOff className="w-4 h-4 text-accent-red" />
            )}
            <span className="text-sm text-text-secondary">
              {isConnected ? '실시간 연결됨' : '연결 끊김'}
            </span>
          </div>

          {/* 접속자 표시 */}
          <PresenceIndicator
            presenceList={presenceList}
            isConnected={isConnected}
            showDetails={true}
          />
        </div>

        <div className="flex items-center space-x-2">
          {/* 저장 상태 */}
          {saveError && (
            <div className="flex items-center space-x-1 text-accent-red">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">저장 실패</span>
            </div>
          )}

          {lastSaved && !saveError && (
            <span className="text-sm text-text-muted">
              {lastSaved.toLocaleTimeString('ko-KR')} 저장됨
            </span>
          )}

          {/* 저장 버튼 */}
          {onSave && (
            <button
              onClick={handleSave}
              disabled={isSaving || readOnly}
              className="flex items-center space-x-1 px-3 py-1 bg-primary-500 text-white rounded hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              <Save className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
              <span>{isSaving ? '저장 중...' : '저장'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 에디터 영역 */}
      <WithCursorTracking onCursorMove={handleCursorMove} className="relative">
        <TrackableElement elementId={`editor-${documentId}`}>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleTextChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            readOnly={readOnly}
            className="w-full min-h-[400px] p-4 bg-transparent border-none outline-none resize-none text-text-primary placeholder-text-muted font-mono text-sm leading-relaxed"
          />
        </TrackableElement>

        {/* 커서 오버레이 */}
        <CursorOverlay
          cursors={cursors}
          containerRef={containerRef}
        />
      </WithCursorTracking>

      {/* 하단 상태 표시 */}
      <div className="flex items-center justify-between p-3 border-t border-border-secondary bg-bg-secondary text-sm text-text-muted">
        <div className="flex items-center space-x-4">
          <span>{content.length.toLocaleString()}자</span>
          <span>{content.split('\n').length.toLocaleString()}줄</span>
        </div>

        <div className="flex items-center space-x-2">
          {pendingEdits.length > 0 && (
            <span className="text-accent-orange">
              {pendingEdits.length}개 변경사항 동기화 중...
            </span>
          )}
        </div>
      </div>
    </div>
  )
}