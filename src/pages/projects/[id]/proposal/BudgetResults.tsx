import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle,
  DollarSign,
  Download,
  Share,
  Calculator,
  Clock,
  Users,
  Zap,
  TrendingUp,
  BarChart3,
  FileSpreadsheet
} from 'lucide-react'
import { ProposalDataManager } from '../../../../services/proposal/dataManager'
import { PageContainer, PageHeader, PageContent, Card, Button, Badge } from '../../../../components/LinearComponents'

export function BudgetResultsPage() {
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
          ProposalDataManager.getQuestions(id, 'budget'),
          ProposalDataManager.getResponses(id, 'budget')
        ])

        // 질문과 답변을 매핑
        const combinedData = questions.map(question => {
          const answer = answers.find(a => a.question_id === question.question_id)
          return {
            question: question.question_text,
            answer: answer?.answer_data?.answer || '답변 없음',
            category: question.category,
            questionId: question.question_id,
            type: question.question_type
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

  // 비용 계산 로직
  const calculateDetailedCost = () => {
    const responseMap = responses.reduce((acc, response) => {
      acc[response.questionId] = response.answer
      return acc
    }, {} as Record<string, any>)

    const devHours = Number(responseMap['budget_dev_hours']) || 0
    const hourlyRate = Number(responseMap['budget_hourly_rate']) || 0
    const designCost = Number(responseMap['budget_design_cost']) || 0
    const infrastructureCost = Number(responseMap['budget_infrastructure_cost']) || 0
    const licenseCost = Number(responseMap['budget_license_cost']) || 0
    const duration = Number(responseMap['budget_project_duration']) || 1
    const contingency = Number(responseMap['budget_contingency']) || 0
    const maintenanceRate = Number(responseMap['budget_maintenance_rate']) || 0

    const developmentCost = devHours * hourlyRate
    const totalInfrastructureCost = infrastructureCost * duration
    const totalLicenseCost = licenseCost * duration
    const subtotal = developmentCost + designCost + totalInfrastructureCost + totalLicenseCost
    const contingencyAmount = subtotal * (contingency / 100)
    const totalProjectCost = subtotal + contingencyAmount
    const annualMaintenanceCost = developmentCost * (maintenanceRate / 100)

    return {
      developmentCost,
      designCost,
      totalInfrastructureCost,
      totalLicenseCost,
      contingencyAmount,
      totalProjectCost,
      annualMaintenanceCost,
      subtotal,
      breakdown: [
        { name: '개발비', value: developmentCost, color: '#3B82F6' },
        { name: '디자인비', value: designCost, color: '#10B981' },
        { name: '인프라비', value: totalInfrastructureCost, color: '#F59E0B' },
        { name: '라이선스비', value: totalLicenseCost, color: '#8B5CF6' },
        { name: '예비비', value: contingencyAmount, color: '#EF4444' }
      ].filter(item => item.value > 0)
    }
  }

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

  const costDetails = calculateDetailedCost()

  return (
    <PageContainer>
      <PageHeader
        title="비용 산정 완료"
        subtitle="비용 산정 단계가 성공적으로 완료되었습니다"
        description="모든 워크플로우 단계가 완료되어 최종 프로젝트 제안서가 준비되었습니다"
        actions={
          <div className="flex items-center space-x-3">
            <Badge variant="error">
              <CheckCircle className="w-3 h-3 mr-1" />
              완료됨
            </Badge>

            <button className="flex items-center space-x-2 px-3 py-2 text-text-secondary hover:text-text-primary border border-border-primary rounded-lg hover:bg-bg-tertiary transition-colors">
              <FileSpreadsheet className="w-4 h-4" />
              <span>견적서 생성</span>
            </button>

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
          <Card className="border border-orange-500/30 bg-orange-500/5">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-6 h-6 text-orange-500" />
              <div>
                <h2 className="text-lg font-semibold text-orange-500">모든 단계 완료!</h2>
                <p className="text-text-secondary">
                  시장 조사, 페르소나 분석, 제안서 작성, 비용 산정이 모두 완료되었습니다.
                  이제 완성된 프로젝트 제안서를 고객에게 전달할 수 있습니다.
                </p>
              </div>
            </div>
          </Card>

          {/* 총 비용 요약 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <DollarSign className="w-5 h-5 text-orange-500" />
                <h2 className="text-lg font-semibold text-text-primary">비용 요약</h2>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-bg-tertiary rounded-lg">
                  <span className="text-text-secondary">개발 비용</span>
                  <span className="text-xl font-semibold text-text-primary">
                    ₩{costDetails.developmentCost.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center p-4 bg-bg-tertiary rounded-lg">
                  <span className="text-text-secondary">디자인 비용</span>
                  <span className="text-xl font-semibold text-text-primary">
                    ₩{costDetails.designCost.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center p-4 bg-bg-tertiary rounded-lg">
                  <span className="text-text-secondary">인프라 비용</span>
                  <span className="text-xl font-semibold text-text-primary">
                    ₩{costDetails.totalInfrastructureCost.toLocaleString()}
                  </span>
                </div>

                {costDetails.totalLicenseCost > 0 && (
                  <div className="flex justify-between items-center p-4 bg-bg-tertiary rounded-lg">
                    <span className="text-text-secondary">라이선스 비용</span>
                    <span className="text-xl font-semibold text-text-primary">
                      ₩{costDetails.totalLicenseCost.toLocaleString()}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center p-4 bg-bg-tertiary rounded-lg">
                  <span className="text-text-secondary">예비 비용</span>
                  <span className="text-xl font-semibold text-text-primary">
                    ₩{costDetails.contingencyAmount.toLocaleString()}
                  </span>
                </div>

                <div className="border-t border-border-primary pt-4">
                  <div className="flex justify-between items-center p-4 bg-orange-500/10 rounded-lg">
                    <span className="text-lg font-semibold text-text-primary">총 프로젝트 비용</span>
                    <span className="text-2xl font-bold text-orange-500">
                      ₩{costDetails.totalProjectCost.toLocaleString()}
                    </span>
                  </div>
                </div>

                {costDetails.annualMaintenanceCost > 0 && (
                  <div className="mt-4 p-4 bg-blue-500/10 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-text-secondary">연간 유지보수 비용</span>
                      <span className="text-lg font-semibold text-blue-500">
                        ₩{costDetails.annualMaintenanceCost.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold text-text-primary mb-4">비용 구성</h3>

              <div className="space-y-3">
                {costDetails.breakdown.map((item, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <span className="text-text-secondary text-sm">{item.name}</span>
                        <span className="text-text-primary text-sm font-medium">
                          {((item.value / costDetails.subtotal) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-bg-tertiary rounded-lg text-center">
                <BarChart3 className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                <div className="text-sm text-text-muted">
                  상세 분석 차트는 다운로드된 보고서에서 확인하실 수 있습니다
                </div>
              </div>
            </Card>
          </div>

          {/* 프로젝트 정보 요약 */}
          <Card>
            <div className="flex items-center space-x-3 mb-6">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              <h2 className="text-lg font-semibold text-text-primary">프로젝트 정보</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-6 h-6 text-orange-500" />
                </div>
                <h3 className="font-semibold text-text-primary mb-1">프로젝트 기간</h3>
                <p className="text-text-secondary">
                  {responses.find(r => r.questionId === 'budget_project_duration')?.answer || '-'}개월
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-orange-500" />
                </div>
                <h3 className="font-semibold text-text-primary mb-1">팀 규모</h3>
                <p className="text-text-secondary">
                  {responses.find(r => r.questionId === 'budget_team_size')?.answer || '-'}명
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Zap className="w-6 h-6 text-orange-500" />
                </div>
                <h3 className="font-semibold text-text-primary mb-1">복잡도</h3>
                <p className="text-text-secondary">
                  {responses.find(r => r.questionId === 'budget_complexity')?.answer || '-'}
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Calculator className="w-6 h-6 text-orange-500" />
                </div>
                <h3 className="font-semibold text-text-primary mb-1">개발 시간</h3>
                <p className="text-text-secondary">
                  {responses.find(r => r.questionId === 'budget_dev_hours')?.answer || '-'}시간
                </p>
              </div>
            </div>
          </Card>

          {/* 상세 답변 요약 */}
          <Card>
            <div className="flex items-center space-x-3 mb-6">
              <DollarSign className="w-5 h-5 text-orange-500" />
              <h2 className="text-lg font-semibold text-text-primary">비용 산정 상세 정보</h2>
            </div>

            <div className="space-y-8">
              {Object.entries(groupedResponses).map(([category, categoryResponses], categoryIndex) => {
                const getCategoryIcon = (category: string) => {
                  if (category.includes('규모')) return <TrendingUp className="w-5 h-5 text-orange-500" />
                  if (category.includes('개발')) return <Calculator className="w-5 h-5 text-orange-500" />
                  if (category.includes('운영')) return <Clock className="w-5 h-5 text-orange-500" />
                  if (category.includes('기타')) return <Zap className="w-5 h-5 text-orange-500" />
                  return <DollarSign className="w-5 h-5 text-orange-500" />
                }

                return (
                  <div key={categoryIndex} className="border-l-4 border-orange-500 pl-6">
                    <div className="flex items-center space-x-3 mb-4">
                      {getCategoryIcon(category)}
                      <h3 className="text-lg font-semibold text-text-primary">{category}</h3>
                    </div>

                    <div className="space-y-4">
                      {(categoryResponses as any[]).map((item: any, index: number) => (
                        <div key={index} className="bg-bg-tertiary rounded-lg p-4">
                          <h4 className="font-medium text-text-primary mb-2">{item.question}</h4>
                          <div className="text-text-secondary">
                            {item.type === 'number' && item.answer !== '답변 없음' ?
                              `${Number(item.answer).toLocaleString()}${
                                item.questionId.includes('cost') ? ' 원' :
                                item.questionId.includes('hours') ? ' 시간' :
                                item.questionId.includes('duration') ? ' 개월' :
                                item.questionId.includes('rate') ? ' %' : ''
                              }` :
                              item.answer
                            }
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* 완료 액션 */}
          <Card>
            <h2 className="text-lg font-semibold text-text-primary mb-4">프로젝트 제안서 완성</h2>
            <p className="text-text-secondary mb-6">
              모든 워크플로우 단계가 완료되었습니다.
              완성된 제안서를 다운로드하거나 고객과 공유할 수 있습니다.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button.Primary onClick={() => navigate(`/projects/${id}`)}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                프로젝트 대시보드
              </Button.Primary>

              <Button.Secondary onClick={() => navigate(`/projects/${id}/proposal`)}>
                워크플로우 요약 보기
              </Button.Secondary>

              <button className="flex items-center justify-center space-x-2 px-4 py-2 text-text-secondary hover:text-text-primary border border-border-primary rounded-lg hover:bg-bg-tertiary transition-colors">
                <Download className="w-4 h-4" />
                <span>전체 보고서 다운로드</span>
              </button>
            </div>
          </Card>
        </div>
      </PageContent>
    </PageContainer>
  )
}