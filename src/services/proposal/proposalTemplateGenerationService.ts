import { supabase } from '../../lib/supabase'
import { ProposalDataManager } from './dataManager'
import { ProposalTemplateService } from './proposalTemplateService'

export interface TemplateGenerationPhase {
  phase: number
  totalPhases: number
  status: 'pending' | 'in_progress' | 'completed' | 'error'
  sectionTitle: string
  generatedContent?: string
  error?: string
}

export interface TemplateGenerationProgress {
  projectId: string
  templateId: string
  phases: TemplateGenerationPhase[]
  currentPhase: number
  overallStatus: 'preparing' | 'generating' | 'completed' | 'error'
  startedAt: string
  completedAt?: string
}

export interface SlideContent {
  sectionId: string
  title: string
  content: string
  order: number
  visualElements?: string[] // 시각적 요소 제안 (차트, 이미지 등)
}

export interface GenerateTemplateProposalParams {
  projectId: string
  templateId: string
  originalProposal: any // 1차 제안서 데이터
  userId: string
  aiProvider: string
  aiModel: string
  onProgress?: (progress: TemplateGenerationProgress) => void // 진행 상황 콜백
}

export class ProposalTemplateGenerationService {
  /**
   * 템플릿 기반 제안서 생성 시작
   * 1차 제안서 내용을 선택된 템플릿 스타일에 맞게 AI로 재생성
   */
  static async generateTemplateProposal(
    params: GenerateTemplateProposalParams
  ): Promise<TemplateGenerationProgress> {
    const { projectId, templateId, originalProposal, userId, aiProvider, aiModel, onProgress } = params

    // 🚨 코드 버전 확인용 로그 (브라우저 캐시 문제 확인)
    console.log('🚨🚨🚨 [VERSION CHECK] 재시도 메커니즘 + XML 폴백 버전 (2025-10-15) 🚨🚨🚨')
    console.log('🎨 템플릿 기반 제안서 생성 시작:', {
      projectId,
      templateId,
      sectionsCount: originalProposal.sections?.length || 0,
      timestamp: new Date().toISOString()
    })

    // 1. 템플릿 정보 조회
    const template = await ProposalTemplateService.getTemplateById(templateId)
    console.log('📋 템플릿 정보:', template.name, template.template_type)

    // 2. Phase 초기화 (각 섹션마다 1개 Phase)
    const sections = originalProposal.sections || []
    const phases: TemplateGenerationPhase[] = sections.map((section: any, index: number) => ({
      phase: index + 1,
      totalPhases: sections.length,
      status: 'pending' as const,
      sectionTitle: section.title
    }))

    const progress: TemplateGenerationProgress = {
      projectId,
      templateId,
      phases,
      currentPhase: 0,
      overallStatus: 'preparing',
      startedAt: new Date().toISOString()
    }

    // 3. 각 섹션별로 순차적으로 생성
    progress.overallStatus = 'generating'
    const generatedSlides: SlideContent[] = []
    let successCount = 0
    let errorCount = 0

    // 초기 진행 상황 전달
    if (onProgress) {
      onProgress({ ...progress })
    }

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i]
      progress.currentPhase = i + 1
      progress.phases[i].status = 'in_progress'

      // 진행 상황 업데이트 (Phase 시작)
      if (onProgress) {
        onProgress({ ...progress })
      }

      try {
        console.log(`\n📄 Phase ${i + 1}/${sections.length}: "${section.title}" 생성 중...`)

        // AI로 슬라이드 내용 생성
        const slideContent = await this.generateSlideContent({
          section,
          templateType: template.template_type,
          templateStyle: template.description || '',
          aiProvider,
          aiModel
        })

        generatedSlides.push(slideContent)
        progress.phases[i].status = 'completed'
        progress.phases[i].generatedContent = slideContent.content
        successCount++

        console.log(`✅ Phase ${i + 1}/${sections.length} 완료 (성공: ${successCount}, 실패: ${errorCount})`)

        // 진행 상황 업데이트 (Phase 완료)
        if (onProgress) {
          onProgress({ ...progress })
        }

      } catch (error) {
        console.error(`❌ Phase ${i + 1} 실패:`, error)
        progress.phases[i].status = 'error'
        progress.phases[i].error = error instanceof Error ? error.message : String(error)
        errorCount++

        // 오류 발생 시에도 fallback 슬라이드 추가 (프로세스 계속 진행)
        const fallbackSlide: SlideContent = {
          sectionId: section.id,
          title: section.title,
          content: `<div class="generation-error"><p>⚠️ 이 섹션은 AI 생성 중 오류가 발생했습니다.</p><p>원본 내용을 그대로 표시합니다.</p><hr/>${section.content}</div>`,
          order: section.order,
          visualElements: []
        }
        generatedSlides.push(fallbackSlide)

        console.warn(`⚠️ Phase ${i + 1} fallback 사용 (성공: ${successCount}, 실패: ${errorCount})`)

        // 진행 상황 업데이트 (오류 포함)
        if (onProgress) {
          onProgress({ ...progress })
        }
      }
    }

    console.log(`\n📊 생성 완료: 전체 ${sections.length}개 중 성공 ${successCount}개, 실패 ${errorCount}개`)

    // 4. 생성된 슬라이드들을 ai_analysis 테이블에 저장
    progress.overallStatus = 'completed'
    progress.completedAt = new Date().toISOString()

    await this.saveGeneratedProposal({
      projectId,
      templateId,
      originalProposal,
      generatedSlides,
      userId,
      aiProvider,
      aiModel
    })

    console.log('✅ 템플릿 기반 제안서 생성 완료!')
    return progress
  }

  /**
   * AI를 사용하여 개별 슬라이드 내용 생성 (재시도 메커니즘 포함)
   */
  private static async generateSlideContent(params: {
    section: any
    templateType: string
    templateStyle: string
    aiProvider: string
    aiModel: string
  }): Promise<SlideContent> {
    const { section, templateType, templateStyle, aiProvider, aiModel } = params

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`📝 슬라이드 생성 시작: "${section.title}"`)
    console.log(`   ⚙️ 재시도 메커니즘: 활성화 (최대 3회)`)
    console.log(`   ⚙️ XML 폴백: 활성화`)
    console.log(`   AI 모델: ${aiProvider}/${aiModel}`)
    console.log(`   템플릿: ${templateType}`)
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

    const maxRetries = 3 // 최대 재시도 횟수
    let lastError: Error | null = null

    // JSON 형식으로 최대 3회 시도
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`\n🔄 JSON 시도 ${attempt}/${maxRetries}`)

        // JSON 프롬프트 생성
        const jsonPrompt = this.createSlideGenerationPrompt({
          sectionTitle: section.title,
          sectionContent: section.content,
          templateType,
          templateStyle
        })

        console.log(`   프롬프트 길이: ${jsonPrompt.length}자`)

        // AI API 호출
        const generatedContent = await this.callStreamingAPI(
          aiProvider,
          aiModel,
          jsonPrompt,
          2000
        )

        console.log(`   ✅ AI 응답 수신 완료: ${generatedContent.length}자`)
        console.log(`\n┌─────────────────────────────────────────────`)
        console.log(`│ 📄 AI 응답 전체 내용 (시도 ${attempt}/${maxRetries}):`)
        console.log(`├─────────────────────────────────────────────`)
        console.log(generatedContent)
        console.log(`└─────────────────────────────────────────────\n`)

        // JSON 파싱 시도
        console.log(`   🔍 JSON 파싱 시도 중...`)
        const parsed = this.parseGeneratedSlideContent(generatedContent)

        // 파싱 성공
        console.log(`   ✅ JSON 파싱 성공 (시도 ${attempt}): "${parsed.title}"`)

        return {
          sectionId: section.id,
          title: parsed.title || section.title,
          content: parsed.content,
          order: section.order,
          visualElements: parsed.visualElements
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        console.warn(`   ⚠️ JSON 시도 ${attempt} 실패:`, lastError.message)

        if (attempt < maxRetries) {
          console.log(`   🔄 재시도 중... (${attempt + 1}/${maxRetries})`)
          await new Promise(resolve => setTimeout(resolve, 1000)) // 1초 대기
        }
      }
    }

    // JSON 방식 모두 실패 - XML 형식으로 폴백
    console.warn(`\n⚠️ JSON 방식 ${maxRetries}회 모두 실패, XML 형식으로 전환`)

    try {
      // XML 프롬프트 생성
      const xmlPrompt = this.createXmlSlideGenerationPrompt({
        sectionTitle: section.title,
        sectionContent: section.content,
        templateType,
        templateStyle
      })

      console.log(`   XML 프롬프트 길이: ${xmlPrompt.length}자`)

      // AI API 호출
      const xmlContent = await this.callStreamingAPI(
        aiProvider,
        aiModel,
        xmlPrompt,
        2000
      )

      console.log(`   XML 응답 길이: ${xmlContent.length}자`)
      console.log(`   XML 응답 전체:\n`, xmlContent)

      // XML 파싱
      const parsed = this.parseXmlSlideContent(xmlContent)

      console.log(`   ✅ XML 파싱 성공: "${parsed.title}"`)

      return {
        sectionId: section.id,
        title: parsed.title || section.title,
        content: parsed.content,
        order: section.order,
        visualElements: parsed.visualElements
      }
    } catch (xmlError) {
      console.error(`   ❌ XML 방식도 실패:`, xmlError)

      // 최종 폴백: 원본 내용 사용
      return {
        sectionId: section.id,
        title: section.title,
        content: `<div class="error-fallback"><p>⚠️ AI 생성에 여러 번 실패했습니다.</p><p>원본 내용을 표시합니다:</p><hr/>${section.content}</div>`,
        order: section.order,
        visualElements: []
      }
    }
  }

  /**
   * 백엔드 API를 통한 AI 스트리밍 호출
   */
  private static async callStreamingAPI(
    provider: string,
    model: string,
    prompt: string,
    maxTokens: number
  ): Promise<string> {
    const apiUrl = process.env['NODE_ENV'] === 'production'
      ? '/api/ai/completion-streaming'
      : 'http://localhost:3000/api/ai/completion-streaming'

    console.log(`🌐 [API] 요청 시작:`, {
      url: apiUrl,
      provider,
      model,
      maxTokens,
      promptLength: prompt.length
    })

    return new Promise((resolve, reject) => {
      let fullContent = ''
      let eventCount = 0
      let contentEventCount = 0

      // 타임아웃 설정 (30초)
      const timeout = setTimeout(() => {
        console.error(`⏱️ [API] 타임아웃 발생 (30초)`)
        console.error(`   이벤트 수신: ${eventCount}개, content 이벤트: ${contentEventCount}개`)
        reject(new Error('AI API 타임아웃 (30초)'))
      }, 30000)

      fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          model,
          prompt,
          maxTokens,
          temperature: 0.7,
          topP: 1
        })
      })
        .then(response => {
          console.log(`✅ [API] HTTP 응답 수신: ${response.status}`)

          if (!response.ok) {
            throw new Error(`API 요청 실패: ${response.status}`)
          }

          const reader = response.body?.getReader()
          if (!reader) {
            throw new Error('스트림 리더를 생성할 수 없습니다')
          }

          const decoder = new TextDecoder()
          console.log(`📖 [API] 스트림 리더 생성 완료, 읽기 시작...`)

          function readStream(): Promise<void> {
            return reader!.read().then(({ done, value }) => {
              if (done) {
                clearTimeout(timeout)
                console.log(`✅ [API] 스트림 종료`)
                console.log(`   총 이벤트: ${eventCount}개, content: ${contentEventCount}개`)
                console.log(`   누적 content 길이: ${fullContent.length}자`)
                resolve(fullContent)
                return
              }

              const chunk = decoder.decode(value, { stream: true })
              console.log(`📦 [API] 청크 수신: ${chunk.length}바이트`)

              const lines = chunk.split('\n')
              console.log(`   라인 수: ${lines.length}개`)

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  eventCount++
                  try {
                    const jsonStr = line.slice(6)
                    console.log(`   📨 SSE 이벤트 #${eventCount}: ${jsonStr.substring(0, 100)}...`)

                    const data = JSON.parse(jsonStr)

                    if (data.type === 'content') {
                      contentEventCount++
                      fullContent += data.content
                      console.log(`   ✅ content 이벤트 #${contentEventCount}: +${data.content.length}자 (누적: ${fullContent.length}자)`)
                    } else if (data.type === 'error') {
                      clearTimeout(timeout)
                      console.error(`   ❌ error 이벤트:`, data.error)
                      reject(new Error(data.error))
                      return
                    } else if (data.type === 'done') {
                      clearTimeout(timeout)
                      console.log(`   ✅ done 이벤트 수신 (최종 content: ${fullContent.length}자)`)
                      resolve(fullContent)
                      return
                    } else {
                      console.warn(`   ⚠️ 알 수 없는 이벤트 타입: ${data.type}`)
                    }
                  } catch (e) {
                    // JSON 파싱 오류는 무시 (불완전한 청크)
                    console.warn(`   ⚠️ JSON 파싱 실패 (불완전한 청크일 가능성)`)
                  }
                }
              }

              return readStream()
            })
          }

          return readStream()
        })
        .catch(error => {
          clearTimeout(timeout)
          console.error('❌ [API] 호출 오류:', error)
          reject(error)
        })
    })
  }

  /**
   * 슬라이드 생성을 위한 AI 프롬프트 생성 (JSON 형식)
   */
  private static createSlideGenerationPrompt(params: {
    sectionTitle: string
    sectionContent: string
    templateType: string
    templateStyle: string
  }): string {
    const { sectionTitle, sectionContent, templateType, templateStyle } = params

    // HTML 태그 제거
    const cleanContent = sectionContent.replace(/<[^>]*>/g, '').substring(0, 1000)

    return `You are a professional business presentation creator. Generate a JSON response ONLY.

CRITICAL INSTRUCTIONS - READ CAREFULLY:
1. You MUST return ONLY valid JSON - no explanations, no comments, no markdown
2. Start your response with { and end with }
3. Do NOT write anything before { or after }
4. Use double quotes (") for all strings
5. Escape special characters: \\ for backslash, \" for quotes
6. NO markdown code blocks like \`\`\`json

Task: Rewrite this proposal section for ${templateType} style presentation.

Template: ${templateStyle}
Original Title: ${sectionTitle}
Original Content: ${cleanContent}

Requirements:
- 200-400 characters in Korean
- Use HTML: <h3>, <p>, <ul>, <li>, <strong>
- Professional business tone
- Clear bullet points

EXACT FORMAT (copy this structure):
{"title":"슬라이드 제목","content":"<h3>제목</h3><p>내용</p>","visualElements":["차트"]}

Example:
{"title":"디지털 혁신","content":"<h3>핵심 전략</h3><ul><li><strong>AI:</strong> 30% 향상</li></ul>","visualElements":["그래프"]}

NOW respond with ONLY the JSON object starting with { and ending with }`
  }

  /**
   * XML 형식 슬라이드 생성 프롬프트 (JSON 실패 시 폴백)
   */
  private static createXmlSlideGenerationPrompt(params: {
    sectionTitle: string
    sectionContent: string
    templateType: string
    templateStyle: string
  }): string {
    const { sectionTitle, sectionContent, templateType, templateStyle } = params

    // HTML 태그 제거
    const cleanContent = sectionContent.replace(/<[^>]*>/g, '').substring(0, 1000)

    return `You are a professional business presentation creator.

Task: Rewrite this proposal section for ${templateType} style presentation.

Template Style: ${templateStyle}
Original Title: ${sectionTitle}
Original Content: ${cleanContent}

Requirements:
- 200-400 characters in Korean
- Use HTML tags for formatting
- Professional business tone
- Clear structure

IMPORTANT: Respond using ONLY this XML format:

<slide>
<title>슬라이드 제목을 여기에</title>
<content><h3>제목</h3><p>내용을 여기에 HTML 형식으로 작성</p><ul><li><strong>포인트 1:</strong> 설명</li><li><strong>포인트 2:</strong> 설명</li></ul></content>
<visual>차트 제안</visual>
<visual>다이어그램 제안</visual>
</slide>

Example:
<slide>
<title>디지털 혁신 전략</title>
<content><h3>핵심 전략</h3><ul><li><strong>AI 자동화:</strong> 업무 효율 30% 향상</li><li><strong>클라우드:</strong> 비용 40% 절감</li></ul></content>
<visual>막대 그래프</visual>
</slide>

NOW respond with the XML structure ONLY.`
  }

  /**
   * XML 응답 파싱 (JSON 실패 시 폴백)
   */
  private static parseXmlSlideContent(response: string): {
    title: string
    content: string
    visualElements?: string[]
  } {
    console.log('🔍 [parseXml] XML 파싱 시작')

    try {
      // 응답 정제
      const cleanedResponse = response
        .replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, '')
        .trim()

      // <slide> 태그 추출
      const slideMatch = cleanedResponse.match(/<slide>([\s\S]*?)<\/slide>/i)
      if (!slideMatch) {
        throw new Error('slide 태그를 찾을 수 없습니다')
      }

      const slideContent = slideMatch[1]

      // <title> 추출
      const titleMatch = slideContent.match(/<title>([\s\S]*?)<\/title>/i)
      const title = titleMatch ? titleMatch[1].trim() : '제목 없음'

      // <content> 추출
      const contentMatch = slideContent.match(/<content>([\s\S]*?)<\/content>/i)
      const content = contentMatch ? contentMatch[1].trim() : '<p>내용 없음</p>'

      // <visual> 추출 (여러 개 가능)
      const visualMatches = slideContent.matchAll(/<visual>([\s\S]*?)<\/visual>/gi)
      const visualElements: string[] = []
      for (const match of visualMatches) {
        if (match[1]) {
          visualElements.push(match[1].trim())
        }
      }

      console.log('✅ [parseXml] XML 파싱 성공:', {
        title,
        contentLength: content.length,
        visualCount: visualElements.length
      })

      return {
        title,
        content,
        visualElements
      }
    } catch (error) {
      console.error('❌ [parseXml] XML 파싱 실패:', error)
      throw error
    }
  }

  /**
   * AI 응답 파싱 - PreAnalysisService 패턴 완전 적용 (3단계 시도)
   */
  private static parseGeneratedSlideContent(response: string): {
    title: string
    content: string
    visualElements?: string[]
  } {
    try {
      console.log('🔍 [parseSlide] AI 응답 파싱 시작:', {
        responseLength: response.length,
        responsePreview: response.substring(0, 300)
      })
      console.log('📄 [parseSlide] AI 응답 전체:\n', response)

      // 🔥 PreAnalysisService 패턴: 응답 정제 (줄바꿈을 제외한 제어 문자, 잘못된 이스케이프 제거)
      let cleanedResponse = response
        .replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, '') // 줄바꿈(\x0A=\n, \x0D=\r)을 제외한 제어 문자 제거
        .replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '') // 잘못된 이스케이프 제거
        .trim()

      console.log('🧹 [parseSlide] 응답 정제 완료:', {
        originalLength: response.length,
        cleanedLength: cleanedResponse.length,
        cleanedPreview: cleanedResponse.substring(0, 300)
      })

      // =====================================================
      // 시도 1: 순수 JSON 객체 추출 (balanced braces 알고리즘)
      // 프롬프트에서 "No markdown code blocks" 명시했으므로 이게 가장 먼저
      // =====================================================
      try {
        console.log('🔎 [parseSlide] 시도 1: 순수 JSON 객체 추출 (balanced braces)...')

        const firstBrace = cleanedResponse.indexOf('{')
        if (firstBrace !== -1) {
          let braceCount = 0
          let endIndex = -1
          let inString = false
          let escapeNext = false

          for (let i = firstBrace; i < cleanedResponse.length; i++) {
            const char = cleanedResponse[i]

            // 문자열 내부 여부 추적
            if (char === '"' && !escapeNext) {
              inString = !inString
            }

            // 이스케이프 문자 처리
            escapeNext = (char === '\\' && !escapeNext)

            // 문자열 외부에서만 중괄호 카운트
            if (!inString && !escapeNext) {
              if (char === '{') braceCount++
              if (char === '}') braceCount--

              if (braceCount === 0) {
                endIndex = i + 1
                break
              }
            }
          }

          if (endIndex > firstBrace) {
            const jsonString = cleanedResponse.substring(firstBrace, endIndex)
            console.log('✅ [parseSlide] JSON 객체 발견!')
            console.log('📝 [parseSlide] JSON 길이:', jsonString.length)
            console.log('📝 [parseSlide] JSON 내용:\n', jsonString)

            const parsed = JSON.parse(jsonString)
            console.log('✅ [parseSlide] 순수 JSON 파싱 성공!')

            if (parsed.title && parsed.content) {
              return {
                title: parsed.title,
                content: parsed.content,
                visualElements: parsed.visualElements || []
              }
            }
          } else {
            console.warn('⚠️ [parseSlide] 중괄호 균형이 맞지 않음')
          }
        } else {
          console.warn('⚠️ [parseSlide] JSON 객체를 찾을 수 없음 (첫 { 없음)')
        }
      } catch (error) {
        console.error('❌ [parseSlide] 순수 JSON 파싱 실패:', error)
        console.error('파싱 에러 상세:', (error as Error).message)
      }

      // =====================================================
      // 시도 2: ```json ``` 코드 블록에서 JSON 추출 (혹시 AI가 무시하고 코드 블록 사용한 경우)
      // =====================================================
      try {
        console.log('🔎 [parseSlide] 시도 2: 코드 블록에서 JSON 추출...')
        const codeBlockMatch = cleanedResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/)

        if (codeBlockMatch && codeBlockMatch[1]) {
          const jsonString = codeBlockMatch[1].trim()
          console.log('✅ [parseSlide] 코드 블록 발견!')
          console.log('📝 [parseSlide] JSON 길이:', jsonString.length)

          const parsed = JSON.parse(jsonString)
          console.log('✅ [parseSlide] 코드 블록 JSON 파싱 성공!')

          if (parsed.title && parsed.content) {
            return {
              title: parsed.title,
              content: parsed.content,
              visualElements: parsed.visualElements || []
            }
          }
        } else {
          console.log('ℹ️ [parseSlide] 코드 블록 없음, 다음 방법 시도...')
        }
      } catch (error) {
        console.error('❌ [parseSlide] 코드 블록 JSON 파싱 실패:', error)
      }

      // =====================================================
      // 시도 3: 단순 추출 (첫 { 부터 마지막 })
      // =====================================================
      try {
        console.log('🔎 [parseSlide] 시도 3: 단순 JSON 추출...')

        const firstBrace = cleanedResponse.indexOf('{')
        const lastBrace = cleanedResponse.lastIndexOf('}')

        if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
          const jsonString = cleanedResponse.substring(firstBrace, lastBrace + 1)
          console.log('📝 [parseSlide] 단순 JSON 추출 시도:', jsonString.substring(0, 200))

          const parsed = JSON.parse(jsonString)
          console.log('✅ [parseSlide] 단순 JSON 파싱 성공!')

          if (parsed.title && parsed.content) {
            return {
              title: parsed.title,
              content: parsed.content,
              visualElements: parsed.visualElements || []
            }
          }
        }
      } catch (error) {
        console.error('❌ [parseSlide] 단순 JSON 파싱 실패:', error)
      }

      // 모든 시도 실패 - Fallback
      throw new Error('모든 JSON 파싱 시도 실패')

    } catch (error) {
      console.error('❌ [parseSlide] 모든 파싱 시도 실패:', error)
      console.error('원본 응답 (전체):', response)

      // Fallback: 원본 텍스트를 구조화하여 사용
      const lines = response.split('\n').filter(line => line.trim())
      const fallbackTitle = lines[0]?.substring(0, 100) || '제목 없음'
      const fallbackContent = lines.slice(1).join('\n') || response

      console.warn('⚠️ [parseSlide] Fallback 사용:', {
        title: fallbackTitle,
        contentLength: fallbackContent.length
      })

      return {
        title: fallbackTitle,
        content: `<div class="ai-generated-fallback"><p>${fallbackContent.replace(/\n/g, '</p><p>')}</p></div>`,
        visualElements: []
      }
    }
  }

  /**
   * 생성된 제안서를 proposal_workflow_analysis 테이블에 저장
   */
  private static async saveGeneratedProposal(params: {
    projectId: string
    templateId: string
    originalProposal: any
    generatedSlides: SlideContent[]
    userId: string
    aiProvider: string
    aiModel: string
  }): Promise<void> {
    const { projectId, templateId, originalProposal, generatedSlides, userId, aiProvider, aiModel } = params

    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    // 생성된 슬라이드를 sections 형태로 변환
    const transformedSections = generatedSlides.map(slide => ({
      id: slide.sectionId,
      title: slide.title,
      content: slide.content,
      order: slide.order,
      visualElements: slide.visualElements
    }))

    const finalProposal = {
      ...originalProposal,
      sections: transformedSections,
      templateId,
      templateApplied: true,
      generatedAt: new Date().toISOString()
    }

    // proposal_workflow_analysis 테이블에 저장 (analysis_type: 'template_proposal')
    await ProposalDataManager.saveAnalysis({
      project_id: projectId,
      workflow_step: 'proposal',
      analysis_type: 'template_proposal',
      input_documents: [],
      input_responses: [],
      ai_provider: aiProvider,
      ai_model: aiModel,
      analysis_prompt: `템플릿 ID: ${templateId}`,
      analysis_result: JSON.stringify(finalProposal),
      structured_output: finalProposal,
      recommendations: [],
      next_questions: [],
      input_tokens: 0,
      output_tokens: 0,
      cost: 0,
      status: 'completed',
      created_by: userId,
      metadata: {
        templateId,
        sectionsCount: transformedSections.length,
        originalProposalSections: originalProposal.sections?.length || 0
      }
    })

    console.log('✅ 생성된 제안서 저장 완료 (analysis_type: template_proposal)')
  }

  /**
   * 생성된 템플릿 제안서 조회
   */
  static async getTemplateProposal(projectId: string): Promise<any | null> {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    const analyses = await ProposalDataManager.getAnalysis(
      projectId,
      'proposal',
      'template_proposal'
    )

    if (!analyses || analyses.length === 0) {
      return null
    }

    // 최신 템플릿 제안서 반환
    const latest = analyses[0]
    return typeof latest.analysis_result === 'string'
      ? JSON.parse(latest.analysis_result)
      : latest.analysis_result
  }
}
