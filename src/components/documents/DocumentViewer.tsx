import { useState, useEffect, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import {
  FileText,
  Image as ImageIcon,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Type,
  X,
  Search,
  Eye
} from 'lucide-react'
import { ocrService, OCRResult } from '@/services/ocrService'
import { toast } from 'sonner'

// PDF.js worker 설정
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.min.js`

interface DocumentViewerProps {
  document: {
    id: string
    title: string
    file_name: string
    file_type: string
    file_path: string
    file_size: number
    metadata?: any
  }
  url: string
  onClose?: () => void
}

interface ViewerState {
  scale: number
  rotation: number
  pageNumber: number
  numPages: number
  searchText: string
  showOCR: boolean
  ocrResult?: OCRResult
  isOcrProcessing: boolean
  ocrProgress: number
}

export function DocumentViewer({ document, url, onClose }: DocumentViewerProps) {
  const [state, setState] = useState<ViewerState>({
    scale: 1.0,
    rotation: 0,
    pageNumber: 1,
    numPages: 1,
    searchText: '',
    showOCR: false,
    isOcrProcessing: false,
    ocrProgress: 0
  })

  const [, setImageLoaded] = useState(false)
  const [textContent, setTextContent] = useState<string>('')

  const isPDF = document.file_type === 'application/pdf'
  const isImage = document.file_type.startsWith('image/')
  const isText = document.file_type.startsWith('text/')

  // PDF 로드 완료 핸들러
  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setState(prev => ({ ...prev, numPages, pageNumber: 1 }))
  }, [])

  // 텍스트 파일 로드
  useEffect(() => {
    if (isText) {
      fetch(url)
        .then(response => response.text())
        .then(text => setTextContent(text))
        .catch(error => {
          console.error('Text file load error:', error)
          toast.error('텍스트 파일을 로드할 수 없습니다.')
        })
    }
  }, [url, isText])

  // 줌 컨트롤
  const handleZoomIn = () => {
    setState(prev => ({ ...prev, scale: Math.min(prev.scale + 0.2, 3.0) }))
  }

  const handleZoomOut = () => {
    setState(prev => ({ ...prev, scale: Math.max(prev.scale - 0.2, 0.5) }))
  }

  // 회전 컨트롤
  const handleRotate = () => {
    setState(prev => ({ ...prev, rotation: (prev.rotation + 90) % 360 }))
  }

  // 페이지 네비게이션
  const goToPrevPage = () => {
    setState(prev => ({
      ...prev,
      pageNumber: Math.max(prev.pageNumber - 1, 1)
    }))
  }

  const goToNextPage = () => {
    setState(prev => ({
      ...prev,
      pageNumber: Math.min(prev.pageNumber + 1, prev.numPages)
    }))
  }

  // OCR 처리
  const handleOCR = async () => {
    if (!isImage) {
      toast.error('OCR은 이미지 파일에서만 사용할 수 있습니다.')
      return
    }

    setState(prev => ({ ...prev, isOcrProcessing: true, ocrProgress: 0 }))

    try {
      // 이미지 파일을 File 객체로 변환
      const response = await fetch(url)
      const blob = await response.blob()
      const file = new File([blob], document.file_name, { type: document.file_type })

      const result = await ocrService.recognizeFromFile(
        file,
        { language: 'kor+eng' },
        (progress) => {
          setState(prev => ({ ...prev, ocrProgress: progress.progress }))
        }
      )

      setState(prev => ({
        ...prev,
        ocrResult: result,
        showOCR: true,
        isOcrProcessing: false,
        ocrProgress: 100
      }))

      toast.success('OCR 처리가 완료되었습니다.')
    } catch (error) {
      console.error('OCR error:', error)
      toast.error('OCR 처리 중 오류가 발생했습니다.')
      setState(prev => ({ ...prev, isOcrProcessing: false, ocrProgress: 0 }))
    }
  }

  // 다운로드 핸들러
  const handleDownload = () => {
    const link = window.document.createElement('a')
    link.href = url
    link.download = document.file_name
    window.document.body.appendChild(link)
    link.click()
    window.document.body.removeChild(link)
  }

  // 툴바 렌더링
  const renderToolbar = () => (
    <div className="flex items-center justify-between p-4 bg-background-secondary border-b border-border">
      <div className="flex items-center space-x-2">
        <button
          onClick={onClose}
          className="linear-button"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center space-x-2">
          {isPDF && <FileText className="w-5 h-5 text-text-tertiary" />}
          {isImage && <ImageIcon className="w-5 h-5 text-text-tertiary" />}
          {isText && <Type className="w-5 h-5 text-text-tertiary" />}
          <div>
            <h3 className="font-medium text-text-primary">{document.title}</h3>
            <p className="text-xs text-text-tertiary">
              {(document.file_size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {/* 검색 (PDF용) */}
        {isPDF && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-tertiary w-4 h-4" />
            <input
              type="text"
              placeholder="페이지 내 검색..."
              value={state.searchText}
              onChange={(e) => setState(prev => ({ ...prev, searchText: e.target.value }))}
              className="linear-search-input w-48"
            />
          </div>
        )}

        {/* OCR 버튼 (이미지용) */}
        {isImage && (
          <button
            onClick={handleOCR}
            disabled={state.isOcrProcessing}
            className="linear-button"
            title="텍스트 추출 (OCR)"
          >
            {state.isOcrProcessing ? (
              <span className="text-xs">{state.ocrProgress.toFixed(0)}%</span>
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        )}

        {/* 줌 컨트롤 */}
        {(isPDF || isImage) && (
          <>
            <button onClick={handleZoomOut} className="linear-button">
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-sm text-text-tertiary min-w-[60px] text-center">
              {Math.round(state.scale * 100)}%
            </span>
            <button onClick={handleZoomIn} className="linear-button">
              <ZoomIn className="w-4 h-4" />
            </button>
          </>
        )}

        {/* 회전 (이미지용) */}
        {isImage && (
          <button onClick={handleRotate} className="linear-button">
            <RotateCw className="w-4 h-4" />
          </button>
        )}

        {/* 페이지 네비게이션 (PDF용) */}
        {isPDF && state.numPages > 1 && (
          <>
            <button
              onClick={goToPrevPage}
              disabled={state.pageNumber <= 1}
              className="linear-button"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-text-tertiary min-w-[80px] text-center">
              {state.pageNumber} / {state.numPages}
            </span>
            <button
              onClick={goToNextPage}
              disabled={state.pageNumber >= state.numPages}
              className="linear-button"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* 다운로드 */}
        <button onClick={handleDownload} className="linear-button">
          <Download className="w-4 h-4" />
        </button>
      </div>
    </div>
  )

  // PDF 뷰어
  const renderPDFViewer = () => (
    <div className="flex-1 overflow-auto bg-background-tertiary p-4">
      <div className="flex justify-center">
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
            </div>
          }
          error={
            <div className="flex items-center justify-center h-64 text-red-500">
              PDF 파일을 로드할 수 없습니다.
            </div>
          }
        >
          <Page
            pageNumber={state.pageNumber}
            scale={state.scale}
            rotate={state.rotation}
            loading={
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent"></div>
              </div>
            }
          />
        </Document>
      </div>
    </div>
  )

  // 이미지 뷰어
  const renderImageViewer = () => (
    <div className="flex-1 overflow-auto bg-background-tertiary p-4">
      <div className="flex justify-center items-center min-h-full">
        <div
          style={{
            transform: `scale(${state.scale}) rotate(${state.rotation}deg)`,
            transition: 'transform 0.2s ease'
          }}
        >
          <img
            src={url}
            alt={document.title}
            onLoad={() => setImageLoaded(true)}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      </div>

      {/* OCR 결과 오버레이 */}
      {state.showOCR && state.ocrResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background-primary rounded-lg p-6 max-w-2xl max-h-96 overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-text-primary">추출된 텍스트</h4>
              <button
                onClick={() => setState(prev => ({ ...prev, showOCR: false }))}
                className="text-text-tertiary hover:text-text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-text-tertiary">
                신뢰도: {state.ocrResult.confidence.toFixed(1)}%
              </p>
              <div className="bg-background-secondary p-4 rounded border text-sm text-text-primary whitespace-pre-wrap">
                {state.ocrResult.text || '텍스트를 추출할 수 없습니다.'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // 텍스트 뷰어
  const renderTextViewer = () => (
    <div className="flex-1 overflow-auto bg-background-tertiary p-6">
      <div className="max-w-4xl mx-auto">
        <pre className="whitespace-pre-wrap font-mono text-sm text-text-primary leading-relaxed">
          {textContent}
        </pre>
      </div>
    </div>
  )

  // Office 파일 뷰어 (미리보기)
  const renderOfficeViewer = () => (
    <div className="flex-1 flex items-center justify-center bg-background-tertiary">
      <div className="text-center space-y-4">
        <FileText className="w-16 h-16 text-text-tertiary mx-auto" />
        <div>
          <h3 className="font-medium text-text-primary mb-2">Office 파일 미리보기</h3>
          <p className="text-sm text-text-tertiary mb-4">
            이 파일 형식은 현재 미리보기를 지원하지 않습니다.
          </p>
          <button
            onClick={handleDownload}
            className="linear-button linear-button-primary"
          >
            <Download className="w-4 h-4 mr-2" />
            파일 다운로드
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-full bg-background-primary">
      {renderToolbar()}

      {isPDF && renderPDFViewer()}
      {isImage && renderImageViewer()}
      {isText && renderTextViewer()}
      {(document.file_type.includes('word') || document.file_type.includes('office')) && renderOfficeViewer()}
    </div>
  )
}