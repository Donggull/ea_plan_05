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

    // 응답 파싱 및 질문 추출
    const questions = parseQuestions(aiResponse.content)
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

  // 시장 조사 질문 생성 (사전 분석 데이터 활용)
  if (context?.requestType === 'market_research_questions') {
    let prompt = `당신은 경험이 풍부한 시장 조사 전문가입니다. 사전 분석 단계에서 도출된 인사이트를 바탕으로 시장 조사를 위한 핵심 질문들을 생성해주세요.

프로젝트 정보:
- 이름: ${projectInfo?.name || '미정'}
- 설명: ${projectInfo?.description || '미정'}
- 산업 분야: ${projectInfo?.industry || '미정'}
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

    prompt += `\n시장 조사를 위한 질문 생성 요구사항:
1. **반드시** 위에 제공된 사전 분석 인사이트를 기반으로 6-10개의 맞춤형 질문을 생성하세요.
2. 다음 카테고리를 포함하되, 각 질문은 사전 분석에서 발견된 내용을 직접 참조해야 합니다:
   - 시장 규모 및 성장성: 사전 분석에서 언급된 시장 데이터를 구체화
   - 경쟁 환경 분석: 사전 분석에서 발견된 경쟁사나 시장 상황을 심화
   - 타겟 고객: 문서에서 언급된 고객 정보를 확장
   - 시장 진입 전략: 권장사항과 발견사항을 실행 전략으로 전환
   - 기술적 요구사항: 기술 인사이트를 구체적 요구사항으로 변환
3. **중요**: 일반적인 질문 대신, 프로젝트 고유의 맥락을 반영한 구체적 질문을 생성하세요.
   - 나쁜 예: "국내 AI 서비스 시장의 현재 규모는?"
   - 좋은 예: "${projectInfo?.name || '이 프로젝트'}의 주요 목표 시장에서 경쟁 우위를 확보하기 위한 핵심 차별화 요소는?"
4. 각 질문의 helpText에는 사전 분석에서 발견된 관련 내용을 간단히 언급하세요.
5. 답변을 통해 즉시 실행 가능한 인사이트를 얻을 수 있어야 합니다.

출력 형식 (JSON):
{
  "questions": [
    {
      "category": "카테고리명 (예: 시장 규모, 경쟁 분석, 타겟 고객)",
      "question": "질문 내용",
      "expectedFormat": "text|select|multiselect|number|textarea",
      "options": ["옵션1", "옵션2"] (select/multiselect인 경우만),
      "required": true|false,
      "context": "질문에 대한 구체적인 도움말",
      "priority": "high|medium|low",
      "confidenceScore": 0.0-1.0
    }
  ]
}

정확한 JSON 형식만 반환하고 다른 텍스트는 포함하지 마세요.`

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

  // 페르소나 분석 질문 생성 (프로젝트 맥락 중심 개선)
  if (context?.requestType === 'personas_questions') {
    let prompt = `당신은 경험이 풍부한 프로젝트 컨설턴트이자 페르소나 분석 전문가입니다.

# 미션
이 프로젝트의 성공을 위해 **반드시 이해해야 하는 타겟 고객**을 심층 분석할 질문들을 생성해주세요.

# 프로젝트 기본 정보
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

# 질문 생성 전략

## Step 1: 프로젝트 맥락 분석
위에서 제공된 정보를 바탕으로 다음을 분석하세요:
- **핵심 과제**: 이 프로젝트가 해결하려는 주요 문제는 무엇인가?
- **타겟 고객 가설**: 사전 분석과 시장 조사에서 언급된 타겟 고객은 누구인가?
- **검증 필요 사항**: 타겟 고객에 대해 아직 명확하지 않은 부분은 무엇인가?

## Step 2: 페르소나 필수 영역 매핑
페르소나 분석은 다음 6가지 영역을 포함해야 합니다:

### 1. 인구통계학적 정보 (Demographics)
- 연령대, 성별, 지역, 직업, 소득 수준, 교육 수준, 조직 내 역할(B2B인 경우)
- **프로젝트 연결**: 사전 분석/시장 조사에서 언급된 타겟의 기본 속성 검증

### 2. 심리적 특성 (Psychographics)
- 가치관, 라이프스타일, 관심사, 태도, 조직 문화(B2B인 경우)
- **프로젝트 연결**: 타겟의 의사결정 방식, 기술 수용 태도, 변화에 대한 저항

### 3. 행동 패턴 (Behavioral)
- 구매/의사결정 패턴, 정보 탐색 방식, 제품/서비스 사용 빈도 및 방법
- **프로젝트 연결**: 현재 사용 중인 대체 솔루션, 업무 프로세스, 기술 활용도

### 4. 목표와 동기 (Goals & Motivations)
- 달성하고자 하는 목표, 제품/서비스를 찾는 이유, 성공의 정의
- **프로젝트 연결**: 사전 분석에서 도출된 핵심 과제와 타겟의 목표 일치도

### 5. Pain Points (고충점)
- 현재 겪고 있는 문제점, 불편함, 불만 사항, 해결되지 않은 니즈
- **프로젝트 연결**: 프로젝트가 해결하려는 문제와 타겟의 실제 고충 연결

### 6. 채널 및 접점 (Channels & Touchpoints)
- 정보 획득 경로, 선호하는 소통 채널, 영향력 있는 정보원
- **프로젝트 연결**: 마케팅 및 사용자 확보 전략 수립을 위한 기초 데이터

## Step 3: 프로젝트 맞춤형 질문 생성
**중요: 일반적인 템플릿 질문이 아니라, 이 프로젝트의 고유한 맥락이 반영된 질문을 생성하세요.**

### 질문 생성 원칙
✅ **좋은 질문의 조건:**
- 프로젝트명이나 핵심 과제가 질문에 포함됨
- 사전 분석/시장 조사에서 도출된 가설을 검증함
- 답변이 프로젝트 의사결정에 직접 활용 가능함
- 구체적이고 명확한 답변을 유도함

✅ **좋은 질문 예시:**
- "${projectInfo?.name || '이 프로젝트'}의 핵심 의사결정자는 어떤 조직 내 역할을 담당하나요?" (인구통계)
- "타겟 고객이 ${projectCoreIssues[0] ? '현재 ' + projectCoreIssues[0].substring(0, 30) + '... 문제를' : '현재 가장 큰 문제로'} 인식하는 근본 원인은 무엇인가요?" (Pain Points)
- "타겟 고객이 새로운 솔루션을 도입할 때 가장 중요하게 고려하는 요인은 무엇인가요?" (행동 패턴)
- "${marketTargetSegments[0] ? marketTargetSegments[0] + ' 세그먼트의' : '타겟 고객의'} 기술 숙련도와 디지털 도구 활용 수준은?" (행동 패턴)

❌ **피해야 할 질문:**
- "주요 타겟 고객의 연령대는?" ← 너무 일반적, 프로젝트 맥락 없음
- "프로젝트 예산 범위는?" ← 프로젝트 질문이지 페르소나 질문 아님
- "필요한 기술 스택은?" ← 기술 요구사항이지 고객 특성 아님
- "주요 마일스톤은?" ← 일정 관리 질문이지 고객 페르소나 아님

### 질문 개수 및 분포
- **총 6-10개 질문 생성**
- 6가지 페르소나 영역이 고르게 분포되도록 구성
- 프로젝트 핵심 과제와 관련된 영역은 2-3개 질문으로 심화

### 질문 유형 (type) 선택 가이드
- **text**: 짧은 텍스트 입력 (예: 직책명, 소속 부서)
- **textarea**: 긴 설명이 필요한 경우 (예: 고충 사항 상세 설명, 의사결정 과정)
- **select**: 단일 선택 (예: 주요 역할, 기술 숙련도 수준)
- **multiselect**: 복수 선택 (예: 정보 채널, 의사결정 요인, 사용 도구)
- **number**: 숫자 입력 (예: 팀 규모, 예산 범위)

### helpText 작성 원칙
- 사전 분석/시장 조사에서 도출된 관련 인사이트를 간략히 언급
- 왜 이 질문이 중요한지 프로젝트 맥락에서 설명
- 답변 작성 시 참고할 구체적 가이드 제공

---

# 출력 형식

**JSON 형식으로만 반환하세요. 다른 텍스트는 포함하지 마세요.**

JSON 형식:
{
  "questions": [
    {
      "category": "인구통계|심리특성|행동패턴|목표/동기|Pain Points|소통채널",
      "question": "프로젝트 맥락이 반영된 구체적 질문",
      "expectedFormat": "text|select|multiselect|number|textarea",
      "options": ["옵션1", "옵션2"],
      "required": true|false,
      "context": "왜 이 질문이 중요한지 + 답변 가이드",
      "priority": "high|medium|low",
      "confidenceScore": 0.0-1.0
    }
  ]
}

정확한 JSON만 반환하세요.`

    return prompt
  }

  // 사전 분석 질문 생성 (기존 로직)
  let prompt = `당신은 전문 프로젝트 컨설턴트입니다. 사전 분석 단계에서 필요한 핵심 질문들을 생성해주세요.

프로젝트 정보:
- 이름: ${projectInfo?.name || '미정'}
- 설명: ${projectInfo?.description || '미정'}
- 산업 분야: ${projectInfo?.industry || '미정'}
`

  if (documents && documents.length > 0) {
    prompt += `\n업로드된 문서들:
${documents.map((doc, index) => `${index + 1}. ${doc.name}${doc.summary ? ` - ${doc.summary}` : ''}`).join('\n')}
`
  }

  prompt += `
요구사항:
1. 프로젝트 특성에 맞는 5-8개의 핵심 질문을 생성하세요.
2. 각 질문은 프로젝트 이해를 돕는 실질적인 정보를 얻기 위한 것이어야 합니다.
3. 다양한 카테고리(기술, 비즈니스, 일정, 예산, 위험 등)를 포함하세요.
4. 각 질문의 중요도와 신뢰도를 설정해주세요.

출력 형식 (JSON):
{
  "questions": [
    {
      "category": "카테고리명",
      "question": "질문 내용",
      "expectedFormat": "text|select|multiselect|number|textarea",
      "options": ["옵션1", "옵션2"] (select/multiselect인 경우),
      "required": true|false,
      "context": "질문에 대한 도움말",
      "priority": "high|medium|low",
      "confidenceScore": 0.0-1.0
    }
  ]
}

정확한 JSON 형식만 반환하고 다른 텍스트는 포함하지 마세요.`

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

function parseQuestions(response: string): GeneratedQuestion[] {
  try {
    console.log('🔍 [parseQuestions] 파싱 시작, 응답 길이:', response.length);

    // 1. JSON 부분만 추출 (더 유연한 매칭)
    let jsonMatch = response.match(/\{[\s\S]*"questions"[\s\S]*\[[\s\S]*\][\s\S]*\}/);

    if (!jsonMatch) {
      console.warn('⚠️ [parseQuestions] 전체 JSON 구조를 찾을 수 없음, questions 배열만 추출 시도');
      // questions 배열만 추출 시도
      const questionsArrayMatch = response.match(/"questions"\s*:\s*(\[[\s\S]*\])/);
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
      응답앞부분: response.substring(0, 500)
    });

    // 파싱 실패 시 기본 질문 반환
    console.log('🔄 [parseQuestions] 기본 질문 반환');
    return [
      {
        category: '프로젝트 개요',
        text: '이 프로젝트의 주요 목표는 무엇입니까?',
        type: 'textarea',
        required: true,
        helpText: '프로젝트의 핵심 목적과 기대 효과를 구체적으로 설명해주세요.',
        priority: 'high',
        confidence: 0.9
      },
      {
        category: '기술 요구사항',
        text: '프로젝트에 필요한 주요 기술 스택은 무엇입니까?',
        type: 'textarea',
        required: true,
        helpText: '사용할 프로그래밍 언어, 프레임워크, 데이터베이스 등을 포함해주세요.',
        priority: 'high',
        confidence: 0.9
      },
      {
        category: '일정 관리',
        text: '프로젝트 완료 목표 시점은 언제입니까?',
        type: 'text',
        required: true,
        helpText: '예상 완료 날짜나 기간을 입력해주세요.',
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