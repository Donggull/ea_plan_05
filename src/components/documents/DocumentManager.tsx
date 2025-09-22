import { useState, useEffect } from 'react'
import {
  Upload,
  Search,
  Grid,
  List,
  Folder,
  File,
  Image,
  FileText,
  Trash2,
  Eye,
  Download
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { DocumentUploader } from './DocumentUploader'
import { DocumentViewer } from './DocumentViewer'
import { LinearDropdown, DropdownOption } from '@/components/ui/LinearDropdown'
import { fileService } from '@/services/fileService'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'

interface Document {
  id: string
  file_name: string
  storage_path: string
  file_size: number
  mime_type: string
  file_type?: string | null
  project_id?: string
  uploaded_by?: string | null
  created_at: string | null
  updated_at: string | null
  metadata?: any
  is_processed?: boolean | null
  version?: number | null
  parent_id?: string | null
  project?: {
    id: string
    name: string
    description?: string | null
  }
}

interface DocumentManagerProps {
  projectId?: string
  showUploader?: boolean
  viewMode?: 'grid' | 'list'
  onDocumentChange?: () => void
}

export function DocumentManager({
  projectId,
  showUploader = true,
  viewMode: initialViewMode = 'grid',
  onDocumentChange
}: DocumentManagerProps) {
  const { user } = useAuthStore()
  const [documents, setDocuments] = useState<Document[]>([])
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState(initialViewMode)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)


  // 파일 타입 필터 옵션
  const filterOptions: DropdownOption[] = [
    { value: 'all', label: '모든 파일', icon: <Folder className="w-4 h-4" /> },
    { value: 'pdf', label: 'PDF', icon: <FileText className="w-4 h-4" /> },
    { value: 'image', label: '이미지', icon: <Image className="w-4 h-4" /> },
    { value: 'text', label: '텍스트', icon: <File className="w-4 h-4" /> },
    { value: 'office', label: 'Office', icon: <FileText className="w-4 h-4" /> }
  ]

  // 문서 목록 로드
  const loadDocuments = async () => {
    if (!user) return

    try {
      setLoading(true)

      if (!supabase) return

      let query = supabase
        .from('documents')
        .select(`
          *,
          project:projects(
            id,
            name,
            description
          )
        `)
        .order('created_at', { ascending: false })

      if (projectId) {
        query = query.eq('project_id', projectId)
      } else {
        query = query.eq('uploaded_by', user.id)
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      setDocuments((data || []) as unknown as Document[])
      onDocumentChange?.() // 문서 목록 변경 알림
    } catch (error) {
      console.error('문서 로드 실패:', error)
      toast.error('문서 목록을 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 컴포넌트 마운트 시 문서 로드
  useEffect(() => {
    loadDocuments()
  }, [user, projectId])

  // 검색 및 필터링
  useEffect(() => {
    let filtered = documents

    // 검색어 필터링
    if (searchTerm) {
      filtered = filtered.filter(doc =>
        doc.file_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // 파일 타입 필터링
    if (filterType !== 'all') {
      filtered = filtered.filter(doc => {
        switch (filterType) {
          case 'pdf':
            return doc.mime_type === 'application/pdf'
          case 'image':
            return doc.mime_type?.startsWith('image/')
          case 'text':
            return doc.mime_type?.startsWith('text/')
          case 'office':
            return doc.mime_type?.includes('word') || doc.mime_type?.includes('office')
          default:
            return true
        }
      })
    }

    setFilteredDocuments(filtered)
  }, [documents, searchTerm, filterType])

  // 파일 아이콘 가져오기
  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/pdf') return FileText
    if (mimeType?.startsWith('image/')) return Image
    if (mimeType?.startsWith('text/')) return FileText
    return File
  }

  // 파일 크기 포맷팅
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 문서 삭제
  const handleDeleteDocument = async (document: Document) => {
    if (!confirm(`"${document.file_name}" 파일을 삭제하시겠습니까?`)) {
      return
    }

    try {
      await fileService.deleteFile(document.id)
      await loadDocuments()
      toast.success('문서가 삭제되었습니다.')
    } catch (error) {
      console.error('문서 삭제 실패:', error)
      toast.error('문서 삭제에 실패했습니다.')
    }
  }

  // 문서 다운로드
  const handleDownloadDocument = async (document: Document) => {
    try {
      if (!supabase) return

      const { data } = supabase.storage
        .from('documents')
        .getPublicUrl(document.storage_path)

      if (!data?.publicUrl) return

      const link = window.document.createElement('a')
      link.href = data.publicUrl
      link.download = document.file_name
      window.document.body.appendChild(link)
      link.click()
      window.document.body.removeChild(link)
    } catch (error) {
      console.error('문서 다운로드 실패:', error)
      toast.error('문서 다운로드에 실패했습니다.')
    }
  }

  // 그리드 뷰 렌더링
  const renderGridView = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      {filteredDocuments.map((document) => {
        const FileIcon = getFileIcon(document.mime_type)

        return (
          <div
            key={document.id}
            className="bg-background-secondary rounded-lg border border-border hover:border-accent/50 transition-colors cursor-pointer group"
          >
            {/* 썸네일/아이콘 영역 */}
            <div
              className="h-20 p-3 flex items-center justify-center bg-background-tertiary rounded-t-lg"
              onClick={() => setSelectedDocument(document)}
            >
              <FileIcon className="w-8 h-8 text-text-tertiary" />
            </div>

            {/* 정보 영역 */}
            <div className="p-3">
              <h4
                className="font-medium text-text-primary text-sm leading-tight mb-2 cursor-pointer hover:text-accent"
                onClick={() => setSelectedDocument(document)}
                title={document.file_name}
                style={{
                  wordBreak: 'break-word',
                  minHeight: '2.5rem',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}
              >
                {document.file_name}
              </h4>
              {document.project && !projectId && (
                <div className="flex items-center space-x-1 mb-1">
                  <Folder className="w-3 h-3 text-accent flex-shrink-0" />
                  <span className="text-xs text-accent truncate">
                    {document.project.name}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-text-tertiary">
                <span>{formatFileSize(document.file_size)}</span>
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setSelectedDocument(document)}
                    className="p-1 hover:bg-background-tertiary rounded"
                    title="미리보기"
                  >
                    <Eye className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleDownloadDocument(document)}
                    className="p-1 hover:bg-background-tertiary rounded"
                    title="다운로드"
                  >
                    <Download className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleDeleteDocument(document)}
                    className="p-1 hover:bg-background-tertiary rounded text-red-500"
                    title="삭제"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-text-tertiary mt-1">
                {document.created_at && formatDistanceToNow(new Date(document.created_at), {
                  addSuffix: true,
                  locale: ko
                })}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )

  // 리스트 뷰 렌더링
  const renderListView = () => (
    <div className="space-y-2">
      {filteredDocuments.map((document) => {
        const FileIcon = getFileIcon(document.mime_type)

        return (
          <div
            key={document.id}
            className="flex items-center p-3 bg-background-secondary rounded-lg border border-border hover:border-accent/50 transition-colors group"
          >
            <FileIcon className="w-6 h-6 text-text-tertiary mr-3 flex-shrink-0" />

            <div className="flex-1 min-w-0">
              <h4
                className="font-medium text-text-primary cursor-pointer hover:text-accent break-words"
                onClick={() => setSelectedDocument(document)}
                title={document.file_name}
                style={{ wordBreak: 'break-word' }}
              >
                {document.file_name}
              </h4>
              <div className="flex items-center space-x-4 text-xs text-text-tertiary mt-1">
                <span>{formatFileSize(document.file_size)}</span>
                {document.project && !projectId && (
                  <>
                    <div className="flex items-center space-x-1">
                      <Folder className="w-3 h-3 text-accent" />
                      <span className="text-accent">
                        {document.project.name}
                      </span>
                    </div>
                  </>
                )}
                <span>
                  {document.created_at && formatDistanceToNow(new Date(document.created_at), {
                    addSuffix: true,
                    locale: ko
                  })}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setSelectedDocument(document)}
                className="linear-button"
                title="미리보기"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDownloadDocument(document)}
                className="linear-button"
                title="다운로드"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDeleteDocument(document)}
                className="linear-button text-red-500"
                title="삭제"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-text-primary">
            문서 관리
          </h2>
          <span className="text-sm text-text-tertiary">
            총 {filteredDocuments.length}개 문서
          </span>
        </div>

        {showUploader && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="linear-button linear-button-primary"
          >
            <Upload className="w-4 h-4 mr-2" />
            파일 업로드
          </button>
        )}
      </div>

      {/* 검색 및 필터 */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-tertiary w-4 h-4" />
          <input
            type="text"
            placeholder="문서 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="linear-search-input"
          />
        </div>

        <LinearDropdown
          options={filterOptions}
          value={filterType}
          onSelect={setFilterType}
          variant="compact"
          className="w-32"
        />

        <div className="flex items-center space-x-1 border border-border rounded-lg">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 ${viewMode === 'grid' ? 'bg-accent text-white' : 'text-text-tertiary'}`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 ${viewMode === 'list' ? 'bg-accent text-white' : 'text-text-tertiary'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 문서 목록 */}
      {filteredDocuments.length === 0 ? (
        <div className="text-center py-12">
          <Folder className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-primary mb-2">
            문서가 없습니다
          </h3>
          <p className="text-text-tertiary mb-4">
            첫 번째 문서를 업로드해보세요.
          </p>
          {showUploader && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="linear-button linear-button-primary"
            >
              <Upload className="w-4 h-4 mr-2" />
              파일 업로드
            </button>
          )}
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? renderGridView() : renderListView()}
        </>
      )}

      {/* 업로드 모달 */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-background-primary rounded-lg p-6 max-w-4xl w-full max-h-[85vh] overflow-auto shadow-2xl border border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-primary">
                파일 업로드
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-text-tertiary hover:text-text-primary"
              >
                ×
              </button>
            </div>
            <DocumentUploader
              projectId={projectId}
              allowProjectSelection={!projectId}
              onUploadComplete={(files) => {
                setShowUploadModal(false)
                loadDocuments()
                toast.success(`${files.length}개 파일이 업로드되었습니다.`)
              }}
            />
          </div>
        </div>
      )}

      {/* 문서 뷰어 모달 */}
      {selectedDocument && (
        <div className="fixed inset-0 bg-black/50 z-50">
          <div className="h-full">
            <DocumentViewer
              document={{
                ...selectedDocument,
                title: selectedDocument.file_name,
                file_type: selectedDocument.mime_type,
                file_path: selectedDocument.storage_path
              }}
              url={supabase?.storage
                .from('documents')
                .getPublicUrl(selectedDocument.storage_path).data.publicUrl || ''}
              onClose={() => setSelectedDocument(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}