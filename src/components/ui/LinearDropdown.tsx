import { useState, useRef, useEffect, ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface DropdownOption {
  value: string
  label: string
  description?: string
  icon?: ReactNode
  disabled?: boolean
  meta?: ReactNode
}

interface LinearDropdownProps {
  options: DropdownOption[]
  value?: string
  placeholder?: string
  onSelect: (value: string) => void
  disabled?: boolean
  className?: string
  variant?: 'default' | 'compact'
  icon?: ReactNode
  error?: boolean
  showSearch?: boolean
  maxHeight?: string
}

export function LinearDropdown({
  options,
  value,
  placeholder = '선택해주세요',
  onSelect,
  disabled = false,
  className,
  variant = 'default',
  icon,
  error = false,
  showSearch = false,
  maxHeight = 'max-h-60'
}: LinearDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find(option => option.value === value)

  // 검색 필터링
  const filteredOptions = showSearch
    ? options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        option.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options

  // 외부 클릭 감지
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ESC 키 감지
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }

    // isOpen이 false일 때는 cleanup function이 필요 없음
    return undefined
  }, [isOpen])

  const handleSelect = (optionValue: string) => {
    onSelect(optionValue)
    setIsOpen(false)
    setSearchTerm('')
  }

  const buttonSize = variant === 'compact' ? 'p-2' : 'p-3'
  const iconSize = variant === 'compact' ? 'w-4 h-4' : 'w-5 h-5'

  return (
    <div ref={dropdownRef} className={cn("relative", className)}>
      {/* 드롭다운 버튼 */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "w-full flex items-center justify-between rounded-lg transition-all duration-200",
          buttonSize,
          // Linear 테마 스타일 적용
          "bg-background-secondary border border-border text-text-primary",
          "hover:bg-background-tertiary hover:border-border-hover",
          "focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent",
          error && "border-red-500 focus:ring-red-500",
          disabled && "opacity-50 cursor-not-allowed",
          isOpen && "border-accent ring-2 ring-accent/20"
        )}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {icon && (
            <div className={cn("flex-shrink-0 text-text-tertiary", iconSize)}>
              {icon}
            </div>
          )}
          <span className={cn(
            "truncate text-left",
            selectedOption ? "text-text-primary" : "text-text-tertiary"
          )}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.meta && (
            <div className="ml-auto flex-shrink-0">
              {selectedOption.meta}
            </div>
          )}
        </div>
        <ChevronDown
          className={cn(
            "flex-shrink-0 transition-transform duration-200 text-text-tertiary",
            iconSize,
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* 드롭다운 메뉴 */}
      {isOpen && (
        <div className={cn(
          "absolute top-full left-0 right-0 mt-1 z-50",
          "bg-background-primary border border-border rounded-lg",
          "shadow-2xl drop-shadow-2xl ring-1 ring-black/20",
          "backdrop-blur-md",
          "overflow-hidden"
        )}>
          {/* 검색 입력 */}
          {showSearch && (
            <div className="p-3 border-b border-border bg-background-primary">
              <input
                type="text"
                placeholder="검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 bg-background-secondary border border-border rounded text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                autoFocus
              />
            </div>
          )}

          {/* 옵션 목록 */}
          <div className={cn("overflow-y-auto", maxHeight)}>
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-text-tertiary bg-background-primary">
                {showSearch ? '검색 결과가 없습니다' : '옵션이 없습니다'}
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option.value === value
                const isDisabled = option.disabled

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => !isDisabled && handleSelect(option.value)}
                    disabled={isDisabled}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 text-left transition-colors",
                      "border-b border-border last:border-b-0 bg-background-primary",
                      isSelected
                        ? "bg-accent/20 text-accent border-accent/30"
                        : "text-text-primary hover:bg-background-secondary",
                      isDisabled && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {option.icon && (
                      <div className={cn("flex-shrink-0", iconSize)}>
                        {option.icon}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          "truncate font-medium",
                          isSelected ? "text-accent" : "text-text-primary"
                        )}>
                          {option.label}
                        </span>
                        {option.meta && (
                          <div className="ml-2 flex-shrink-0">
                            {option.meta}
                          </div>
                        )}
                      </div>
                      {option.description && (
                        <p className={cn(
                          "text-sm truncate mt-0.5",
                          isSelected ? "text-accent/70" : "text-text-tertiary"
                        )}>
                          {option.description}
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-accent rounded-full"></div>
                      </div>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}