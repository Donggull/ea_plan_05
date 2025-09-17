import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle,
  TrendingUp,
  Download,
  Share
} from 'lucide-react'
import { ProposalDataManager } from '../../../../services/proposal/dataManager'

export function MarketResearchResultsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [responses, setResponses] = useState<any[]>([])

  useEffect(() => {
    const loadResults = async () => {
      if (!id) return

      try {
        setLoading(true)
        const [questions, answers] = await Promise.all([
          ProposalDataManager.getQuestions(id, 'market_research'),
          ProposalDataManager.getResponses(id, 'market_research')
        ])

        // 질문과 답변을 매핑
        const combinedData = questions.map(question => {
          const answer = answers.find(a => a.question_id === question.question_id)
          return {
            question: question.question_text,
            answer: answer?.answer_data?.answer || '답변 없음',
            category: question.category
          }
        })

        setResponses(combinedData)
      } catch (error) {
        console.error('Failed to load results:', error)
      } finally {
        setLoading(false)
      }
    }

    loadResults()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-text-secondary">결과를 불러오는 중...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* 헤더 */}
      <div className="border-b border-border-primary bg-bg-secondary">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(`/projects/${id}/proposal`)}
                className="p-2 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-tertiary transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                  <h1 className="text-2xl font-semibold text-text-primary">시장 조사 완료</h1>
                  <span className="px-2 py-1 bg-green-500/10 text-green-500 rounded-full text-xs font-medium">
                    완료됨
                  </span>
                </div>
                <p className="text-text-secondary mt-1">
                  시장 조사 단계가 성공적으로 완료되었습니다
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button className="flex items-center space-x-2 px-3 py-2 text-text-secondary hover:text-text-primary border border-border-primary rounded-lg hover:bg-bg-tertiary transition-colors">
                <Download className="w-4 h-4" />
                <span>다운로드</span>
              </button>
              <button className="flex items-center space-x-2 px-3 py-2 text-text-secondary hover:text-text-primary border border-border-primary rounded-lg hover:bg-bg-tertiary transition-colors">
                <Share className="w-4 h-4" />
                <span>공유</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 gap-6">
          {/* 성공 메시지 */}
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-6 h-6 text-green-500" />
              <div>
                <h2 className="text-lg font-semibold text-green-500">시장 조사 완료!</h2>
                <p className="text-text-secondary">
                  모든 질문에 대한 답변이 수집되었습니다. 이제 다음 단계인 페르소나 분석으로 진행할 수 있습니다.
                </p>
              </div>
            </div>
          </div>

          {/* 답변 요약 */}
          <div className="bg-bg-secondary rounded-lg border border-border-primary p-6">
            <div className="flex items-center space-x-3 mb-6">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-semibold text-text-primary">답변 요약</h2>
            </div>

            <div className="space-y-6">
              {responses.map((item, index) => (
                <div key={index} className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-medium text-text-primary mb-2">{item.question}</h3>
                  <div className="text-text-secondary bg-bg-tertiary rounded-lg p-3">
                    {item.answer}
                  </div>
                  <div className="text-xs text-text-muted mt-1">카테고리: {item.category}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 다음 단계 안내 */}
          <div className="bg-bg-secondary rounded-lg border border-border-primary p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">다음 단계</h2>
            <p className="text-text-secondary mb-4">
              시장 조사가 완료되었습니다. 이제 수집된 정보를 바탕으로 페르소나 분석을 진행하세요.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => navigate(`/projects/${id}/proposal`)}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                워크플로우로 돌아가기
              </button>
              <button
                onClick={() => navigate(`/projects/${id}/proposal/personas`)}
                className="px-4 py-2 border border-primary-500 text-primary-500 rounded-lg hover:bg-primary-500/10 transition-colors"
              >
                페르소나 분석 시작
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}