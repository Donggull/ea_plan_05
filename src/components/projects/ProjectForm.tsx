import React, { useState, useEffect } from 'react'
import { ChevronDown, Loader2 } from 'lucide-react'
import { ProjectStageSelector } from './ProjectStageSelector'
import { ProjectStageSelection } from '../../types/project'

interface ProjectFormData {
  name: string
  description: string
  status: string
  stageSelection?: ProjectStageSelection
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
    status: 'active',
    stageSelection: {
      selectedTypes: [],
      selectedSteps: [],
      enableConnectedMode: false
    }
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // 초기 데이터 설정
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        status: initialData.status || 'active',
        stageSelection: initialData.stageSelection || {
          selectedTypes: [],
          selectedSteps: [],
          enableConnectedMode: false
        }
      })
    }
  }, [mode, initialData])

  const handleStageSelectionChange = (stageSelection: ProjectStageSelection) => {
    setFormData(prev => ({
      ...prev,
      stageSelection
    }))
  }

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

    // 프로젝트 생성 시에만 단계 선택 검증
    if (mode === 'create' && formData.stageSelection) {
      if (formData.stageSelection.selectedTypes.length === 0) {
        newErrors['stageSelection'] = '최소 하나의 프로젝트 타입을 선택해주세요.'
      } else if (formData.stageSelection.selectedSteps.length === 0) {
        newErrors['stageSelection'] = '최소 하나의 워크플로우 단계를 선택해주세요.'
      }
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

      {/* 프로젝트 상태 */}
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

      {/* 프로젝트 단계 선택 */}
      <div>
        <ProjectStageSelector
          selection={formData.stageSelection!}
          onChange={handleStageSelectionChange}
          disabled={isSubmitting}
          mode={mode}
          protectedSteps={initialData?.protectedSteps || []}
        />
        {errors['stageSelection'] && (
          <p className="text-accent-red text-sm mt-2">{errors['stageSelection']}</p>
        )}
      </div>

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
          className="flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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