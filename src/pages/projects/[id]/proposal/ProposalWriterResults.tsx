import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle,
  FileText,
  Download,
  Share,
  Lightbulb,
  Target,
  Zap,
  Calendar,
  CheckSquare,
  Copy,
  Eye
} from 'lucide-react'
import { ProposalDataManager } from '../../../../services/proposal/dataManager'
import { PageContainer, PageHeader, PageContent, Card, Button, Badge } from '../../../../components/LinearComponents'
import { ReportModal } from '../../../../components/reports/ReportModal'

export function ProposalWriterResultsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [responses, setResponses] = useState<any[]>([])
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [projectName, setProjectName] = useState<string>('')

  useEffect(() => {
    const loadResults = async () => {
      if (!id) return

      try {
        setLoading(true)
        const [questions, answers, projectInfo] = await Promise.all([
          ProposalDataManager.getQuestions(id, 'proposal'),
          ProposalDataManager.getResponses(id, 'proposal'),
          ProposalDataManager.getProjectInfo(id)
        ])

        setProjectName(projectInfo?.name || 'Unknown Project')

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
        title="제안서 작성 완료"
        subtitle="제안서 작성 단계가 성공적으로 완료되었습니다"
        description="수집된 정보를 바탕으로 완성된 제안서가 준비되었습니다"
        actions={
          <div className="flex items-center space-x-3">
            <Badge variant="warning">
              <CheckCircle className="w-3 h-3 mr-1" />
              완료됨
            </Badge>

            <button className="flex items-center space-x-2 px-3 py-2 text-text-secondary hover:text-text-primary border border-border-primary rounded-lg hover:bg-bg-tertiary transition-colors">
              <Eye className="w-4 h-4" />
              <span>미리보기</span>
            </button>

            <button
              onClick={() => setReportModalOpen(true)}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>보고서 생성</span>
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
          <Card className="border border-purple-500/30 bg-purple-500/5">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-6 h-6 text-purple-500" />
              <div>
                <h2 className="text-lg font-semibold text-purple-500">제안서 작성 완료!</h2>
                <p className="text-text-secondary">
                  모든 질문에 대한 답변이 수집되었습니다. 이제 다음 단계인 비용 산정으로 진행할 수 있습니다.
                </p>
              </div>
            </div>
          </Card>

          {/* 제안서 구조 */}
          <Card>
            <div className="flex items-center space-x-3 mb-6">
              <FileText className="w-5 h-5 text-purple-500" />
              <h2 className="text-lg font-semibold text-text-primary">제안서 구조</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-bg-tertiary rounded-lg">
                <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Lightbulb className="w-6 h-6 text-purple-500" />
                </div>
                <h3 className="font-semibold text-text-primary mb-1">문제 정의</h3>
                <p className="text-text-secondary text-sm">현황 분석 및 문제 식별</p>
              </div>

              <div className="text-center p-4 bg-bg-tertiary rounded-lg">
                <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Zap className="w-6 h-6 text-purple-500" />
                </div>
                <h3 className="font-semibold text-text-primary mb-1">솔루션 제안</h3>
                <p className="text-text-secondary text-sm">핵심 솔루션 및 기능</p>
              </div>

              <div className="text-center p-4 bg-bg-tertiary rounded-lg">
                <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Calendar className="w-6 h-6 text-purple-500" />
                </div>
                <h3 className="font-semibold text-text-primary mb-1">구현 계획</h3>
                <p className="text-text-secondary text-sm">일정 및 실행 방안</p>
              </div>

              <div className="text-center p-4 bg-bg-tertiary rounded-lg">
                <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckSquare className="w-6 h-6 text-purple-500" />
                </div>
                <h3 className="font-semibold text-text-primary mb-1">위험 관리</h3>
                <p className="text-text-secondary text-sm">리스크 및 성공 지표</p>
              </div>
            </div>
          </Card>

          {/* 제안서 내용 요약 */}
          <Card>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-purple-500" />
                <h2 className="text-lg font-semibold text-text-primary">제안서 내용 요약</h2>
              </div>
              <button className="flex items-center space-x-2 px-3 py-2 text-text-secondary hover:text-text-primary border border-border-primary rounded-lg hover:bg-bg-tertiary transition-colors">
                <Copy className="w-4 h-4" />
                <span>전체 복사</span>
              </button>
            </div>

            <div className="space-y-8">
              {Object.entries(groupedResponses).map(([category, categoryResponses], categoryIndex) => {
                const getCategoryIcon = (category: string) => {
                  if (category.includes('문제')) return <Lightbulb className="w-5 h-5 text-purple-500" />
                  if (category.includes('솔루션')) return <Zap className="w-5 h-5 text-purple-500" />
                  if (category.includes('구현')) return <Calendar className="w-5 h-5 text-purple-500" />
                  if (category.includes('위험')) return <CheckSquare className="w-5 h-5 text-purple-500" />
                  return <Target className="w-5 h-5 text-purple-500" />
                }

                return (
                  <div key={categoryIndex} className="border-l-4 border-purple-500 pl-6">
                    <div className="flex items-center space-x-3 mb-4">
                      {getCategoryIcon(category)}
                      <h3 className="text-lg font-semibold text-text-primary">{category}</h3>
                    </div>

                    <div className="space-y-4">
                      {(categoryResponses as any[]).map((item: any, index: number) => (
                        <div key={index} className="bg-bg-tertiary rounded-lg p-4">
                          <h4 className="font-medium text-text-primary mb-2">{item.question}</h4>
                          <div className="text-text-secondary whitespace-pre-wrap">
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

          {/* 제안서 통계 */}
          <Card>
            <h2 className="text-lg font-semibold text-text-primary mb-6">제안서 통계</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-500 mb-2">
                  {responses.length}
                </div>
                <div className="text-text-secondary">총 질문 수</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-purple-500 mb-2">
                  {responses.filter(r => r.answer !== '답변 없음').length}
                </div>
                <div className="text-text-secondary">답변 완료</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-purple-500 mb-2">
                  {Object.keys(groupedResponses).length}
                </div>
                <div className="text-text-secondary">섹션 수</div>
              </div>
            </div>
          </Card>

          {/* 다음 단계 안내 */}
          <Card>
            <h2 className="text-lg font-semibold text-text-primary mb-4">다음 단계</h2>
            <p className="text-text-secondary mb-4">
              제안서 작성이 완료되었습니다. 이제 마지막 단계인 비용 산정을 진행하여 프로젝트를 완성하세요.
            </p>
            <div className="flex space-x-3">
              <Button.Secondary onClick={() => navigate(`/projects/${id}/proposal`)}>
                워크플로우로 돌아가기
              </Button.Secondary>

              <Button.Primary onClick={() => navigate(`/projects/${id}/proposal/budget`)}>
                비용 산정 시작
              </Button.Primary>
            </div>
          </Card>
        </div>
      </PageContent>

      {/* 보고서 생성 모달 */}
      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        projectId={id!}
        workflowStep="proposal"
        projectName={projectName}
      />
    </PageContainer>
  )
}