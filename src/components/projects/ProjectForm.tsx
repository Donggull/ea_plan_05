import React, { useState, useEffect } from 'react'
import { ChevronDown, Loader2, Info, BarChart3, FileText, Upload, ArrowRight } from 'lucide-react'

interface ProjectFormData {
  name: string
  description: string
  status: string
}

interface ProjectFormProps {
  mode: 'create' | 'edit'
  initialData?: any
  onSubmit: (data: ProjectFormData) => Promise<void>
  onCancel: () => void
}

export function ProjectForm({ mode, initialData, onSubmit, onCancel }: ProjectFormProps) {
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    description: '',
    status: 'active'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // 초기 데이터 설정
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        status: initialData.status || 'active'
      })
    }
  }, [mode, initialData])

  const statusOptions = [
    { value: 'active', label: '진행 중' },
    { value: 'completed', label: '완료' },
    { value: 'archived', label: '보관됨' },
    { value: 'paused', label: '일시중지' },
  ]

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))

    // 에러 초기화
    if (name in errors) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData['name'].trim()) {
      newErrors['name'] = '프로젝트 이름을 입력해주세요.'
    } else if (formData['name'].length < 2) {
      newErrors['name'] = '프로젝트 이름은 최소 2자 이상이어야 합니다.'
    } else if (formData['name'].length > 100) {
      newErrors['name'] = '프로젝트 이름은 100자를 초과할 수 없습니다.'
    }

    if (formData['description'] && formData['description'].length > 500) {
      newErrors['description'] = '프로젝트 설명은 500자를 초과할 수 없습니다.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      await onSubmit(formData)
    } catch (error) {
      console.error('Form submission error:', error)
      setErrors({
        submit: mode === 'create'
          ? '프로젝트 생성에 실패했습니다.'
          : '프로젝트 수정에 실패했습니다.'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 프로젝트 이름 */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-text-primary mb-2">
          프로젝트 이름 <span className="text-accent-red">*</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          placeholder="프로젝트 이름을 입력하세요"
          className={`w-full px-3 py-2 bg-bg-primary border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-text-primary placeholder-text-muted ${
            'name' in errors ? 'border-accent-red' : 'border-border-primary'
          }`}
          disabled={isSubmitting}
        />
        {errors['name'] && (
          <p className="text-accent-red text-sm mt-1">{errors['name']}</p>
        )}
      </div>

      {/* 프로젝트 설명 */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-text-primary mb-2">
          프로젝트 설명
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          placeholder="프로젝트에 대한 간단한 설명을 입력하세요"
          rows={4}
          className={`w-full px-3 py-2 bg-bg-primary border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-text-primary placeholder-text-muted resize-none ${
            'description' in errors ? 'border-accent-red' : 'border-border-primary'
          }`}
          disabled={isSubmitting}
        />
        {errors['description'] && (
          <p className="text-accent-red text-sm mt-1">{errors['description']}</p>
        )}
        <p className="text-text-muted text-sm mt-1">
          {formData.description.length}/500자
        </p>
      </div>

      {/* 프로젝트 상태 (수정 모드에만 표시) */}
      {mode === 'edit' && (
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-text-primary mb-2">
            프로젝트 상태
          </label>
          <div className="relative">
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="w-full appearance-none bg-bg-primary border border-border-primary rounded-lg px-3 py-2 pr-8 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={isSubmitting}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          </div>
        </div>
      )}

      {/* 프로젝트 생성 시 워크플로우 안내 */}
      {mode === 'create' && (
        <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg p-6">
          <div className="flex items-start space-x-3 mb-4">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Info className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h4 className="font-semibold text-text-primary mb-1">프로젝트 워크플로우</h4>
              <p className="text-text-secondary text-sm leading-relaxed">
                프로젝트를 생성한 후 아래 단계를 진행합니다
              </p>
            </div>
          </div>

          {/* 워크플로우 단계 */}
          <div className="space-y-3 ml-11">
            <div className="flex items-start space-x-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/20 text-purple-500 text-xs font-bold mt-0.5">
                1
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <FileText className="w-4 h-4 text-purple-500" />
                  <h5 className="font-medium text-text-primary text-sm">문서 업로드</h5>
                </div>
                <p className="text-text-secondary text-xs">
                  프로젝트 관련 문서를 업로드합니다 (RFP, 제안요청서 등)
                </p>
              </div>
            </div>

            <div className="ml-3 border-l-2 border-border-primary h-4"></div>

            <div className="flex items-start space-x-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/20 text-purple-500 text-xs font-bold mt-0.5">
                2
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <BarChart3 className="w-4 h-4 text-purple-500" />
                  <h5 className="font-medium text-text-primary text-sm">사전 분석</h5>
                  <span className="px-2 py-0.5 bg-purple-500/20 text-purple-500 text-xs rounded-full font-medium">
                    필수
                  </span>
                </div>
                <p className="text-text-secondary text-xs">
                  AI를 활용한 문서 분석 및 프로젝트 이해도 향상
                </p>
              </div>
            </div>

            <div className="ml-3 border-l-2 border-border-primary h-4"></div>

            <div className="flex items-start space-x-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/20 text-blue-500 text-xs font-bold mt-0.5">
                3
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <ArrowRight className="w-4 h-4 text-blue-500" />
                  <h5 className="font-medium text-text-primary text-sm">제안/구축/운영 진행</h5>
                </div>
                <p className="text-text-secondary text-xs">
                  사전 분석 완료 후 선택 가능한 단계들
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border-secondary">
            <div className="flex items-center space-x-2 text-xs text-text-secondary">
              <Upload className="w-3 h-3" />
              <span>프로젝트 생성 후 바로 문서 업로드와 사전 분석을 시작할 수 있습니다</span>
            </div>
          </div>
        </div>
      )}

      {/* 에러 메시지 */}
      {errors['submit'] && (
        <div className="p-3 bg-accent-red/10 border border-accent-red/20 rounded-lg">
          <p className="text-accent-red text-sm">{errors['submit']}</p>
        </div>
      )}

      {/* 버튼 */}
      <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border-secondary">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-text-secondary hover:text-text-primary border border-border-primary rounded-lg hover:bg-bg-tertiary transition-colors"
          disabled={isSubmitting}
        >
          취소
        </button>
        <button
          type="submit"
          className="flex items-center space-x-2 px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          disabled={isSubmitting}
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>
            {mode === 'create'
              ? (isSubmitting ? '생성 중...' : '프로젝트 생성')
              : (isSubmitting ? '저장 중...' : '변경사항 저장')
            }
          </span>
        </button>
      </div>
    </form>
  )
}
