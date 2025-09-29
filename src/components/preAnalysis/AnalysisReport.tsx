import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  FileText,
  Download,
  Share2,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Users,
  Calendar,
  DollarSign,
  Target,
  Lightbulb,
} from 'lucide-react';
import { AnalysisReport as AnalysisReportType } from '../../types/preAnalysis';
import { supabase } from '../../lib/supabase';

interface AnalysisReportProps {
  sessionId: string;
  onComplete: () => void;
}

export const AnalysisReport: React.FC<AnalysisReportProps> = ({
  sessionId,
  onComplete,
}) => {
  const [report, setReport] = useState<AnalysisReportType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'insights' | 'risks' | 'recommendations' | 'baseline'>('summary');

  useEffect(() => {
    loadReport();
  }, [sessionId]);

  const loadReport = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!supabase) {
        throw new Error('데이터베이스 연결이 초기화되지 않았습니다.');
      }

      console.log('📊 실제 데이터 기반 보고서 생성 시작:', sessionId);

      // 1. 세션 및 프로젝트 기본 정보 조회
      const { data: session } = await supabase
        .from('pre_analysis_sessions')
        .select(`
          *,
          projects!inner (
            id,
            name,
            description,
            metadata
          )
        `)
        .eq('id', sessionId)
        .single();

      if (!session) {
        throw new Error('세션 정보를 찾을 수 없습니다.');
      }

      const project = session.projects;

      // 2. 문서 분석 결과 조회
      const { data: documentAnalyses } = await supabase
        .from('document_analyses')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      // 3. AI 생성 질문들 조회
      const { data: questions } = await supabase
        .from('ai_questions')
        .select('*')
        .eq('session_id', sessionId)
        .order('order_index', { ascending: true });

      // 4. 사용자 답변들 조회
      const { data: answers } = await supabase
        .from('user_answers')
        .select('*')
        .eq('session_id', sessionId);

      console.log('🔍 수집된 데이터:', {
        project: project?.name,
        documentCount: documentAnalyses?.length || 0,
        questionCount: questions?.length || 0,
        answerCount: answers?.length || 0
      });

      // 5. 실제 데이터를 기반으로 보고서 생성
      const actualReport = await generateReportFromData({
        session,
        project,
        documentAnalyses: documentAnalyses || [],
        questions: questions || [],
        answers: answers || []
      });

      setReport(actualReport);
    } catch (error) {
      setError('보고서를 불러오는 중 오류가 발생했습니다.');
      console.error('보고서 로드 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = (format: 'pdf' | 'json' | 'markdown') => {
    if (!report) return;

    // 실제 구현에서는 서버에서 파일 생성 후 다운로드
    const data = format === 'json' ? JSON.stringify(report, null, 2) : '보고서 내용';
    const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysis-report-${sessionId}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShare = () => {
    // 공유 기능 구현
    if (navigator.share) {
      navigator.share({
        title: '사전 분석 보고서',
        text: report?.summary || '',
        url: window.location.href,
      });
    } else {
      // 폴백: 클립보드에 복사
      navigator.clipboard.writeText(window.location.href);
      alert('링크가 클립보드에 복사되었습니다.');
    }
  };

  // 실제 데이터를 기반으로 보고서 생성
  const generateReportFromData = async (data: {
    session: any;
    project: any;
    documentAnalyses: any[];
    questions: any[];
    answers: any[];
  }): Promise<AnalysisReportType> => {
    const { session, project, documentAnalyses, questions, answers } = data;

    // 답변 완료율 계산
    const completedAnswers = answers.filter(a => !a.is_draft && a.answer?.trim());
    const completionRate = questions.length > 0 ? (completedAnswers.length / questions.length) * 100 : 0;

    // 위험도 평가 (답변 완료율 기반)
    const overallScore = Math.round(completionRate);
    const risks = generateRiskAssessment(completionRate, answers, questions);

    // 문서 분석 결과에서 인사이트 추출
    const insights = extractInsights(documentAnalyses, answers);

    // 권장사항 생성
    const recommendations = generateRecommendations(completionRate);

    // 기초 데이터 구성
    const baselineData = buildBaselineData(project, questions, answers, documentAnalyses);

    return {
      id: `report-${sessionId}`,
      sessionId,
      projectId: project.id,
      summary: `${project.name} 프로젝트의 사전 분석이 완료되었습니다. 총 ${questions.length}개의 질문 중 ${completedAnswers.length}개(${completionRate.toFixed(1)}%)에 대한 답변이 수집되었습니다. ${documentAnalyses.length}개의 문서가 분석되었으며, 웹에이전시 관점에서 프로젝트의 실행 가능성과 위험 요소를 종합적으로 평가했습니다.`,
      executiveSummary: `본 프로젝트는 ${project.description || '상세 설명 미제공'} 프로젝트입니다. 사전 분석 결과 답변 완료율 ${completionRate.toFixed(1)}%를 기록했으며, ${overallScore >= 80 ? '높은' : overallScore >= 60 ? '보통' : '낮은'} 수준의 준비도를 보여줍니다. 주요 위험 요소와 권장사항을 바탕으로 성공적인 프로젝트 실행을 위한 로드맵을 제시합니다.`,
      keyInsights: insights,
      riskAssessment: {
        high: risks.filter(r => r.severity === 'high'),
        medium: risks.filter(r => r.severity === 'medium'),
        low: risks.filter(r => r.severity === 'low'),
        overallScore
      },
      recommendations,
      baselineData,
      visualizationData: {
        riskDistribution: {
          high: risks.filter(r => r.severity === 'high').length,
          medium: risks.filter(r => r.severity === 'medium').length,
          low: risks.filter(r => r.severity === 'low').length
        },
        budgetBreakdown: {
          development: 60,
          design: 20,
          testing: 15,
          infrastructure: 5
        },
        timelinePhases: [
          { name: '요구사항 분석', duration: 20, progress: completionRate },
          { name: '설계 및 개발', duration: 60, progress: 0 },
          { name: '테스트 및 배포', duration: 20, progress: 0 }
        ]
      },
      aiModel: 'claude-3-5-sonnet',
      aiProvider: 'anthropic',
      totalProcessingTime: Math.floor((new Date().getTime() - new Date(session.created_at).getTime()) / 1000),
      totalCost: 0,
      inputTokens: 0,
      outputTokens: 0,
      generatedBy: session.created_by,
      createdAt: new Date()
    };
  };

  // 위험도 평가 생성
  const generateRiskAssessment = (completionRate: number, answers: any[], questions: any[]): Array<{
    id: string;
    category: 'technical' | 'business' | 'timeline' | 'budget' | 'resource';
    title: string;
    description: string;
    probability: number;
    impact: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    mitigation?: string;
  }> => {
    const risks: Array<{
      id: string;
      category: 'technical' | 'business' | 'timeline' | 'budget' | 'resource';
      title: string;
      description: string;
      probability: number;
      impact: number;
      severity: 'low' | 'medium' | 'high' | 'critical';
      mitigation?: string;
    }> = [];

    // 답변 완료율 기반 위험 평가
    if (completionRate < 50) {
      risks.push({
        id: 'incomplete-analysis',
        category: 'business',
        title: '불완전한 요구사항 분석',
        description: `답변 완료율이 ${completionRate.toFixed(1)}%로 낮아 프로젝트 요구사항 파악이 불완전합니다.`,
        probability: 90,
        impact: 80,
        severity: 'high' as const,
        mitigation: '미답변 질문에 대한 추가 분석 및 이해관계자 인터뷰 진행'
      });
    }

    // 필수 질문 미답변 위험
    const requiredQuestions = questions.filter(q => q.required);
    const answeredRequired = requiredQuestions.filter(q =>
      answers.some(a => a.question_id === q.id && !a.is_draft && a.answer?.trim())
    );

    if (answeredRequired.length < requiredQuestions.length) {
      risks.push({
        id: 'missing-requirements',
        category: 'business',
        title: '핵심 요구사항 누락',
        description: `필수 질문 ${requiredQuestions.length}개 중 ${answeredRequired.length}개만 답변되어 핵심 요구사항이 누락될 위험이 있습니다.`,
        probability: 70,
        impact: 90,
        severity: 'high' as const,
        mitigation: '필수 질문에 대한 우선적 답변 수집 및 검토'
      });
    }

    // 기술적 복잡도 평가 (카테고리 기반)
    const technicalQuestions = questions.filter(q => q.category === 'technical');
    if (technicalQuestions.length > 0) {
      risks.push({
        id: 'technical-complexity',
        category: 'technical',
        title: '기술적 복잡도',
        description: '다양한 기술적 요구사항으로 인한 구현 복잡도 증가 가능성',
        probability: 60,
        impact: 70,
        severity: 'medium' as const,
        mitigation: '기술 스택 검토 및 프로토타입 개발을 통한 기술적 검증'
      });
    }

    // 일반적인 프로젝트 리스크 (낮은 수준)
    risks.push({
      id: 'general-project-risk',
      category: 'timeline' as const,
      title: '일반적인 프로젝트 리스크',
      description: '예상되는 일반적인 개발 과정에서의 소규모 지연 및 변경사항',
      probability: 30,
      impact: 40,
      severity: 'low' as const,
      mitigation: '충분한 버퍼 시간 확보 및 체계적인 프로젝트 관리'
    });

    return risks;
  };

  // 인사이트 추출
  const extractInsights = (documentAnalyses: any[], answers: any[]) => {
    const insights = [];

    if (documentAnalyses.length > 0) {
      insights.push(`${documentAnalyses.length}개의 프로젝트 문서가 분석되어 체계적인 접근이 가능합니다.`);
    }

    if (answers.length > 0) {
      const avgConfidence = answers
        .filter(a => !a.is_draft && a.confidence)
        .reduce((sum, a) => sum + a.confidence, 0) / answers.length;

      if (avgConfidence > 70) {
        insights.push('높은 답변 확신도로 명확한 프로젝트 방향성을 확인했습니다.');
      }
    }

    insights.push('웹에이전시 관점에서 프로젝트 실행 가능성을 종합적으로 평가했습니다.');
    insights.push('체계적인 사전 분석을 통해 프로젝트 리스크를 사전에 식별했습니다.');

    return insights;
  };

  // 권장사항 생성
  const generateRecommendations = (completionRate: number) => {
    const recommendations = [];

    if (completionRate < 80) {
      recommendations.push('미답변 질문에 대한 추가 분석을 통해 요구사항을 명확히 하세요.');
    }

    recommendations.push('정기적인 이해관계자 미팅을 통해 프로젝트 진행상황을 공유하세요.');
    recommendations.push('애자일 개발 방법론을 적용하여 변화하는 요구사항에 유연하게 대응하세요.');
    recommendations.push('MVP 접근법으로 핵심 기능을 우선 개발하세요.');
    recommendations.push('지속적인 사용자 피드백을 수집하여 제품의 품질을 향상시키세요.');

    return recommendations;
  };

  // 기초 데이터 구성
  const buildBaselineData = (project: any, questions: any[], answers: any[], documentAnalyses: any[]) => {
    const answeredQuestions = questions.filter(q =>
      answers.some(a => a.question_id === q.id && !a.is_draft && a.answer?.trim())
    );

    return {
      requirements: answeredQuestions
        .filter(q => q.category === 'business' || q.category === 'functional')
        .map(q => q.question)
        .slice(0, 10),
      stakeholders: ['프로젝트 관리자', '개발팀', '디자이너', '클라이언트', '최종 사용자'],
      constraints: [
        '예산 제약',
        '일정 제약',
        '기술적 제약',
        '리소스 제약'
      ],
      timeline: [
        {
          phase: '요구사항 분석 및 설계',
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          duration: 30,
          milestones: ['요구사항 정의', 'UI/UX 설계', '기술 아키텍처']
        }
      ],
      budgetEstimates: {
        development: 60,
        design: 20,
        testing: 15,
        infrastructure: 5
      },
      technicalStack: project.metadata?.tech_stack || ['React', 'TypeScript', 'Node.js'],
      integrationPoints: documentAnalyses.map(da => da.file_name || '외부 시스템').slice(0, 5)
    };
  };

  const getRiskColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'text-red-400 bg-red-900/20 border-red-800';
      case 'medium':
        return 'text-yellow-400 bg-yellow-900/20 border-yellow-800';
      case 'low':
        return 'text-green-400 bg-green-900/20 border-green-800';
      default:
        return 'text-gray-400 bg-gray-900/20 border-gray-700';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">보고서를 생성하는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">오류 발생</h3>
        <p className="text-gray-400">{error}</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 text-gray-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">보고서가 없습니다</h3>
        <p className="text-gray-400">생성된 보고서가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white">종합 분석 보고서</h3>
          <p className="text-gray-400 mt-1">
            사전 분석 결과를 종합한 보고서입니다
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <Share2 className="w-4 h-4" />
            공유
          </button>
          <div className="relative group">
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
              <Download className="w-4 h-4" />
              다운로드
            </button>
            <div className="absolute right-0 top-full mt-2 w-32 bg-gray-800 border border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={() => handleDownload('pdf')}
                className="block w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 rounded-t-lg"
              >
                PDF
              </button>
              <button
                onClick={() => handleDownload('json')}
                className="block w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700"
              >
                JSON
              </button>
              <button
                onClick={() => handleDownload('markdown')}
                className="block w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 rounded-b-lg"
              >
                Markdown
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 보고서 메타 정보 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <BarChart3 className="w-4 h-4" />
            전체 위험도
          </div>
          <div className="text-2xl font-bold text-white">
            {report.riskAssessment.overallScore}/100
          </div>
        </div>

        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <DollarSign className="w-4 h-4" />
            분석 비용
          </div>
          <div className="text-2xl font-bold text-white">
            ${report.totalCost.toFixed(3)}
          </div>
        </div>

        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <Calendar className="w-4 h-4" />
            처리 시간
          </div>
          <div className="text-2xl font-bold text-white">
            {Math.floor(report.totalProcessingTime / 60)}분
          </div>
        </div>

        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <Target className="w-4 h-4" />
            토큰 사용량
          </div>
          <div className="text-2xl font-bold text-white">
            {((report.inputTokens + report.outputTokens) / 1000).toFixed(1)}K
          </div>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="border-b border-gray-700">
        <nav className="flex space-x-8">
          {[
            { id: 'summary', label: '요약', icon: FileText },
            { id: 'insights', label: '주요 인사이트', icon: Lightbulb },
            { id: 'risks', label: '위험 분석', icon: AlertTriangle },
            { id: 'recommendations', label: '권장사항', icon: CheckCircle },
            { id: 'baseline', label: '기초 데이터', icon: TrendingUp },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex items-center gap-2 py-4 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="min-h-[400px]">
        {activeTab === 'summary' && (
          <div className="space-y-6">
            <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
              <h4 className="text-lg font-semibold text-white mb-4">프로젝트 요약</h4>
              <p className="text-gray-300 leading-relaxed">{report.summary}</p>
            </div>

            <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
              <h4 className="text-lg font-semibold text-white mb-4">경영진 요약</h4>
              <p className="text-gray-300 leading-relaxed">{report.executiveSummary}</p>
            </div>
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
            <h4 className="text-lg font-semibold text-white mb-4">주요 인사이트</h4>
            <div className="space-y-3">
              {report.keyInsights.map((insight, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-sm font-medium">{index + 1}</span>
                  </div>
                  <p className="text-gray-300">{insight}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'risks' && (
          <div className="space-y-6">
            {/* 위험도 분포 */}
            <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
              <h4 className="text-lg font-semibold text-white mb-4">위험도 분포</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400 mb-1">
                    {report.riskAssessment.high.length}
                  </div>
                  <div className="text-sm text-gray-400">높음</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400 mb-1">
                    {report.riskAssessment.medium.length}
                  </div>
                  <div className="text-sm text-gray-400">보통</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400 mb-1">
                    {report.riskAssessment.low.length}
                  </div>
                  <div className="text-sm text-gray-400">낮음</div>
                </div>
              </div>
            </div>

            {/* 위험 목록 */}
            <div className="space-y-4">
              {[...report.riskAssessment.high, ...report.riskAssessment.medium, ...report.riskAssessment.low].map((risk) => (
                <div key={risk.id} className={`p-4 rounded-lg border ${getRiskColor(risk.severity)}`}>
                  <div className="flex items-start justify-between mb-2">
                    <h5 className="font-medium">{risk.title}</h5>
                    <span className="text-xs px-2 py-1 rounded bg-current bg-opacity-20">
                      {risk.severity === 'high' ? '높음' : risk.severity === 'medium' ? '보통' : '낮음'}
                    </span>
                  </div>
                  <p className="text-sm opacity-90 mb-3">{risk.description}</p>
                  <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                    <div>
                      <span className="opacity-70">발생 확률:</span> {risk.probability}%
                    </div>
                    <div>
                      <span className="opacity-70">영향도:</span> {risk.impact}%
                    </div>
                  </div>
                  {risk.mitigation && (
                    <div className="text-sm">
                      <span className="opacity-70">완화 방안:</span> {risk.mitigation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'recommendations' && (
          <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
            <h4 className="text-lg font-semibold text-white mb-4">권장사항</h4>
            <div className="space-y-3">
              {report.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <p className="text-gray-300">{recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'baseline' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 요구사항 */}
            <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
              <h4 className="text-lg font-semibold text-white mb-4">핵심 요구사항</h4>
              <div className="space-y-2">
                {report.baselineData.requirements.map((req, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full" />
                    <span className="text-gray-300">{req}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 이해관계자 */}
            <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
              <h4 className="text-lg font-semibold text-white mb-4">이해관계자</h4>
              <div className="space-y-2">
                {report.baselineData.stakeholders.map((stakeholder, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-400" />
                    <span className="text-gray-300">{stakeholder}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 제약사항 */}
            <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
              <h4 className="text-lg font-semibold text-white mb-4">제약사항</h4>
              <div className="space-y-2">
                {report.baselineData.constraints.map((constraint, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-400 rounded-full" />
                    <span className="text-gray-300">{constraint}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 기술 스택 */}
            <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
              <h4 className="text-lg font-semibold text-white mb-4">기술 스택</h4>
              <div className="flex flex-wrap gap-2">
                {report.baselineData.technicalStack.map((tech, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-green-900/30 text-green-300 rounded-full text-sm border border-green-700"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 완료 버튼 */}
      <div className="flex justify-center pt-8">
        <button
          onClick={onComplete}
          className="flex items-center gap-3 px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
        >
          <CheckCircle className="w-5 h-5" />
          사전 분석 완료
        </button>
      </div>
    </div>
  );
};