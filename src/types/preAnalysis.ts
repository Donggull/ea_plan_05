// 사전 분석 모듈 타입 정의
export interface PreAnalysisConfig {
  // AI 모델 설정
  availableModels: {
    primary: string;      // 주 분석 모델 (GPT-4o, Claude Opus 등)
    secondary?: string;   // 보조 검증 모델
    specialized?: {       // 특화 모델
      technical: string;  // 기술 문서 분석용
      business: string;   // 비즈니스 문서 분석용
      creative: string;   // 창의적 분석용
    };
  };

  // MCP 서버 연동 설정
  mcpServers: {
    filesystem: boolean;  // 파일 시스템 접근
    database: boolean;    // DB 쿼리 실행
    websearch: boolean;   // 웹 검색 활용
    github: boolean;      // GitHub 레포지토리 분석
  };

  // 분석 깊이 설정
  analysisDepth: 'quick' | 'standard' | 'deep' | 'comprehensive';
}

// 문서 카테고리
export enum DocumentCategory {
  REQUIREMENTS = 'requirements',     // 요구사항 문서
  TECHNICAL = 'technical',          // 기술 명세서
  BUSINESS = 'business',            // 사업 계획서
  DESIGN = 'design',                // 디자인 가이드
  CONTRACT = 'contract',            // 계약서/제안요청서
  REFERENCE = 'reference',          // 참고 자료
  PRESENTATION = 'presentation'      // 발표 자료
}

// 리스크 항목
export interface RiskItem {
  id: string;
  category: 'technical' | 'business' | 'timeline' | 'budget' | 'resource';
  title: string;
  description: string;
  probability: number; // 0-100
  impact: number;      // 0-100
  severity: 'low' | 'medium' | 'high' | 'critical';
  mitigation?: string;
}

// 타임라인 항목
export interface TimelineItem {
  phase: string;
  startDate?: string;
  endDate?: string;
  duration?: number; // 일 단위
  dependencies?: string[];
  milestones?: string[];
}

// 시장 데이터
export interface MarketData {
  industry: string;
  marketSize?: number;
  growthRate?: number;
  keyTrends: string[];
  challenges: string[];
  opportunities: string[];
}

// 경쟁사 정보
export interface Competitor {
  name: string;
  marketShare?: number;
  strengths: string[];
  weaknesses: string[];
  products: string[];
  pricing?: {
    model: string;
    range: string;
  };
}

// 기술 트렌드
export interface TechTrend {
  technology: string;
  adoptionRate: number;
  maturity: 'emerging' | 'growing' | 'mature' | 'declining';
  relevance: number; // 프로젝트와의 관련성 0-100
  description: string;
}

// 프로젝트 정보 (기존 projects 테이블 참조)
export interface Project {
  id: string;
  name: string;
  description?: string;
  industry?: string;
  technology_stack?: string[];
  budget?: number;
  timeline?: TimelineItem[];
}

// 문서 분석 결과
export interface DocumentAnalysis {
  id: string;
  projectId: string;
  sessionId: string;
  documentId: string;
  category: DocumentCategory;

  // AI 분석 결과
  analysis: {
    summary: string;           // 요약
    keyRequirements: string[]; // 핵심 요구사항
    stakeholders: string[];    // 이해관계자
    constraints: string[];     // 제약사항
    risks: RiskItem[];        // 리스크
    opportunities: string[];   // 기회 요소
    technicalStack: string[];  // 기술 스택
    timeline: TimelineItem[];  // 일정 정보
  };

  // MCP 활용 추가 정보
  mcpEnrichment?: {
    similarProjects: Project[];     // 유사 프로젝트
    marketInsights: MarketData;     // 시장 조사 데이터
    competitorAnalysis: Competitor[]; // 경쟁사 분석
    technologyTrends: TechTrend[];   // 기술 트렌드
  };

  // 메타데이터
  confidenceScore?: number;
  processingTime?: number;
  aiModel: string;
  aiProvider: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
}

// AI 질문
export interface AIQuestion {
  id: string;
  sessionId: string;
  category: 'business' | 'technical' | 'design' | 'timeline' | 'budget' | 'stakeholders' | 'risks';
  question: string;
  context?: string;         // 질문 배경 설명
  required: boolean;         // 필수 답변 여부
  expectedFormat?: string;   // 예상 답변 형식
  relatedDocuments?: string[]; // 관련 문서 ID
  orderIndex: number;

  // AI 생성 메타데이터
  generatedByAI: boolean;
  aiModel?: string;
  confidenceScore?: number;

  createdAt: Date;
}

// 사용자 답변
export interface UserAnswer {
  id: string;
  questionId: string;
  sessionId: string;
  answer: string;
  answerData?: Record<string, any>; // 구조화된 답변 데이터
  confidence: number;      // 답변 확신도 (0-100)
  attachments?: string[];  // 첨부 파일
  notes?: string;          // 추가 메모
  isDraft: boolean;        // 임시 저장 여부

  answeredBy: string;      // 사용자 ID
  answeredAt: Date;
  updatedAt: Date;
}

// 분석 결과
export interface AnalysisResult {
  summary: string;
  insights: string[];
  recommendations: string[];
  risks: RiskItem[];
  opportunities: string[];
  nextSteps: string[];
  confidenceScore: number;
  dataQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

// 사전 분석 세션
export interface PreAnalysisSession {
  id: string;
  projectId: string;
  aiModel: string;
  aiProvider: string;
  mcpConfig: PreAnalysisConfig['mcpServers'];
  analysisDepth: PreAnalysisConfig['analysisDepth'];
  status: 'in_progress' | 'completed' | 'failed' | 'cancelled';

  // 시간 정보
  startedAt: Date;
  completedAt?: Date;
  processingTime?: number; // 처리 시간 (초)

  // 비용 정보
  totalCost: number;

  // 메타데이터
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

// 종합 분석 보고서
export interface AnalysisReport {
  id: string;
  sessionId: string;
  projectId: string;

  // 보고서 내용
  summary: string;
  executiveSummary: string; // 경영진 요약
  keyInsights: string[];
  riskAssessment: {
    high: RiskItem[];
    medium: RiskItem[];
    low: RiskItem[];
    overallScore: number; // 전체 위험도 점수
  };
  recommendations: string[];

  // 기초 데이터 (이후 단계에서 활용)
  baselineData: {
    requirements: string[];
    stakeholders: string[];
    constraints: string[];
    timeline: TimelineItem[];
    budgetEstimates: Record<string, number>;
    technicalStack: string[];
    integrationPoints: string[];
  };

  // 차트 및 시각화 데이터
  visualizationData: Record<string, any>;

  // 메타데이터
  aiModel: string;
  aiProvider: string;
  totalProcessingTime: number; // 전체 처리 시간
  totalCost: number;
  inputTokens: number;
  outputTokens: number;

  generatedBy: string;
  createdAt: Date;
}

// 서비스 응답 타입
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 진행 상황 업데이트
export interface ProgressUpdate {
  sessionId: string;
  stage: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number; // 0-100
  message?: string;
  details?: Record<string, any>;
  timestamp: Date;
}

// MCP 서버 응답
export interface MCPResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    server: string;
    command: string;
    responseTime: number;
  };
}

// AI 모델 정보
export interface AIModelInfo {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google' | 'custom';
  capabilities: string[];
  costPerInputToken: number;
  costPerOutputToken: number;
  maxTokens: number;
  description?: string;
}

// 분석 설정
export interface AnalysisSettings {
  aiModel: string;
  aiProvider: string;
  mcpServers: PreAnalysisConfig['mcpServers'];
  analysisDepth: PreAnalysisConfig['analysisDepth'];
  customInstructions?: string;
  outputFormat?: 'standard' | 'detailed' | 'executive';
}

// 질문 생성 옵션
export interface QuestionGenerationOptions {
  categories: AIQuestion['category'][];
  maxQuestions: number;
  includeRequired: boolean;
  customContext?: string;
  documentTypes?: DocumentCategory[];
}

// 보고서 생성 옵션
export interface ReportGenerationOptions {
  format: 'html' | 'pdf' | 'markdown' | 'json';
  sections: string[];
  includeCharts: boolean;
  includeAppendix: boolean;
  customTemplate?: string;
}