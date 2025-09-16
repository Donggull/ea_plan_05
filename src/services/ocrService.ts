import { createWorker, PSM, OEM } from 'tesseract.js'

export interface OCROptions {
  language?: string
  psm?: PSM
  oem?: OEM
}

export interface OCRResult {
  text: string
  confidence: number
  words: Array<{
    text: string
    confidence: number
    bbox: {
      x0: number
      y0: number
      x1: number
      y1: number
    }
  }>
  lines: Array<{
    text: string
    confidence: number
    bbox: {
      x0: number
      y0: number
      x1: number
      y1: number
    }
  }>
  paragraphs: Array<{
    text: string
    confidence: number
    bbox: {
      x0: number
      y0: number
      x1: number
      y1: number
    }
  }>
}

export interface OCRProgress {
  status: string
  progress: number
}

class OCRService {
  private worker: Tesseract.Worker | null = null
  private isInitialized = false

  async initialize(options: OCROptions = {}): Promise<void> {
    if (this.isInitialized && this.worker) {
      return
    }

    try {
      this.worker = await createWorker('kor+eng', OEM.LSTM_ONLY, {
        logger: m => {
          // OCR 진행률 로깅 (필요시 콜백으로 전달 가능)
          console.log('OCR:', m)
        }
      })

      await this.worker.setParameters({
        tessedit_pageseg_mode: options.psm || PSM.SINGLE_BLOCK,
        tessedit_ocr_engine_mode: options.oem || OEM.LSTM_ONLY,
        preserve_interword_spaces: '1'
      })

      this.isInitialized = true
      console.log('OCR 서비스가 초기화되었습니다.')
    } catch (error) {
      console.error('OCR 초기화 실패:', error)
      throw new Error('OCR 서비스 초기화에 실패했습니다.')
    }
  }

  async recognizeText(
    imageSource: string | File | ImageData | HTMLCanvasElement | HTMLImageElement,
    options: OCROptions = {},
    onProgress?: (progress: OCRProgress) => void
  ): Promise<OCRResult> {
    await this.initialize(options)

    if (!this.worker) {
      throw new Error('OCR 워커가 초기화되지 않았습니다.')
    }

    try {
      // 진행률 콜백 설정 (Tesseract.js v5+ 지원 필요)
      // if (onProgress) {
      //   this.worker.setOptions({
      //     logger: m => {
      //       onProgress({
      //         status: m.status,
      //         progress: m.progress || 0
      //       })
      //     }
      //   })
      // }

      const { data } = await this.worker.recognize(imageSource)

      return {
        text: data.text,
        confidence: data.confidence,
        words: (data.words || []).map((word: any) => ({
          text: word.text,
          confidence: word.confidence,
          bbox: word.bbox
        })),
        lines: (data.lines || []).map((line: any) => ({
          text: line.text,
          confidence: line.confidence,
          bbox: line.bbox
        })),
        paragraphs: (data.paragraphs || []).map((paragraph: any) => ({
          text: paragraph.text,
          confidence: paragraph.confidence,
          bbox: paragraph.bbox
        }))
      }
    } catch (error) {
      console.error('OCR 인식 실패:', error)
      throw new Error('텍스트 인식에 실패했습니다.')
    }
  }

  async recognizeFromFile(
    file: File,
    options: OCROptions = {},
    onProgress?: (progress: OCRProgress) => void
  ): Promise<OCRResult> {
    // 파일 타입 검증
    if (!file.type.startsWith('image/')) {
      throw new Error('이미지 파일만 OCR 처리가 가능합니다.')
    }

    // 파일 크기 검증 (10MB 제한)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('파일 크기가 너무 큽니다. 10MB 이하의 파일만 처리 가능합니다.')
    }

    return this.recognizeText(file, options, onProgress)
  }

  async recognizeFromPDF(
    _pdfFile: File,
    _pageNumber: number = 1,
    _options: OCROptions = {},
    _onProgress?: (progress: OCRProgress) => void
  ): Promise<OCRResult> {
    // PDF OCR 기능은 향후 구현 예정
    throw new Error('PDF OCR 기능은 현재 개발 중입니다.')
  }

  async batchRecognize(
    files: File[],
    options: OCROptions = {},
    onProgress?: (fileIndex: number, progress: OCRProgress) => void
  ): Promise<OCRResult[]> {
    const results: OCRResult[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      try {
        const result = await this.recognizeFromFile(
          file,
          options,
          (progress) => onProgress?.(i, progress)
        )
        results.push(result)
      } catch (error) {
        console.error(`OCR 실패 - 파일 ${file.name}:`, error)
        // 실패한 파일에 대해서는 빈 결과 추가
        results.push({
          text: '',
          confidence: 0,
          words: [],
          lines: [],
          paragraphs: []
        })
      }
    }

    return results
  }

  async extractTextWithLayout(
    imageSource: string | File | ImageData | HTMLCanvasElement | HTMLImageElement,
    options: OCROptions = {}
  ): Promise<{
    text: string
    layout: Array<{
      type: 'paragraph' | 'line' | 'word'
      text: string
      confidence: number
      position: {
        x: number
        y: number
        width: number
        height: number
      }
    }>
  }> {
    const result = await this.recognizeText(imageSource, options)

    const layout = [
      ...result.paragraphs.map(p => ({
        type: 'paragraph' as const,
        text: p.text,
        confidence: p.confidence,
        position: {
          x: p.bbox.x0,
          y: p.bbox.y0,
          width: p.bbox.x1 - p.bbox.x0,
          height: p.bbox.y1 - p.bbox.y0
        }
      })),
      ...result.lines.map(l => ({
        type: 'line' as const,
        text: l.text,
        confidence: l.confidence,
        position: {
          x: l.bbox.x0,
          y: l.bbox.y0,
          width: l.bbox.x1 - l.bbox.x0,
          height: l.bbox.y1 - l.bbox.y0
        }
      })),
      ...result.words.map(w => ({
        type: 'word' as const,
        text: w.text,
        confidence: w.confidence,
        position: {
          x: w.bbox.x0,
          y: w.bbox.y0,
          width: w.bbox.x1 - w.bbox.x0,
          height: w.bbox.y1 - w.bbox.y0
        }
      }))
    ]

    return {
      text: result.text,
      layout
    }
  }

  async cleanup(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate()
      this.worker = null
      this.isInitialized = false
      console.log('OCR 워커가 정리되었습니다.')
    }
  }

  // 이미지 전처리 유틸리티
  async preprocessImage(
    file: File,
    options: {
      resize?: { width: number; height: number }
      grayscale?: boolean
      contrast?: number
      brightness?: number
    } = {}
  ): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas context를 생성할 수 없습니다.'))
        return
      }

      const img = new Image()
      img.onload = () => {
        // 캔버스 크기 설정
        if (options.resize) {
          canvas.width = options.resize.width
          canvas.height = options.resize.height
        } else {
          canvas.width = img.width
          canvas.height = img.height
        }

        // 이미지 그리기
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        // 이미지 필터 적용
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data

        for (let i = 0; i < data.length; i += 4) {
          let r = data[i]
          let g = data[i + 1]
          let b = data[i + 2]

          // 그레이스케일 변환
          if (options.grayscale) {
            const gray = 0.299 * r + 0.587 * g + 0.114 * b
            r = g = b = gray
          }

          // 밝기 조절
          if (options.brightness !== undefined) {
            r = Math.min(255, Math.max(0, r + options.brightness))
            g = Math.min(255, Math.max(0, g + options.brightness))
            b = Math.min(255, Math.max(0, b + options.brightness))
          }

          // 대비 조절
          if (options.contrast !== undefined) {
            const factor = (259 * (options.contrast + 255)) / (255 * (259 - options.contrast))
            r = Math.min(255, Math.max(0, factor * (r - 128) + 128))
            g = Math.min(255, Math.max(0, factor * (g - 128) + 128))
            b = Math.min(255, Math.max(0, factor * (b - 128) + 128))
          }

          data[i] = r
          data[i + 1] = g
          data[i + 2] = b
        }

        ctx.putImageData(imageData, 0, 0)

        // 캔버스를 Blob으로 변환
        canvas.toBlob((blob) => {
          if (blob) {
            const processedFile = new File([blob], file.name, {
              type: 'image/png',
              lastModified: Date.now()
            })
            resolve(processedFile)
          } else {
            reject(new Error('이미지 처리에 실패했습니다.'))
          }
        }, 'image/png')
      }

      img.onerror = () => reject(new Error('이미지를 로드할 수 없습니다.'))
      img.src = URL.createObjectURL(file)
    })
  }
}

export const ocrService = new OCRService()

// 컴포넌트 언마운트 시 정리를 위한 전역 정리 함수
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    ocrService.cleanup()
  })
}