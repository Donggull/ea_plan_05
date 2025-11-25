// Vercel API 라우트 - AI 질문 생성 전용 엔드포인트
// 사전 분석 단계에서 문서 기반 맞춤형 질문 생성에 특화

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// Supabase Service Client 생성 함수 (사용량 기록용)
function createSupabaseServiceClient() {
  const supabaseUrl = process.env['SUPABASE_URL']
  const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY']

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('⚠️ Supabase 환경 변수가 설정되지 않았습니다. API 사용량 기록을 건너뜁니다.')
    return null
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

// userId 추출 함수 (Authorization 헤더에서)
async function extractUserId(authHeader: string | undefined, supabase: any): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ') || !supabase) {
    return null
  }

  try {
    const token = authHeader.substring(7)
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      console.warn('⚠️ 인증 토큰 검증 실패:', error?.message)
      return null
    }

    return user.id
  } catch (error) {
    console.error('❌ userId 추출 오류:', error)
    return null
  }
}

// API 사용량 기록 함수
async function recordApiUsage(
  userId: string,
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  cost: number
) {
  try {
    const supabase = createSupabaseServiceClient()
    if (!supabase) {
      console.warn('⚠️ Supabase 클라이언트 없음. API 사용량 기록 건너뜀.')
      return
    }

    const now = new Date()
    const date = now.toISOString().split('T')[0]
    const hour = now.getHours()

    const { error } = await supabase
      .from('user_api_usage')
      .insert({
        user_id: userId,
        api_provider: provider,
        date: date,
        hour: hour,
        model: model,
        request_count: 1,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: inputTokens + outputTokens,
        cost: cost,
        response_time_ms: 0,
        success: true,
        endpoint: '/api/ai/questions',
        created_at: now.toISOString()
      })

    if (error) {
      console.error('❌ API 사용량 기록 오류:', error)
    } else {
      console.log('✅ API 사용량 기록 성공:', {
        userId,
        model,
        cost: cost.toFixed(6),
        tokens: inputTokens + outputTokens
      })
    }
  } catch (error) {
    console.error('❌ API 사용량 기록 중 예외:', error)
  }
}

interface QuestionRequest {
  provider: 'openai' | 'anthropic' | 'google'
  model: string
  projectId: string
  projectInfo: {
    name?: string
    description?: string
    industry?: string
  }
  documents: Array<{
    name: string
    summary?: string
    content?: string
  }>
  preAnalysisData?: {
    hasPreAnalysis: boolean
    report: any | null
    documentAnalyses: any[]
    summary: string
  }
  marketResearchData?: any
  personasData?: any
  context?: {
    userId?: string
    sessionId?: string
    requestType?: string
  }
}

interface GeneratedQuestion {
  category: string
  text: string
  type: 'text' | 'select' | 'multiselect' | 'number' | 'textarea'
  options?: string[]
  required: boolean
  helpText?: string
  priority: 'high' | 'medium' | 'low'
  confidence: number
}

interface QuestionResponse {
  questions: GeneratedQuestion[]
  usage: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
  }
  cost: {
    inputCost: number
    outputCost: number
    totalCost: number
  }
  model: string
  responseTime: number
  metadata: {
    projectId: string
    totalQuestions: number
    categories: string[]
  }
}

// Supabase server client 생성 함수
function createServerSupabaseClient(authToken?: string) {
  const supabaseUrl = process.env['SUPABASE_URL']
  const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY']

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase 환경 변수가 설정되지 않았습니다.')
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // 인증 토큰이 있으면 사용자 컨텍스트 설정
  if (authToken) {
    supabase.auth.setSession({
      access_token: authToken,
      refresh_token: '',
      expires_in: 3600,
      token_type: 'bearer',
      user: null as any
    } as any)
  }

  return supabase
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  console.log('🚀 [AI Questions API] 질문 생성 요청 수신:', {
    timestamp: new Date().toISOString(),
    method: req.method,
    hasBody: !!req.body,
    hasAuth: !!req.headers.authorization
  })

  // CORS 헤더 추가
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  // OPTIONS 요청 처리
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // 🔥 userId 추출 (API 사용량 기록을 위해)
    const supabase = createSupabaseServiceClient()
    const userId = await extractUserId(req.headers.authorization, supabase)

    // 인증 토큰 추출 및 검증
    const authHeader = req.headers.authorization
    let authToken: string | undefined
    let authenticatedUser: any = null

    if (authHeader && authHeader.startsWith('Bearer ')) {
      authToken = authHeader.substring(7)

      try {
        // Supabase 클라이언트로 인증 검증
        const supabaseAuth = createServerSupabaseClient(authToken)
        const { data: { user }, error } = await supabaseAuth.auth.getUser()

        if (error || !user) {
          console.error('인증 검증 실패:', error)
        } else {
          authenticatedUser = user
          console.log('인증 성공:', { userId: user.id, email: user.email })
        }
      } catch (authError) {
        console.error('인증 처리 오류:', authError)
      }
    }

    const requestBody: QuestionRequest = req.body

    console.log('📝 [AI Questions API] 요청 분석:', {
      provider: requestBody.provider,
      model: requestBody.model,
      projectId: requestBody.projectId,
      documentsCount: requestBody.documents?.length || 0,
      hasProjectInfo: !!requestBody.projectInfo,
      projectName: requestBody.projectInfo?.name,
      authenticatedUserId: authenticatedUser?.id,
      hasAuthToken: !!authToken
    })

    // 필수 파라미터 검증
    if (!requestBody.provider || !requestBody.model || !requestBody.projectId) {
      console.error('❌ [AI Questions API] 필수 파라미터 누락:', {
        hasProvider: !!requestBody.provider,
        hasModel: !!requestBody.model,
        hasProjectId: !!requestBody.projectId
      })
      return res.status(400).json({
        error: '필수 파라미터가 누락되었습니다.',
        required: ['provider', 'model', 'projectId']
      })
    }

    // 환경 변수에서 API 키 가져오기
    const apiKeys = {
      openai: process.env['OPENAI_API_KEY'],
      anthropic: process.env['ANTHROPIC_API_KEY'],
      google: process.env['GOOGLE_AI_API_KEY']
    }

    const apiKey = apiKeys[requestBody.provider]
    if (!apiKey) {
      console.error(`❌ [AI Questions API] ${requestBody.provider} API 키가 설정되지 않았습니다.`)
      return res.status(500).json({
        error: `${requestBody.provider} API 키가 설정되지 않았습니다.`,
        provider: requestBody.provider
      })
    }

    console.log(`🤖 [AI Questions API] AI 질문 생성 시작: ${requestBody.provider} ${requestBody.model}`)

    // AI 프롬프트 생성
    const prompt = buildQuestionPrompt(requestBody)
    console.log('📄 [AI Questions API] 프롬프트 생성 완료, 길이:', prompt.length)

    // AI API 호출
    const aiResponse = await callAIForQuestions(
      requestBody.provider,
      apiKey,
      requestBody.model,
      prompt
    )

    console.log('✅ [AI Questions API] AI 응답 수신 완료:', {
      contentLength: aiResponse.content?.length || 0,
      inputTokens: aiResponse.usage.inputTokens,
      outputTokens: aiResponse.usage.outputTokens
    })

    // 응답 파싱 및 질문 추출 (requestType 전달)
    const questions = parseQuestions(aiResponse.content, requestBody.context?.requestType)
    console.log('📊 [AI Questions API] 질문 파싱 완료:', {
      questionsCount: questions.length,
      categories: [...new Set(questions.map(q => q.category))]
    })

    if (questions.length === 0) {
      throw new Error('AI에서 유효한 질문을 생성하지 못했습니다.')
    }

    const response: QuestionResponse = {
      questions,
      usage: aiResponse.usage,
      cost: aiResponse.cost,
      model: requestBody.model,
      responseTime: aiResponse.responseTime,
      metadata: {
        projectId: requestBody.projectId,
        totalQuestions: questions.length,
        categories: [...new Set(questions.map(q => q.category))]
      }
    }

    console.log(`✅ [AI Questions API] 질문 생성 완료: ${questions.length}개 질문, $${response.cost.totalCost.toFixed(4)}`)

    // 🔥 API 사용량 기록 (userId가 있는 경우에만)
    if (userId) {
      await recordApiUsage(
        userId,
        requestBody.provider,
        requestBody.model,
        aiResponse.usage.inputTokens,
        aiResponse.usage.outputTokens,
        aiResponse.cost.totalCost
      )
    } else {
      console.warn('⚠️ userId가 없어 API 사용량을 기록하지 못했습니다. Authorization 헤더를 확인하세요.')
    }

    return res.status(200).json(response)

  } catch (error) {
    console.error('❌ [AI Questions API] 오류 상세:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    })

    return res.status(500).json({
      error: 'AI 질문 생성 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    })
  }
}

function buildQuestionPrompt(request: QuestionRequest): string {
  const { projectInfo, documents, context, preAnalysisData } = request

  // 시장 조사 질문 생성 (웹에이전시 관점 - 경쟁 PT 준비)
  if (context?.requestType === 'market_research_questions') {
    let prompt = `당신은 경험 많은 웹에이전시의 사업개발팀 리서처입니다.

# 상황
우리 웹에이전시는 RFP(제안요청서)를 받고 사전 분석을 완료했습니다.
이제 **경쟁 PT/입찰에서 승리하기 위한 시장 조사**를 진행해야 합니다.
시장 조사 결과는 제안서의 "시장 분석" 및 "솔루션 차별화" 섹션에 활용됩니다.

# 미션
RFP 분석 결과를 바탕으로, **우리 에이전시 내부 팀이 조사해야 할 시장 정보**에 대한 질문을 생성해주세요.
이 질문들의 답변은 **제안서 작성과 수주 전략 수립**에 직접 활용됩니다.

# RFP 정보
- **프로젝트명**: ${projectInfo?.name || '미정'}
- **프로젝트 설명**: ${projectInfo?.description || '미정'}
- **산업 분야**: ${projectInfo?.industry || '미정'}
`

    // 사전 분석 데이터 존재 여부를 report 또는 documentAnalyses로 확인
    const hasPreAnalysisData = preAnalysisData && (
      (preAnalysisData.report && Object.keys(preAnalysisData.report).length > 0) ||
      (preAnalysisData.documentAnalyses && preAnalysisData.documentAnalyses.length > 0)
    )

    console.log('🔍 [buildQuestionPrompt] 사전 분석 데이터 체크:', {
      hasPreAnalysisData,
      hasReport: !!preAnalysisData?.report,
      reportKeys: preAnalysisData?.report ? Object.keys(preAnalysisData.report).length : 0,
      documentAnalysesCount: preAnalysisData?.documentAnalyses?.length || 0
    })

    if (hasPreAnalysisData) {
      prompt += `\n=== 사전 분석 보고서 인사이트 ===\n`

      if (preAnalysisData.report) {
        prompt += `분석 요약: ${preAnalysisData.report.summary || '없음'}\n\n`

        if (preAnalysisData.report.key_findings && preAnalysisData.report.key_findings.length > 0) {
          prompt += `핵심 발견사항:\n${preAnalysisData.report.key_findings.map((f: string) => `- ${f}`).join('\n')}\n\n`
        }

        if (preAnalysisData.report.recommendations && preAnalysisData.report.recommendations.length > 0) {
          prompt += `권장사항:\n${preAnalysisData.report.recommendations.map((r: string) => `- ${r}`).join('\n')}\n\n`
        }

        if (preAnalysisData.report.technical_insights && preAnalysisData.report.technical_insights.length > 0) {
          prompt += `기술적 인사이트:\n${preAnalysisData.report.technical_insights.map((t: string) => `- ${t}`).join('\n')}\n\n`
        }

        if (preAnalysisData.report.market_insights && preAnalysisData.report.market_insights.length > 0) {
          prompt += `시장 인사이트:\n${preAnalysisData.report.market_insights.map((m: string) => `- ${m}`).join('\n')}\n\n`
        }
      }

      if (preAnalysisData.documentAnalyses && preAnalysisData.documentAnalyses.length > 0) {
        prompt += `=== 문서 분석 결과 ===\n`
        preAnalysisData.documentAnalyses.forEach((analysis: any, index: number) => {
          prompt += `${index + 1}. ${analysis.document_name || '문서'}\n`
          prompt += `   요약: ${analysis.summary || '없음'}\n`
          if (analysis.key_points && analysis.key_points.length > 0) {
            prompt += `   핵심 포인트: ${analysis.key_points.join(', ')}\n`
          }
          if (analysis.technical_details && analysis.technical_details.length > 0) {
            prompt += `   기술 세부사항: ${analysis.technical_details.join(', ')}\n`
          }
          prompt += `\n`
        })
      }

      console.log('✅ [buildQuestionPrompt] 사전 분석 데이터를 프롬프트에 포함했습니다.')
    } else {
      prompt += `\n(참고: 이 프로젝트에는 사전 분석 데이터가 없습니다.)\n`
      console.warn('⚠️ [buildQuestionPrompt] 사전 분석 데이터가 없어 일반적인 질문을 생성합니다.')
    }

    if (documents && documents.length > 0) {
      prompt += `\n업로드된 문서들:
${documents.map((doc, index) => `${index + 1}. ${doc.name}`).join('\n')}
`
    }

    prompt += `
---

# 시장 조사 질문 생성 전략 (웹에이전시 관점)

## 중요: 질문의 대상과 목적
- ❌ 질문 대상은 클라이언트가 **아닙니다**
- ✅ 질문 대상은 **우리 에이전시 리서치 팀**입니다
- ✅ 질문의 답변이 **제안서의 시장 분석 섹션**이 됩니다

## 생성해야 할 질문 카테고리 (6-10개 질문)

### 1. 클라이언트 산업/시장 규모
- RFP 클라이언트가 속한 산업의 현재 시장 규모와 성장 전망은?
- 이 프로젝트가 타겟하는 시장의 특성은?
- 예시: "클라이언트 산업에서 유사 프로젝트의 성공 사례와 시장 반응은?"

### 2. 경쟁 에이전시 분석 (수주 경쟁)
- 이 RFP에 참여할 것으로 예상되는 경쟁 에이전시는?
- 경쟁 에이전시의 강점과 약점은?
- 예시: "예상 경쟁 에이전시 대비 우리의 차별화 포인트는?"

### 3. 클라이언트 비즈니스 환경
- 클라이언트의 주요 경쟁사와 시장 포지션은?
- 클라이언트가 직면한 업계 트렌드와 도전 과제는?
- 예시: "클라이언트의 비즈니스 환경에서 이 프로젝트가 갖는 전략적 중요성은?"

### 4. 기술 트렌드 및 솔루션 벤치마킹
- 유사 프로젝트에서 사용된 기술 솔루션 트렌드는?
- 클라이언트 산업에서 성공한 디지털 트랜스포메이션 사례는?
- 예시: "RFP 요구사항에 부합하는 최신 기술 트렌드와 우리의 적용 방안은?"

### 5. 제안서 차별화 포인트 발굴
- 제안서에서 강조할 수 있는 시장 기회 요소는?
- 클라이언트에게 어필할 수 있는 ROI 근거 데이터는?
- 예시: "제안서에서 수주 가능성을 높일 시장 데이터와 성공 사례는?"

## 질문 작성 원칙

### ✅ 올바른 질문 예시 (에이전시 리서치 팀에게 묻기)
- "클라이언트 산업에서 유사 프로젝트의 평균 투자 규모와 ROI는?"
- "이 RFP에 참여할 경쟁 에이전시와 그들의 강점/약점은?"
- "클라이언트 비즈니스 환경에서 이 프로젝트의 전략적 가치는?"
- "제안서에서 어필할 수 있는 업계 성공 사례와 벤치마킹 데이터는?"
- "우리 에이전시의 경쟁 우위를 뒷받침할 시장 데이터는?"

### ❌ 잘못된 질문 예시 (일반적인 시장조사 질문)
- "국내 AI 서비스 시장의 현재 규모는?" ← 너무 일반적, 프로젝트 맥락 없음
- "타겟 고객의 연령대는?" ← 페르소나 질문에 해당
- "프로젝트 예산은?" ← 우리가 견적을 제시해야 함

---

# 출력 형식

**JSON 형식으로만 반환하세요. 다른 텍스트는 포함하지 마세요.**

{
  "questions": [
    {
      "category": "시장 규모|경쟁 분석|비즈니스 환경|기술 트렌드|차별화 전략",
      "question": "우리 에이전시 리서치 팀이 조사할 내용",
      "expectedFormat": "text|select|multiselect|number|textarea",
      "options": ["옵션1", "옵션2"],
      "required": true|false,
      "context": "RFP 분석 결과 + 이 정보가 제안서에 어떻게 활용되는지",
      "priority": "high|medium|low",
      "confidenceScore": 0.0-1.0
    }
  ]
}

정확한 JSON만 반환하세요.`

    return prompt
  }

  // 제안서 작성 질문 생성 (웹 에이전시 관점 - 클라이언트 제출용 제안서)
  if (context?.requestType === 'proposal_questions') {
    const { marketResearchData, personasData } = request as any

    let prompt = `당신은 웹 에이전시의 제안서 작성 전문가입니다.

# 상황
우리는 웹 에이전시이며, 클라이언트로부터 받은 RFP(제안요청서)를 분석 완료했습니다.
- 사전 분석: RFP 문서 분석 완료
- 시장 조사: 타겟 시장 및 경쟁 환경 파악 완료
- 페르소나 분석: 최종 사용자 특성 파악 완료

# 미션
이제 **우리 에이전시가 클라이언트에게 제출할 제안서**를 작성하기 위한 질문들을 생성해주세요.
질문은 **우리 에이전시 팀(PM, 개발자, 디자이너)이 답변**하며, 답변 내용이 클라이언트 제출용 제안서가 됩니다.

# 프로젝트 기본 정보 (RFP 분석 결과)
- **프로젝트명**: ${projectInfo?.name || '미정'}
- **프로젝트 설명**: ${projectInfo?.description || '미정'}
- **산업 분야**: ${projectInfo?.industry || '미정'}

`

    // 사전 분석 데이터 확인 및 핵심 인사이트 추출
    const hasPreAnalysisData = preAnalysisData && (
      (preAnalysisData.report && Object.keys(preAnalysisData.report).length > 0) ||
      (preAnalysisData.documentAnalyses && preAnalysisData.documentAnalyses.length > 0)
    )

    if (hasPreAnalysisData) {
      prompt += `## 1. RFP 사전 분석 결과 (클라이언트 요구사항)\n\n`

      if (preAnalysisData.report) {
        prompt += `### 클라이언트 요구사항 요약\n${preAnalysisData.report.summary || '없음'}\n\n`

        if (preAnalysisData.report.key_findings && preAnalysisData.report.key_findings.length > 0) {
          prompt += `### 핵심 요구사항 및 과제\n`
          preAnalysisData.report.key_findings.forEach((f: string, idx: number) => {
            prompt += `${idx + 1}. ${f}\n`
          })
          prompt += `\n`
        }

        if (preAnalysisData.report.recommendations && preAnalysisData.report.recommendations.length > 0) {
          prompt += `### 제안 방향 권장사항\n`
          preAnalysisData.report.recommendations.forEach((r: string, idx: number) => {
            prompt += `${idx + 1}. ${r}\n`
          })
          prompt += `\n`
        }

        if (preAnalysisData.report.technical_insights && preAnalysisData.report.technical_insights.length > 0) {
          prompt += `### 기술적 요구사항\n`
          preAnalysisData.report.technical_insights.forEach((t: string, idx: number) => {
            prompt += `${idx + 1}. ${t}\n`
          })
          prompt += `\n`
        }
      }

      if (preAnalysisData.documentAnalyses && preAnalysisData.documentAnalyses.length > 0) {
        prompt += `### RFP 문서 분석 결과\n`
        preAnalysisData.documentAnalyses.forEach((analysis: any, index: number) => {
          prompt += `**${index + 1}. ${analysis.document_name || '문서'}**\n`
          if (analysis.summary) {
            prompt += `   - 요약: ${analysis.summary}\n`
          }
          if (analysis.key_points && analysis.key_points.length > 0) {
            prompt += `   - 핵심 포인트: ${analysis.key_points.join(', ')}\n`
          }
        })
        prompt += `\n`
      }
    }

    // 시장 조사 데이터 통합
    if (marketResearchData) {
      prompt += `## 2. 시장 조사 분석 결과 (경쟁 환경)\n\n`

      if (marketResearchData.structured_output) {
        const structuredOutput = marketResearchData.structured_output

        if (structuredOutput.marketSize) {
          prompt += `### 시장 규모\n${structuredOutput.marketSize}\n\n`
        }

        if (structuredOutput.competitors && structuredOutput.competitors.length > 0) {
          prompt += `### 주요 경쟁사/경쟁 솔루션\n`
          structuredOutput.competitors.forEach((comp: string, idx: number) => {
            prompt += `${idx + 1}. ${comp}\n`
          })
          prompt += `\n`
        }

        if (structuredOutput.competitiveAdvantage) {
          prompt += `### 차별화 기회 요소\n${structuredOutput.competitiveAdvantage}\n\n`
        }

        if (structuredOutput.marketTrends && structuredOutput.marketTrends.length > 0) {
          prompt += `### 시장 트렌드\n`
          structuredOutput.marketTrends.forEach((trend: string, idx: number) => {
            prompt += `${idx + 1}. ${trend}\n`
          })
          prompt += `\n`
        }

        if (structuredOutput.targetSegments && structuredOutput.targetSegments.length > 0) {
          prompt += `### 타겟 시장 세그먼트\n`
          structuredOutput.targetSegments.forEach((segment: string, idx: number) => {
            prompt += `${idx + 1}. ${segment}\n`
          })
          prompt += `\n`
        }
      } else if (marketResearchData.analysis_data) {
        prompt += `### 시장 분석 결과\n${JSON.stringify(marketResearchData.analysis_data, null, 2)}\n\n`
      }
    }

    // 페르소나 데이터 통합
    if (personasData) {
      prompt += `## 3. 최종 사용자 페르소나 분석 결과\n\n`

      if (personasData.structured_output) {
        const structuredOutput = personasData.structured_output

        if (structuredOutput.demographics) {
          prompt += `### 사용자 인구통계\n${structuredOutput.demographics}\n\n`
        }

        if (structuredOutput.psychographics) {
          prompt += `### 사용자 심리 특성\n${structuredOutput.psychographics}\n\n`
        }

        if (structuredOutput.behavioral) {
          prompt += `### 사용자 행동 패턴\n${structuredOutput.behavioral}\n\n`
        }

        if (structuredOutput.goals) {
          prompt += `### 사용자 목표\n${structuredOutput.goals}\n\n`
        }

        if (structuredOutput.painPoints && structuredOutput.painPoints.length > 0) {
          prompt += `### 사용자 Pain Points\n`
          structuredOutput.painPoints.forEach((pain: string, idx: number) => {
            prompt += `${idx + 1}. ${pain}\n`
          })
          prompt += `\n`
        }

        if (structuredOutput.channels && structuredOutput.channels.length > 0) {
          prompt += `### 사용자 선호 채널\n`
          structuredOutput.channels.forEach((channel: string, idx: number) => {
            prompt += `${idx + 1}. ${channel}\n`
          })
          prompt += `\n`
        }
      } else if (personasData.analysis_data) {
        prompt += `### 페르소나 분석 결과\n${JSON.stringify(personasData.analysis_data, null, 2)}\n\n`
      }
    }

    // 문서 내용 요약
    if (documents && documents.length > 0) {
      prompt += `## RFP 관련 문서\n`
      documents.forEach((doc, index) => {
        prompt += `${index + 1}. ${doc.name}\n`
        if (doc.summary) {
          prompt += `   요약: ${doc.summary.substring(0, 150)}...\n`
        }
      })
      prompt += `\n`
    }

    // 맞춤형 제안서 질문 생성 지시
    prompt += `---

# 제안서 작성 전략 (웹 에이전시 관점)

## 중요: 질문의 대상과 목적
- ❌ 질문 대상은 클라이언트가 **아닙니다**
- ✅ 질문 대상은 **우리 에이전시 팀** (PM, 개발자, 디자이너)입니다
- ✅ 질문의 답변 내용이 **클라이언트 제출용 제안서**가 됩니다
- ✅ "우리가 제안할 내용"을 정의하는 질문이어야 합니다

## Step 1: 제안서 구조 (웹 에이전시 표준)

### 1. 프로젝트 이해 및 접근 방식 (Executive Summary)
- **우리의** RFP 이해도 및 핵심 과제 요약
- **우리가 보는** 프로젝트의 성공 요인
- 예시 질문: "RFP에서 파악한 클라이언트의 핵심 요구사항에 대한 우리의 이해는?"

### 2. 제안 솔루션 (Proposed Solution)
- **우리가 제안하는** 솔루션의 개요와 핵심 가치
- **우리 솔루션이** 클라이언트 문제를 해결하는 방식
- 예시 질문: "RFP의 [요구사항]을 해결하기 위해 우리가 제안하는 솔루션의 핵심 기능은?"

### 3. 기술 아키텍처 (Technical Architecture)
- **우리가 사용할** 기술 스택 (프론트엔드, 백엔드, DB, 인프라)
- **우리가 설계한** 시스템 아키텍처 및 구조
- **우리의** 기술 선택 근거
- 예시 질문: "프로젝트에 우리가 제안하는 기술 스택과 선택 이유는?"

### 4. 팀 구성 및 개발 방법론 (Team & Methodology)
- **우리 에이전시의** 투입 인력 구성 (역할, 경력, 투입 기간)
- **우리가 사용할** 개발 방법론 (Agile, Scrum 등)
- **우리의** 협업 및 커뮤니케이션 방식
- 예시 질문: "프로젝트에 투입할 우리 팀의 구성과 각 역할은?"

### 5. 일정 및 마일스톤 (Timeline & Milestones)
- **우리가 계획한** 단계별 개발 일정
- **우리가 제시하는** 주요 마일스톤과 산출물
- **우리의** 일정 리스크 관리 계획
- 예시 질문: "프로젝트를 몇 단계로 나누어 진행하며, 각 단계의 기간과 산출물은?"

### 6. 비용 산정 (Cost Breakdown)
- **우리가 제시하는** 프로젝트 총 비용 견적
- **우리의** 항목별 비용 breakdown (인건비, 인프라, 라이선스 등)
- **우리의** 지불 조건 및 일정
- 예시 질문: "프로젝트 총 비용과 항목별 상세 내역은?"

### 7. 리스크 관리 (Risk Management)
- **우리가 예상하는** 프로젝트 리스크 요인
- **우리의** 리스크 대응 및 완화 계획
- 예시 질문: "프로젝트에서 예상되는 주요 리스크와 우리의 대응 방안은?"

### 8. 차별화 요소 (Why Us)
- **우리 에이전시의** 강점과 경쟁력
- **우리의** 유사 프로젝트 경험 및 성공 사례
- **우리 솔루션의** 독특한 차별화 포인트
- 예시 질문: "경쟁 에이전시 대비 우리만의 차별화 요소는?"

## Step 2: 질문 생성 원칙

### ✅ 올바른 질문 예시 (에이전시 팀에게 묻기)
- "RFP의 [핵심 요구사항]을 충족하기 위해 **우리가 제안할** 솔루션의 주요 기능과 기술적 접근 방식은?"
- "경쟁사 분석 결과를 바탕으로, **우리 에이전시만의** 차별화된 강점과 제안 포인트는?"
- "페르소나 분석에서 파악된 사용자 Pain Point를 해결하기 위해 **우리가 구현할** UX/UI 전략은?"
- "프로젝트에 **우리가 투입할 팀** 구성은? (역할, 인원, 투입 기간)"
- "**우리가 제시하는** 프로젝트 일정은 어떻게 되며, 주요 마일스톤과 산출물은?"
- "**우리가 산정한** 프로젝트 총 비용과 항목별 비용 breakdown은?"
- "RFP 기술 요구사항을 고려할 때, **우리가 선택한** 기술 스택과 그 근거는?"

### ❌ 잘못된 질문 예시 (클라이언트에게 묻는 것처럼 들림)
- "타겟 고객의 주요 Pain Point를 해결하기 위한 기능은?" ← 주체 불명확
- "프로젝트의 목표는?" ← 이미 RFP에서 파악했어야 함
- "예산 범위는?" ← 우리가 견적을 제시해야 함
- "원하는 기술 스택은?" ← 우리가 제안해야 함

## Step 3: 질문 구성

### 질문 개수 및 분포
- **총 10-15개 질문 생성**
- 8가지 제안서 영역이 고르게 분포 (각 영역당 1-2개)
- 핵심 영역(솔루션, 기술, 팀, 비용, 일정)은 2개 이상 심화 질문

### 질문 유형 (type) 선택
- **textarea**: 솔루션 개요, 기술 설명, 차별화 전략 등 상세 설명
- **multiselect**: 기술 스택, 주요 기능 목록, 팀 역할 등
- **text**: 프로젝트 기간, 팀원 이름/역할 등 간단한 입력
- **number**: 비용, 인원 수, 개발 기간(주) 등 숫자
- **select**: 개발 방법론, 배포 환경 등 단일 선택

### helpText 작성 원칙
- RFP 분석 결과를 구체적으로 인용
- "우리 에이전시가 작성할 제안서에 포함될 내용"임을 명시
- 답변 작성 가이드 제공 (예: "클라이언트에게 우리의 기술 선택을 어필할 수 있도록...")

### category 선택
- "프로젝트 이해" - Executive Summary
- "제안 솔루션" - Proposed Solution
- "기술 아키텍처" - Technical Architecture
- "팀 구성" - Team Composition
- "일정 계획" - Timeline & Milestones
- "비용 산정" - Cost Breakdown
- "리스크 관리" - Risk Management
- "차별화 요소" - Why Us

---

# 출력 형식

**JSON 형식으로만 반환하세요. 다른 텍스트는 포함하지 마세요.**

JSON 형식:
{
  "questions": [
    {
      "category": "프로젝트 이해|제안 솔루션|기술 아키텍처|팀 구성|일정 계획|비용 산정|리스크 관리|차별화 요소",
      "question": "우리 에이전시 팀이 답변할 질문 (주체를 '우리'로 명확히)",
      "expectedFormat": "text|select|multiselect|number|textarea",
      "options": ["옵션1", "옵션2"],
      "required": true|false,
      "context": "RFP 분석 결과 인용 + 이 답변이 제안서에 어떻게 활용되는지 설명",
      "priority": "high|medium|low",
      "confidenceScore": 0.0-1.0
    }
  ]
}

정확한 JSON만 반환하세요.`

    return prompt
  }

  // 페르소나 분석 질문 생성 (웹에이전시 관점 - 제안서 UX 섹션 준비)
  if (context?.requestType === 'personas_questions') {
    let prompt = `당신은 경험 많은 웹에이전시의 UX 리서처입니다.

# 상황
우리 웹에이전시는 RFP(제안요청서)를 분석하고 시장 조사를 완료했습니다.
이제 **제안서의 UX/UI 섹션 작성**을 위해 최종 사용자 분석(페르소나)을 진행해야 합니다.
페르소나 분석 결과는 제안서의 "사용자 중심 설계" 및 "UX 전략" 섹션에 활용됩니다.

# 미션
RFP와 시장 조사 결과를 바탕으로, **우리 에이전시 UX팀이 정의해야 할 최종 사용자 페르소나**에 대한 질문을 생성해주세요.
이 질문들의 답변은 **클라이언트에게 우리의 사용자 이해도를 어필**하는 데 활용됩니다.

# RFP 정보
- **프로젝트명**: ${projectInfo?.name || '미정'}
- **프로젝트 설명**: ${projectInfo?.description || '미정'}
- **산업 분야**: ${projectInfo?.industry || '미정'}
`

    // 사전 분석 데이터 확인 및 핵심 인사이트 추출
    const hasPreAnalysisData = preAnalysisData && (
      (preAnalysisData.report && Object.keys(preAnalysisData.report).length > 0) ||
      (preAnalysisData.documentAnalyses && preAnalysisData.documentAnalyses.length > 0)
    )

    let projectCoreIssues: string[] = []
    let projectTargetHints: string[] = []

    if (hasPreAnalysisData) {
      prompt += `\n## 사전 분석에서 도출된 핵심 인사이트\n\n`

      if (preAnalysisData.report) {
        prompt += `### 분석 요약\n${preAnalysisData.report.summary || '없음'}\n\n`

        if (preAnalysisData.report.key_findings && preAnalysisData.report.key_findings.length > 0) {
          prompt += `### 핵심 발견사항 (프로젝트가 해결해야 할 과제)\n`
          preAnalysisData.report.key_findings.forEach((f: string, idx: number) => {
            prompt += `${idx + 1}. ${f}\n`
            projectCoreIssues.push(f)
          })
          prompt += `\n`
        }

        if (preAnalysisData.report.recommendations && preAnalysisData.report.recommendations.length > 0) {
          prompt += `### 권장사항 (솔루션 방향)\n`
          preAnalysisData.report.recommendations.forEach((r: string, idx: number) => {
            prompt += `${idx + 1}. ${r}\n`
          })
          prompt += `\n`
        }

        // 구조화된 데이터에서 타겟 고객 힌트 추출
        if (preAnalysisData.report.structured_data) {
          const structuredData = preAnalysisData.report.structured_data
          if (structuredData.stakeholders) {
            projectTargetHints.push(`주요 이해관계자: ${structuredData.stakeholders.join(', ')}`)
          }
          if (structuredData.target_users) {
            projectTargetHints.push(`타겟 사용자: ${structuredData.target_users}`)
          }
        }
      }

      if (preAnalysisData.documentAnalyses && preAnalysisData.documentAnalyses.length > 0) {
        prompt += `### 문서 분석에서 파악된 타겟 고객 관련 정보\n`
        preAnalysisData.documentAnalyses.forEach((analysis: any, index: number) => {
          prompt += `**${index + 1}. ${analysis.document_name || '문서'}**\n`
          if (analysis.summary) {
            prompt += `   - 요약: ${analysis.summary}\n`
          }
          if (analysis.key_points && analysis.key_points.length > 0) {
            prompt += `   - 핵심 포인트: ${analysis.key_points.join(', ')}\n`
            // 고객 관련 키워드 추출 시도
            analysis.key_points.forEach((point: string) => {
              if (point.includes('고객') || point.includes('사용자') || point.includes('타겟')) {
                projectTargetHints.push(point)
              }
            })
          }
        })
        prompt += `\n`
      }
    } else {
      prompt += `\n⚠️ 사전 분석 데이터가 없습니다. 프로젝트 정보와 문서만을 기반으로 질문을 생성합니다.\n\n`
    }

    // 시장 조사 데이터 확인 및 타겟 고객 세그먼트 추출
    const marketResearchData = (request as any).marketResearchData
    let marketTargetSegments: string[] = []

    if (marketResearchData && marketResearchData.structured_output) {
      const structuredOutput = marketResearchData.structured_output
      prompt += `## 시장 조사에서 파악된 타겟 고객 세그먼트\n\n`

      if (structuredOutput.targetSegments && structuredOutput.targetSegments.length > 0) {
        prompt += `### 주요 타겟 세그먼트\n`
        structuredOutput.targetSegments.forEach((segment: string, idx: number) => {
          prompt += `${idx + 1}. ${segment}\n`
          marketTargetSegments.push(segment)
        })
        prompt += `\n`
      }

      if (structuredOutput.customerNeeds) {
        prompt += `### 파악된 고객 니즈\n${structuredOutput.customerNeeds}\n\n`
      }

      if (structuredOutput.competitiveAdvantage) {
        prompt += `### 경쟁 우위 요소 (고객 관점)\n${structuredOutput.competitiveAdvantage}\n\n`
      }
    } else if (marketResearchData && marketResearchData.analysis_data) {
      const analysisData = marketResearchData.analysis_data
      prompt += `## 시장 조사 분석 결과\n\n`

      if (analysisData.target_customers) {
        prompt += `### 타겟 고객\n${analysisData.target_customers}\n\n`
        marketTargetSegments.push(analysisData.target_customers)
      }

      if (analysisData.market_insights) {
        prompt += `### 시장 인사이트\n${analysisData.market_insights}\n\n`
      }
    }

    // 문서 내용 요약
    if (documents && documents.length > 0) {
      prompt += `## 업로드된 프로젝트 문서\n`
      documents.forEach((doc, index) => {
        prompt += `${index + 1}. ${doc.name}\n`
        if (doc.summary) {
          prompt += `   요약: ${doc.summary.substring(0, 150)}...\n`
        }
      })
      prompt += `\n`
    }

    // 맞춤형 질문 생성 지시
    prompt += `---

# 페르소나 질문 생성 전략 (웹에이전시 관점)

## 중요: 질문의 대상과 목적
- ❌ 질문 대상은 클라이언트가 **아닙니다**
- ✅ 질문 대상은 **우리 에이전시 UX 팀**입니다
- ✅ 질문의 답변이 **제안서의 UX/사용자 분석 섹션**이 됩니다
- ✅ 클라이언트에게 "우리가 최종 사용자를 깊이 이해하고 있다"는 것을 증명하는 데 활용

## 페르소나 필수 영역 (제안서 활용 관점)

### 1. 최종 사용자 프로필 (Demographics)
- RFP 프로젝트의 최종 사용자는 누구인가?
- 사용자의 조직 내 역할과 의사결정 권한은?
- **제안서 활용**: "타겟 사용자 정의" 섹션

### 2. 사용자 니즈와 기대 (Goals & Motivations)
- 최종 사용자가 이 프로젝트/서비스에서 기대하는 가치는?
- 사용자의 업무 목표와 프로젝트의 연관성은?
- **제안서 활용**: "사용자 가치 제안" 섹션

### 3. 사용자 Pain Points (문제점)
- 현재 사용자가 겪고 있는 불편함과 문제점은?
- 기존 솔루션의 한계와 개선 필요 사항은?
- **제안서 활용**: "문제 정의 및 해결 방안" 섹션

### 4. 사용자 행동 패턴 (Behavioral)
- 사용자의 현재 업무 프로세스와 워크플로우는?
- 디지털 도구 사용 습관과 선호도는?
- **제안서 활용**: "UX 설계 방향" 섹션

### 5. 기술 숙련도 (Technical Proficiency)
- 사용자의 IT/디지털 기술 숙련도 수준은?
- 새로운 시스템 도입에 대한 수용성은?
- **제안서 활용**: "UI 복잡도 및 온보딩 전략" 섹션

### 6. 접점 및 채널 (Channels & Touchpoints)
- 사용자가 주로 사용하는 디바이스와 환경은?
- 서비스 접근 시나리오와 사용 맥락은?
- **제안서 활용**: "멀티채널 전략" 섹션

## 질문 작성 원칙

### ✅ 올바른 질문 예시 (에이전시 UX 팀에게 묻기)
- "RFP 분석 결과, 프로젝트의 주요 최종 사용자 그룹은 누구로 정의할 것인가?"
- "사용자가 현재 경험하는 핵심 Pain Point와 우리 솔루션이 해결할 방식은?"
- "제안서에서 강조할 '사용자 중심 설계' 원칙과 구체적 적용 방안은?"
- "사용자의 기술 숙련도를 고려한 UI 복잡도 전략은?"
- "클라이언트에게 어필할 수 있는 UX 차별화 포인트는?"

### ❌ 잘못된 질문 예시 (일반적인 페르소나 질문)
- "주요 타겟 고객의 연령대는?" ← 너무 일반적, 제안서 맥락 없음
- "프로젝트 예산 범위는?" ← 프로젝트 질문이지 페르소나 질문 아님
- "고객의 취미는?" ← RFP 대응과 무관한 정보

### 질문 개수 및 분포
- **총 6-10개 질문 생성**
- 6가지 페르소나 영역이 고르게 분포
- Pain Points와 행동 패턴은 제안서에서 중요하므로 2개 이상 심화 질문

### 질문 유형 선택 가이드
- **textarea**: 사용자 니즈, Pain Points, UX 전략 등 상세 설명
- **multiselect**: 사용자 그룹, 사용 디바이스, 기능 우선순위 등
- **select**: 기술 숙련도, 주요 사용 환경 등 단일 선택
- **text**: 대표 사용자 직책, 부서 등 간단한 정보

---

# 출력 형식

**JSON 형식으로만 반환하세요. 다른 텍스트는 포함하지 마세요.**

{
  "questions": [
    {
      "category": "사용자 프로필|사용자 니즈|Pain Points|행동 패턴|기술 숙련도|접점/채널",
      "question": "우리 에이전시 UX 팀이 정의할 내용",
      "expectedFormat": "text|select|multiselect|number|textarea",
      "options": ["옵션1", "옵션2"],
      "required": true|false,
      "context": "RFP 분석 결과 + 이 정보가 제안서에 어떻게 활용되는지",
      "priority": "high|medium|low",
      "confidenceScore": 0.0-1.0
    }
  ]
}

정확한 JSON만 반환하세요.`

    return prompt
  }

  // 사전 분석 질문 생성 (웹에이전시 관점 - RFP 대응 전략)
  let prompt = `당신은 경험 많은 웹에이전시의 사업개발팀 PM입니다.

# 상황
우리 웹에이전시는 클라이언트로부터 RFP(제안요청서)를 받았습니다.
방금 RFP 문서를 1차 분석 완료했으며, 이제 **수주를 위한 제안서 작성 전략**을 수립해야 합니다.

# 미션
RFP 분석 결과를 바탕으로, **우리 에이전시 내부 팀(PM, 개발자, 디자이너)이 답변해야 할 전략적 질문**을 생성해주세요.
이 질문들의 답변은 곧 **제안서 작성 방향과 수주 전략**이 됩니다.

# RFP 정보 (분석 완료)
- **프로젝트명**: ${projectInfo?.name || '미정'}
- **프로젝트 설명**: ${projectInfo?.description || '미정'}
- **산업 분야**: ${projectInfo?.industry || '미정'}
`

  if (documents && documents.length > 0) {
    prompt += `\n## 분석된 RFP 문서
${documents.map((doc, index) => `${index + 1}. ${doc.name}${doc.summary ? `\n   - 요약: ${doc.summary}` : ''}`).join('\n')}
`
  }

  prompt += `
---

# 질문 생성 전략 (웹에이전시 관점)

## 중요: 질문의 대상과 목적
- ❌ 질문 대상은 클라이언트가 **아닙니다**
- ✅ 질문 대상은 **우리 에이전시 내부 팀** (PM, 개발자, 디자이너)입니다
- ✅ 질문의 답변이 **제안서 작성 전략과 수주 전략**이 됩니다

## 생성해야 할 질문 카테고리 (6-10개 질문)

### 1. RFP 핵심 요구사항 파악
- RFP에서 클라이언트가 가장 중요하게 생각하는 것은 무엇인가?
- 명시되지 않았지만 숨겨진 요구사항이나 기대는 무엇인가?
- 예시: "RFP에서 파악한 클라이언트의 핵심 Pain Point와 우선순위는?"

### 2. 경쟁 분석 및 차별화 전략
- 이 RFP에 참여할 것으로 예상되는 경쟁 에이전시는?
- 경쟁사 대비 우리 에이전시의 강점과 차별화 포인트는?
- 예시: "예상 경쟁사 대비 우리가 어필할 수 있는 핵심 차별화 요소는?"

### 3. 기술 솔루션 제안 방향
- RFP 요구사항을 충족하기 위한 최적의 기술 스택은?
- 기술적으로 도전적인 부분과 우리의 해결 방안은?
- 예시: "RFP의 기술 요구사항에 대해 우리가 제안할 솔루션 아키텍처는?"

### 4. 프로젝트 실행 계획
- 현실적인 일정 및 마일스톤 계획은?
- 투입할 팀 구성과 각 역할은?
- 예시: "프로젝트를 성공적으로 수행하기 위한 우리 팀 구성과 일정은?"

### 5. 리스크 및 이슈 관리
- 프로젝트 수행 시 예상되는 리스크는?
- 클라이언트와의 협업에서 주의해야 할 점은?
- 예시: "RFP 수행 중 예상되는 주요 리스크와 우리의 대응 방안은?"

### 6. 수주 전략
- 제안서에서 강조해야 할 핵심 포인트는?
- 가격 경쟁력 확보 방안은?
- 예시: "이 RFP 수주를 위해 제안서에서 반드시 강조해야 할 3가지는?"

## 질문 작성 원칙

### ✅ 올바른 질문 예시 (에이전시 팀에게 묻기)
- "RFP 분석 결과, 클라이언트의 핵심 요구사항에 대한 우리의 이해는?"
- "경쟁사 대비 우리 에이전시만의 차별화된 제안 포인트는?"
- "RFP 기술 요구사항을 충족하기 위해 우리가 제안할 기술 스택은?"
- "프로젝트 수주 시 우리가 투입할 팀 구성과 역할은?"
- "예상되는 프로젝트 리스크와 우리의 대응 전략은?"

### ❌ 잘못된 질문 예시 (클라이언트에게 묻는 것처럼 들림)
- "프로젝트의 목표는 무엇입니까?" ← 이미 RFP에서 파악했어야 함
- "예산 범위는 어떻게 됩니까?" ← 우리가 견적을 제시해야 함
- "원하는 기술 스택은 무엇입니까?" ← 우리가 제안해야 함
- "언제까지 완료해야 합니까?" ← RFP에 명시되어 있을 것

## 질문 유형 선택 가이드
- **textarea**: 전략적 분석, 솔루션 제안 등 상세 설명 필요
- **multiselect**: 기술 스택 선택, 리스크 요소, 팀 역할 등
- **text**: 간단한 정보 입력 (프로젝트 기간, 담당자 등)
- **number**: 예산, 인원 수, 일정 (주/월) 등
- **select**: 단일 선택 (개발 방법론, 우선순위 등)

---

# 출력 형식

**JSON 형식으로만 반환하세요. 다른 텍스트는 포함하지 마세요.**

{
  "questions": [
    {
      "category": "RFP 분석|경쟁 전략|기술 솔루션|실행 계획|리스크 관리|수주 전략",
      "question": "우리 에이전시 팀이 답변할 전략적 질문",
      "expectedFormat": "text|select|multiselect|number|textarea",
      "options": ["옵션1", "옵션2"],
      "required": true|false,
      "context": "RFP 분석 결과 인용 + 이 답변이 제안서에 어떻게 활용되는지",
      "priority": "high|medium|low",
      "confidenceScore": 0.0-1.0
    }
  ]
}

정확한 JSON만 반환하세요.`

  return prompt
}

async function callAIForQuestions(
  provider: string,
  apiKey: string,
  model: string,
  prompt: string
): Promise<any> {
  const startTime = Date.now()

  let response: Response

  switch (provider) {
    case 'anthropic':
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model,
          max_tokens: 3000,
          temperature: 0.7,
          messages: [{ role: 'user', content: prompt }]
        })
      })
      break

    case 'openai':
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 3000,
          temperature: 0.7
        })
      })
      break

    case 'google':
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              maxOutputTokens: 3000,
              temperature: 0.7
            }
          })
        }
      )
      break

    default:
      throw new Error(`지원하지 않는 프로바이더: ${provider}`)
  }

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`${provider} API 오류: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const responseTime = Date.now() - startTime

  let content: string
  let usage: any
  let cost: any

  switch (provider) {
    case 'anthropic':
      content = data.content[0].text
      const inputTokens = estimateTokens(prompt)
      const outputTokens = estimateTokens(content)
      const pricing = getAnthropicPricing(model)
      usage = {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens
      }
      cost = {
        inputCost: (inputTokens * pricing.inputCost) / 1000000,
        outputCost: (outputTokens * pricing.outputCost) / 1000000,
        totalCost: ((inputTokens * pricing.inputCost) + (outputTokens * pricing.outputCost)) / 1000000
      }
      break

    case 'openai':
      content = data.choices[0].message.content
      const openaiPricing = getOpenAIPricing(model)
      usage = {
        inputTokens: data.usage.prompt_tokens,
        outputTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens
      }
      cost = {
        inputCost: (data.usage.prompt_tokens * openaiPricing.inputCost) / 1000000,
        outputCost: (data.usage.completion_tokens * openaiPricing.outputCost) / 1000000,
        totalCost: ((data.usage.prompt_tokens * openaiPricing.inputCost) + (data.usage.completion_tokens * openaiPricing.outputCost)) / 1000000
      }
      break

    case 'google':
      content = data.candidates[0].content.parts[0].text
      const googleInputTokens = estimateTokens(prompt)
      const googleOutputTokens = estimateTokens(content)
      const googlePricing = getGoogleAIPricing(model)
      usage = {
        inputTokens: googleInputTokens,
        outputTokens: googleOutputTokens,
        totalTokens: googleInputTokens + googleOutputTokens
      }
      cost = {
        inputCost: (googleInputTokens * googlePricing.inputCost) / 1000000,
        outputCost: (googleOutputTokens * googlePricing.outputCost) / 1000000,
        totalCost: ((googleInputTokens * googlePricing.inputCost) + (googleOutputTokens * googlePricing.outputCost)) / 1000000
      }
      break

    default:
      throw new Error(`지원하지 않는 프로바이더: ${provider}`)
  }

  return {
    content,
    usage,
    cost,
    responseTime
  }
}

function parseQuestions(response: string, requestType?: string): GeneratedQuestion[] {
  try {
    console.log('🔍 [parseQuestions] 파싱 시작, 응답 길이:', response.length, 'requestType:', requestType);

    // 0. 마크다운 코드 블록 제거 (```json ... ``` 또는 ``` ... ```)
    let cleanedResponse = response
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    console.log('🧹 [parseQuestions] 마크다운 제거 후 길이:', cleanedResponse.length);

    // 1. JSON 부분만 추출 (더 유연한 매칭)
    let jsonMatch = cleanedResponse.match(/\{[\s\S]*"questions"[\s\S]*\[[\s\S]*\][\s\S]*\}/);

    if (!jsonMatch) {
      console.warn('⚠️ [parseQuestions] 전체 JSON 구조를 찾을 수 없음, questions 배열만 추출 시도');
      // questions 배열만 추출 시도
      const questionsArrayMatch = cleanedResponse.match(/"questions"\s*:\s*(\[[\s\S]*\])/);
      if (questionsArrayMatch) {
        jsonMatch = [`{"questions": ${questionsArrayMatch[1]}}`];
        console.log('✅ [parseQuestions] questions 배열 추출 성공');
      } else {
        throw new Error('JSON 형식을 찾을 수 없습니다.');
      }
    }

    const parsed = JSON.parse(jsonMatch[0]);
    console.log('✅ [parseQuestions] JSON 파싱 성공');

    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      console.error('❌ [parseQuestions] questions 배열이 없거나 배열이 아님:', {
        hasQuestions: !!parsed.questions,
        isArray: Array.isArray(parsed.questions),
        parsedKeys: Object.keys(parsed)
      });
      throw new Error('questions 배열을 찾을 수 없습니다.');
    }

    console.log(`📊 [parseQuestions] ${parsed.questions.length}개의 질문 발견`);

    // 2. 필드명 정규화 (두 가지 형식 모두 지원)
    const normalizedQuestions = parsed.questions.map((q: any, index: number) => {
      // 🔥 필드명 우선순위: PreAnalysisService 형식 > 기존 형식
      const normalized = {
        category: q.category || '기타',
        // question 필드 우선 (PreAnalysisService가 기대하는 형식)
        text: q.question || q.text || '',
        // expectedFormat 필드 우선
        type: q.expectedFormat || q.type || 'textarea',
        options: q.options,
        required: q.required !== undefined ? q.required : false,
        // context 필드 우선
        helpText: q.context || q.helpText || '',
        priority: q.priority || 'medium',
        // confidenceScore 필드 우선
        confidence: q.confidenceScore !== undefined ? q.confidenceScore : (q.confidence || 0.8)
      };

      // 디버깅: 각 질문의 필드 매핑 확인
      if (index === 0) {
        console.log('🔍 [parseQuestions] 첫 번째 질문 필드 매핑:', {
          원본필드: Object.keys(q),
          정규화필드: Object.keys(normalized),
          question필드: q.question || q.text,
          expectedFormat필드: q.expectedFormat || q.type,
          context필드: q.context || q.helpText,
          confidenceScore필드: q.confidenceScore || q.confidence
        });
      }

      return normalized;
    }).filter((q: GeneratedQuestion) => q.text.trim() !== '');

    console.log(`✅ [parseQuestions] ${normalizedQuestions.length}개의 유효한 질문 파싱 완료`);

    if (normalizedQuestions.length === 0) {
      console.warn('⚠️ [parseQuestions] 유효한 질문이 없음, 기본 질문 반환');
      throw new Error('유효한 질문이 없습니다.');
    }

    return normalizedQuestions;

  } catch (error) {
    console.error('❌ [parseQuestions] 질문 파싱 실패:', {
      error: error instanceof Error ? error.message : String(error),
      응답길이: response.length,
      응답앞부분: response.substring(0, 500),
      requestType
    });

    // 파싱 실패 시 requestType에 따라 적절한 기본 질문 반환
    console.log('🔄 [parseQuestions] 기본 질문 반환, requestType:', requestType);

    // 페르소나 질문 기본값
    if (requestType === 'personas_questions') {
      return [
        {
          category: '사용자 프로필',
          text: 'RFP 분석 결과, 프로젝트의 주요 최종 사용자 그룹은 누구로 정의할 것인가?',
          type: 'textarea',
          required: true,
          helpText: '제안서의 "타겟 사용자 정의" 섹션에 활용됩니다. 사용자의 직책, 역할, 조직 내 위치를 포함해주세요.',
          priority: 'high',
          confidence: 0.9
        },
        {
          category: 'Pain Points',
          text: '타겟 사용자가 현재 경험하고 있는 핵심 문제점과 불편함은 무엇인가?',
          type: 'textarea',
          required: true,
          helpText: '제안서의 "문제 정의 및 해결 방안" 섹션에 활용됩니다. 구체적인 업무 상황과 함께 설명해주세요.',
          priority: 'high',
          confidence: 0.9
        },
        {
          category: '사용자 니즈',
          text: '사용자가 이 프로젝트/서비스에서 기대하는 핵심 가치와 목표는 무엇인가?',
          type: 'textarea',
          required: true,
          helpText: '제안서의 "사용자 가치 제안" 섹션에 활용됩니다. 업무 효율성, 비용 절감 등 기대 효과를 포함해주세요.',
          priority: 'high',
          confidence: 0.9
        },
        {
          category: '행동 패턴',
          text: '타겟 사용자의 현재 업무 프로세스와 디지털 도구 사용 습관은 어떠한가?',
          type: 'textarea',
          required: true,
          helpText: '제안서의 "UX 설계 방향" 섹션에 활용됩니다. 일상적인 워크플로우를 설명해주세요.',
          priority: 'medium',
          confidence: 0.85
        },
        {
          category: '기술 숙련도',
          text: '타겟 사용자의 IT/디지털 기술 숙련도 수준은 어느 정도인가?',
          type: 'select',
          options: ['초급 (기본 사용만 가능)', '중급 (일반 기능 활용)', '고급 (고급 기능 활용)', '전문가 (기술적 세부사항 이해)'],
          required: true,
          helpText: '제안서의 "UI 복잡도 및 온보딩 전략" 섹션에 활용됩니다.',
          priority: 'medium',
          confidence: 0.85
        },
        {
          category: '접점/채널',
          text: '사용자가 주로 사용하는 디바이스와 서비스 접근 환경은 무엇인가?',
          type: 'multiselect',
          options: ['데스크톱 PC', '노트북', '태블릿', '스마트폰', '사내 네트워크', '외부 네트워크', '모바일 환경'],
          required: true,
          helpText: '제안서의 "멀티채널 전략" 섹션에 활용됩니다.',
          priority: 'medium',
          confidence: 0.85
        }
      ];
    }

    // 시장 조사 질문 기본값
    if (requestType === 'market_research_questions') {
      return [
        {
          category: '시장 규모',
          text: '클라이언트 산업에서 유사 프로젝트의 시장 규모와 성장 전망은 어떠한가?',
          type: 'textarea',
          required: true,
          helpText: '제안서의 "시장 분석" 섹션에 활용됩니다. 시장 규모, 성장률, 트렌드를 포함해주세요.',
          priority: 'high',
          confidence: 0.9
        },
        {
          category: '경쟁 분석',
          text: '이 RFP에 참여할 것으로 예상되는 경쟁 에이전시와 그들의 강점/약점은?',
          type: 'textarea',
          required: true,
          helpText: '제안서의 "차별화 전략" 섹션에 활용됩니다. 경쟁사 분석과 우리의 우위를 설명해주세요.',
          priority: 'high',
          confidence: 0.9
        },
        {
          category: '비즈니스 환경',
          text: '클라이언트의 비즈니스 환경에서 이 프로젝트가 갖는 전략적 중요성은?',
          type: 'textarea',
          required: true,
          helpText: '클라이언트 입장에서 이 프로젝트의 비즈니스 가치를 분석해주세요.',
          priority: 'high',
          confidence: 0.85
        },
        {
          category: '기술 트렌드',
          text: 'RFP 요구사항에 부합하는 최신 기술 트렌드와 우리의 적용 방안은?',
          type: 'textarea',
          required: true,
          helpText: '업계에서 성공한 기술 솔루션 사례와 우리의 기술 적용 방안을 설명해주세요.',
          priority: 'medium',
          confidence: 0.85
        },
        {
          category: '차별화 전략',
          text: '제안서에서 강조할 수 있는 시장 기회 요소와 ROI 근거 데이터는?',
          type: 'textarea',
          required: true,
          helpText: '수주 가능성을 높일 데이터와 성공 사례를 정리해주세요.',
          priority: 'high',
          confidence: 0.85
        }
      ];
    }

    // 제안서 작성 질문 기본값
    if (requestType === 'proposal_questions') {
      return [
        {
          category: '제안 솔루션',
          text: 'RFP의 핵심 요구사항을 충족하기 위해 우리가 제안하는 솔루션의 주요 기능과 기술적 접근 방식은?',
          type: 'textarea',
          required: true,
          helpText: '클라이언트 제출용 제안서의 "제안 솔루션" 섹션에 직접 활용됩니다.',
          priority: 'high',
          confidence: 0.9
        },
        {
          category: '기술 아키텍처',
          text: '프로젝트에 우리가 제안하는 기술 스택과 선택 이유는?',
          type: 'textarea',
          required: true,
          helpText: '프론트엔드, 백엔드, DB, 인프라 등 기술 선택과 그 근거를 설명해주세요.',
          priority: 'high',
          confidence: 0.9
        },
        {
          category: '팀 구성',
          text: '프로젝트에 투입할 우리 팀의 구성과 각 역할은?',
          type: 'textarea',
          required: true,
          helpText: 'PM, 개발자, 디자이너 등 역할별 인원과 투입 기간을 명시해주세요.',
          priority: 'high',
          confidence: 0.9
        },
        {
          category: '일정 계획',
          text: '프로젝트를 몇 단계로 나누어 진행하며, 각 단계의 기간과 산출물은?',
          type: 'textarea',
          required: true,
          helpText: '마일스톤, 일정, 주요 산출물을 포함한 개발 계획을 설명해주세요.',
          priority: 'high',
          confidence: 0.9
        },
        {
          category: '비용 산정',
          text: '프로젝트 총 비용과 항목별 상세 내역은?',
          type: 'textarea',
          required: true,
          helpText: '인건비, 인프라, 라이선스 등 항목별 비용 breakdown을 제시해주세요.',
          priority: 'high',
          confidence: 0.9
        },
        {
          category: '차별화 요소',
          text: '경쟁 에이전시 대비 우리만의 차별화 요소는?',
          type: 'textarea',
          required: true,
          helpText: '우리 에이전시의 강점, 유사 프로젝트 경험, 독특한 제안 포인트를 설명해주세요.',
          priority: 'high',
          confidence: 0.9
        }
      ];
    }

    // 사전 분석 질문 기본값 (기본)
    return [
      {
        category: 'RFP 분석',
        text: 'RFP 분석 결과, 클라이언트의 핵심 요구사항에 대한 우리의 이해는?',
        type: 'textarea',
        required: true,
        helpText: '프로젝트의 핵심 목적과 클라이언트가 중요하게 생각하는 요소를 정리해주세요.',
        priority: 'high',
        confidence: 0.9
      },
      {
        category: '경쟁 전략',
        text: '경쟁사 대비 우리 에이전시만의 차별화된 제안 포인트는?',
        type: 'textarea',
        required: true,
        helpText: '예상 경쟁 에이전시와 비교하여 우리의 강점을 설명해주세요.',
        priority: 'high',
        confidence: 0.9
      },
      {
        category: '기술 솔루션',
        text: 'RFP 기술 요구사항을 충족하기 위해 우리가 제안할 기술 스택은?',
        type: 'textarea',
        required: true,
        helpText: '프론트엔드, 백엔드, 데이터베이스 등 기술 선택과 이유를 포함해주세요.',
        priority: 'high',
        confidence: 0.9
      }
    ];
  }
}

// 토큰 추정 함수
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4) // 1토큰 ≈ 4글자
}

// 가격 정보 함수들
function getAnthropicPricing(model: string): { inputCost: number; outputCost: number } {
  const pricing: Record<string, { inputCost: number; outputCost: number }> = {
    'claude-sonnet-4-5-20250929': { inputCost: 3, outputCost: 15 },
    'claude-3-5-sonnet-20241022': { inputCost: 3, outputCost: 15 },
    'claude-3-opus-20240229': { inputCost: 15, outputCost: 75 },
    'claude-3-haiku-20240307': { inputCost: 0.25, outputCost: 1.25 }
  }
  return pricing[model] || { inputCost: 3, outputCost: 15 }
}

function getOpenAIPricing(model: string): { inputCost: number; outputCost: number } {
  const pricing: Record<string, { inputCost: number; outputCost: number }> = {
    'gpt-4o': { inputCost: 5, outputCost: 15 },
    'gpt-4o-mini': { inputCost: 0.15, outputCost: 0.6 },
    'gpt-4-turbo': { inputCost: 10, outputCost: 30 },
    'gpt-3.5-turbo': { inputCost: 0.5, outputCost: 1.5 }
  }
  return pricing[model] || { inputCost: 5, outputCost: 15 }
}

function getGoogleAIPricing(model: string): { inputCost: number; outputCost: number } {
  const pricing: Record<string, { inputCost: number; outputCost: number }> = {
    'gemini-2.0-flash-exp': { inputCost: 0.075, outputCost: 0.3 },
    'gemini-1.5-pro': { inputCost: 1.25, outputCost: 5 },
    'gemini-1.5-flash': { inputCost: 0.075, outputCost: 0.3 }
  }
  return pricing[model] || { inputCost: 1.25, outputCost: 5 }
}