import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle,
  Users,
  Download,
  Share,
  User,
  Heart,
  Target,
  TrendingUp,
  MessageCircle
} from 'lucide-react'
import { ProposalDataManager } from '../../../../services/proposal/dataManager'
import { PageContainer, PageHeader, PageContent, Card, Button, Badge } from '../../../../components/LinearComponents'

export function PersonasResultsPage() {
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
          ProposalDataManager.getQuestions(id, 'personas'),
          ProposalDataManager.getResponses(id, 'personas')
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
      <PageContainer>
        <div className="flex items-center justify-center py-12">
          <div className="text-text-secondary">결과를 불러오는 중...</div>
        </div>
      </PageContainer>
    )
  }

  // 카테고리별로 응답 그룹화
  const groupedResponses = responses.reduce((acc, response) => {
    if (!acc[response.category]) {
      acc[response.category] = []
    }
    acc[response.category].push(response)
    return acc
  }, {} as Record<string, typeof responses>)

  return (
    <PageContainer>
      <PageHeader
        title="페르소나 분석 완료"
        subtitle="페르소나 분석 단계가 성공적으로 완료되었습니다"
        description="수집된 정보를 바탕으로 타겟 고객 페르소나가 정의되었습니다"
        actions={
          <div className="flex items-center space-x-3">
            <Badge variant="success">
              <CheckCircle className="w-3 h-3 mr-1" />
              완료됨
            </Badge>

            <button className="flex items-center space-x-2 px-3 py-2 text-text-secondary hover:text-text-primary border border-border-primary rounded-lg hover:bg-bg-tertiary transition-colors">
              <Download className="w-4 h-4" />
              <span>다운로드</span>
            </button>

            <button className="flex items-center space-x-2 px-3 py-2 text-text-secondary hover:text-text-primary border border-border-primary rounded-lg hover:bg-bg-tertiary transition-colors">
              <Share className="w-4 h-4" />
              <span>공유</span>
            </button>

            <button
              onClick={() => navigate(`/projects/${id}/proposal`)}
              className="flex items-center space-x-2 px-4 py-2 text-text-muted hover:text-text-primary border border-border-primary rounded-lg hover:bg-bg-tertiary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>워크플로우로</span>
            </button>
          </div>
        }
      />

      <PageContent>
        <div className="grid grid-cols-1 gap-6">
          {/* 성공 메시지 */}
          <Card className="border border-green-500/30 bg-green-500/5">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-6 h-6 text-green-500" />
              <div>
                <h2 className="text-lg font-semibold text-green-500">페르소나 분석 완료!</h2>
                <p className="text-text-secondary">
                  모든 질문에 대한 답변이 수집되었습니다. 이제 다음 단계인 제안서 작성으로 진행할 수 있습니다.
                </p>
              </div>
            </div>
          </Card>

          {/* 답변 요약 */}
          <Card>
            <div className="flex items-center space-x-3 mb-6">
              <Users className="w-5 h-5 text-green-500" />
              <h2 className="text-lg font-semibold text-text-primary">페르소나 정보 요약</h2>
            </div>

            <div className="space-y-8">
              {Object.entries(groupedResponses).map(([category, categoryResponses], categoryIndex) => {
                const getCategoryIcon = (category: string) => {
                  if (category.includes('타겟')) return <User className="w-5 h-5 text-green-500" />
                  if (category.includes('행동')) return <TrendingUp className="w-5 h-5 text-green-500" />
                  if (category.includes('목표')) return <Target className="w-5 h-5 text-green-500" />
                  if (category.includes('커뮤니케이션')) return <MessageCircle className="w-5 h-5 text-green-500" />
                  return <Heart className="w-5 h-5 text-green-500" />
                }

                return (
                  <div key={categoryIndex} className="border-l-4 border-green-500 pl-6">
                    <div className="flex items-center space-x-3 mb-4">
                      {getCategoryIcon(category)}
                      <h3 className="text-lg font-semibold text-text-primary">{category}</h3>
                    </div>

                    <div className="space-y-4">
                      {(categoryResponses as any[]).map((item: any, index: number) => (
                        <div key={index} className="bg-bg-tertiary rounded-lg p-4">
                          <h4 className="font-medium text-text-primary mb-2">{item.question}</h4>
                          <div className="text-text-secondary">
                            {item.answer}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* 페르소나 프로필 시각화 */}
          <Card>
            <h2 className="text-lg font-semibold text-text-primary mb-6">타겟 페르소나 프로필</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <User className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="font-semibold text-text-primary mb-2">기본 정보</h3>
                <p className="text-text-secondary text-sm">
                  인구통계학적 특성 및 기본 프로필
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Heart className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="font-semibold text-text-primary mb-2">라이프스타일</h3>
                <p className="text-text-secondary text-sm">
                  가치관, 취미, 관심사
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Target className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="font-semibold text-text-primary mb-2">목표 & 니즈</h3>
                <p className="text-text-secondary text-sm">
                  해결하고자 하는 문제와 목표
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <MessageCircle className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="font-semibold text-text-primary mb-2">커뮤니케이션</h3>
                <p className="text-text-secondary text-sm">
                  선호하는 채널과 의사결정 요인
                </p>
              </div>
            </div>
          </Card>

          {/* 다음 단계 안내 */}
          <Card>
            <h2 className="text-lg font-semibold text-text-primary mb-4">다음 단계</h2>
            <p className="text-text-secondary mb-4">
              페르소나 분석이 완료되었습니다. 이제 정의된 페르소나를 바탕으로 제안서 작성을 진행하세요.
            </p>
            <div className="flex space-x-3">
              <Button.Secondary onClick={() => navigate(`/projects/${id}/proposal`)}>
                워크플로우로 돌아가기
              </Button.Secondary>

              <Button.Primary onClick={() => navigate(`/projects/${id}/proposal/proposal-writer`)}>
                제안서 작성 시작
              </Button.Primary>
            </div>
          </Card>
        </div>
      </PageContent>
    </PageContainer>
  )
}