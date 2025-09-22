// Q&A 채팅 인터페이스 컴포넌트
// 실시간 채팅 형태의 Q&A 시스템 UI

import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Send,
  Bot,
  User,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Search,
  Filter,
  Plus,
  Paperclip,
  Smile,
  MoreVertical
} from 'lucide-react'
import { QAConversation, QAMessage, QAServiceResponse } from '../../types/qa'
import { qaService } from '../../services/qa/qaService'
import { qaAIService } from '../../services/qa/qaAIService'
import { useAuth } from '../../contexts/AuthContext'

interface QAChatInterfaceProps {
  projectId?: string
  conversationId?: string
  onConversationChange?: (conversation: QAConversation) => void
  className?: string
}

export const QAChatInterface: React.FC<QAChatInterfaceProps> = ({
  projectId,
  conversationId,
  onConversationChange,
  className = ''
}) => {
  // States
  const [conversation, setConversation] = useState<QAConversation | null>(null)
  const [messages, setMessages] = useState<QAMessage[]>([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isAIThinking, setIsAIThinking] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageInputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Hooks
  const { user } = useAuth()

  // Effects
  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId)
    }
  }, [conversationId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // 타이핑 상태 타이머
    const timer = setTimeout(() => {
      setTypingUsers([])
    }, 3000)

    return () => clearTimeout(timer)
  }, [typingUsers])

  // Methods
  const loadConversation = async (id: string) => {
    setIsLoading(true)
    try {
      const response = await qaService.getConversation(id)
      if (response.success && response.data) {
        setConversation(response.data)
        setMessages(response.data.messages || [])
        onConversationChange?.(response.data)
      }
    } catch (error) {
      console.error('대화 로드 중 오류:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!currentMessage.trim() || !conversation || !user) return

    const messageContent = currentMessage.trim()
    setCurrentMessage('')
    setIsLoading(true)

    try {
      // 사용자 메시지 전송
      const response = await qaService.createMessage(
        conversation.id,
        messageContent,
        'question'
      )

      if (response.success && response.data) {
        const newMessage = response.data
        setMessages(prev => [...prev, newMessage])

        // AI 답변 생성 (자동)
        if (conversation.tags.includes('ai-enabled')) {
          await generateAIResponse(conversation.id, messageContent)
        }
      }
    } catch (error) {
      console.error('메시지 전송 중 오류:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateAIResponse = async (conversationId: string, question: string) => {
    setIsAIThinking(true)

    try {
      const aiResponse = await qaAIService.generateAnswer({
        conversationId,
        question,
        context: {
          projectDocuments: [],
          relatedConversations: [],
          userHistory: [],
          relevantCodeSnippets: []
        },
        useRAG: true,
        model: 'gpt-4o',
        provider: 'openai'
      })

      if (aiResponse.success && aiResponse.data) {
        // AI 답변 메시지 생성
        const aiMessageResponse = await qaService.createMessage(
          conversationId,
          aiResponse.data.answer,
          'answer'
        )

        if (aiMessageResponse.success && aiMessageResponse.data) {
          setMessages(prev => [...prev, aiMessageResponse.data!])
        }
      }
    } catch (error) {
      console.error('AI 답변 생성 중 오류:', error)
    } finally {
      setIsAIThinking(false)
    }
  }

  const handleVote = async (messageId: string, voteType: 'up' | 'down') => {
    try {
      const response = await qaService.voteMessage(messageId, voteType)
      if (response.success) {
        // 메시지 목록 새로고침 (실제로는 실시간 업데이트)
        if (conversation) {
          await loadConversation(conversation.id)
        }
      }
    } catch (error) {
      console.error('투표 중 오류:', error)
    }
  }

  const handleMarkAsAnswer = async (messageId: string) => {
    try {
      const response = await qaService.markAsAnswer(messageId)
      if (response.success && conversation) {
        await loadConversation(conversation.id)
      }
    } catch (error) {
      console.error('답변 표시 중 오류:', error)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleFileAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setAttachments(prev => [...prev, ...files])
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date)
  }

  const getMessageIcon = (message: QAMessage) => {
    if (message.isAIGenerated) {
      return <Bot className="w-4 h-4 text-primary-500" />
    }
    return <User className="w-4 h-4 text-text-secondary" />
  }

  const getMessageStatusIcon = (message: QAMessage) => {
    if (message.isMarkedAsAnswer) {
      return <CheckCircle className="w-4 h-4 text-accent-green" />
    }
    if (message.type === 'answer') {
      return <MessageSquare className="w-4 h-4 text-accent-blue" />
    }
    return null
  }

  if (isLoading && !conversation) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">대화를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-full bg-bg-primary ${className}`}>
      {/* 헤더 */}
      {conversation && (
        <div className="flex items-center justify-between p-4 border-b border-border-primary bg-bg-secondary">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-500/10 rounded-lg">
              <MessageSquare className="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <h3 className="text-text-primary font-semibold">{conversation.title}</h3>
              <p className="text-text-secondary text-sm">
                {conversation.messageCount}개 메시지 • {conversation.tags.join(', ')}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button className="p-2 hover:bg-bg-tertiary rounded-lg transition-colors">
              <Search className="w-4 h-4 text-text-secondary" />
            </button>
            <button className="p-2 hover:bg-bg-tertiary rounded-lg transition-colors">
              <Filter className="w-4 h-4 text-text-secondary" />
            </button>
            <button className="p-2 hover:bg-bg-tertiary rounded-lg transition-colors">
              <MoreVertical className="w-4 h-4 text-text-secondary" />
            </button>
          </div>
        </div>
      )}

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start space-x-3 ${
              message.userId === user?.id ? 'flex-row-reverse space-x-reverse' : ''
            }`}
          >
            {/* 아바타 */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              message.isAIGenerated
                ? 'bg-primary-500/10'
                : message.userId === user?.id
                ? 'bg-accent-blue/10'
                : 'bg-bg-tertiary'
            }`}>
              {getMessageIcon(message)}
            </div>

            {/* 메시지 컨텐츠 */}
            <div className={`flex-1 max-w-2xl ${
              message.userId === user?.id ? 'text-right' : 'text-left'
            }`}>
              {/* 사용자 정보 */}
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-text-primary text-sm font-medium">
                  {message.isAIGenerated ? 'AI Assistant' : message.userName}
                </span>
                {message.isAIGenerated && (
                  <Sparkles className="w-3 h-3 text-primary-500" />
                )}
                <span className="text-text-muted text-xs">
                  {formatTime(message.createdAt)}
                </span>
                {getMessageStatusIcon(message)}
              </div>

              {/* 메시지 내용 */}
              <div className={`p-3 rounded-lg ${
                message.userId === user?.id
                  ? 'bg-primary-500 text-white'
                  : message.isAIGenerated
                  ? 'bg-primary-500/5 border border-primary-500/20'
                  : 'bg-bg-secondary border border-border-primary'
              }`}>
                <div className="text-sm whitespace-pre-wrap">
                  {message.content}
                </div>

                {/* AI 신뢰도 */}
                {message.isAIGenerated && message.aiConfidence && (
                  <div className="mt-2 text-xs text-text-muted">
                    신뢰도: {Math.round(message.aiConfidence * 100)}%
                  </div>
                )}

                {/* 첨부파일 */}
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {message.attachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center space-x-2 text-xs">
                        <Paperclip className="w-3 h-3" />
                        <span>{attachment.fileName}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 액션 버튼들 */}
              {message.userId !== user?.id && (
                <div className="flex items-center space-x-2 mt-2">
                  <button
                    onClick={() => handleVote(message.id, 'up')}
                    className="flex items-center space-x-1 px-2 py-1 hover:bg-bg-tertiary rounded text-xs transition-colors"
                  >
                    <ThumbsUp className="w-3 h-3" />
                    <span>{message.votes.up}</span>
                  </button>
                  <button
                    onClick={() => handleVote(message.id, 'down')}
                    className="flex items-center space-x-1 px-2 py-1 hover:bg-bg-tertiary rounded text-xs transition-colors"
                  >
                    <ThumbsDown className="w-3 h-3" />
                    <span>{message.votes.down}</span>
                  </button>
                  {message.type === 'answer' && !message.isMarkedAsAnswer && (
                    <button
                      onClick={() => handleMarkAsAnswer(message.id)}
                      className="px-2 py-1 text-xs text-accent-green hover:bg-accent-green/10 rounded transition-colors"
                    >
                      답변으로 표시
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* AI 생각 중 표시 */}
        {isAIThinking && (
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-500/10 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-text-primary text-sm font-medium">AI Assistant</span>
                <Sparkles className="w-3 h-3 text-primary-500" />
              </div>
              <div className="p-3 bg-primary-500/5 border border-primary-500/20 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                  <span className="text-text-secondary text-sm">AI가 답변을 생성하고 있습니다...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 타이핑 표시 */}
        {typingUsers.length > 0 && (
          <div className="text-text-muted text-sm">
            {typingUsers.join(', ')}님이 입력 중...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <div className="border-t border-border-primary bg-bg-secondary p-4">
        {/* 첨부파일 미리보기 */}
        {attachments.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div key={index} className="flex items-center space-x-2 bg-bg-tertiary p-2 rounded-lg">
                <Paperclip className="w-4 h-4 text-text-secondary" />
                <span className="text-sm text-text-primary">{file.name}</span>
                <button
                  onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
                  className="text-text-muted hover:text-text-primary"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end space-x-3">
          {/* 액션 버튼들 */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 hover:bg-bg-tertiary rounded-lg transition-colors"
              title="파일 첨부"
            >
              <Paperclip className="w-4 h-4 text-text-secondary" />
            </button>
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 hover:bg-bg-tertiary rounded-lg transition-colors"
              title="이모지"
            >
              <Smile className="w-4 h-4 text-text-secondary" />
            </button>
          </div>

          {/* 메시지 입력 */}
          <div className="flex-1 relative">
            <textarea
              ref={messageInputRef}
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="메시지를 입력하세요... (Enter: 전송, Shift+Enter: 줄바꿈)"
              className="w-full bg-bg-primary border border-border-primary rounded-lg px-4 py-3 pr-12 text-text-primary placeholder-text-muted focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none max-h-32"
              rows={1}
              disabled={isLoading}
            />

            {/* 전송 버튼 */}
            <button
              onClick={sendMessage}
              disabled={!currentMessage.trim() || isLoading}
              className="absolute right-2 bottom-2 p-2 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-500/50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 숨겨진 파일 입력 */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileAttachment}
        />
      </div>
    </div>
  )
}

export default QAChatInterface