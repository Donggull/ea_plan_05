import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { Badge } from '@/components/ui/Badge';
import {
  FileText,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Clock,
  FileCheck
} from 'lucide-react';

/**
 * 문서별 개별 분석 진행 상황 표시 컴포넌트
 */

export interface DocumentAnalysisItem {
  documentId: string;
  documentName: string;
  status: 'pending' | 'analyzing' | 'completed' | 'error';
  progress: number;
  startTime?: Date;
  endTime?: Date;
  error?: string;
  summary?: string;
}

interface DocumentAnalysisProgressProps {
  documents: DocumentAnalysisItem[];
  totalProgress: number;
  currentDocument?: string;
  isAnalyzing: boolean;
}

export const DocumentAnalysisProgress: React.FC<DocumentAnalysisProgressProps> = ({
  documents,
  totalProgress,
  currentDocument,
  isAnalyzing
}) => {
  const getStatusIcon = (status: DocumentAnalysisItem['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-accent-green" />;
      case 'analyzing':
        return <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-semantic-error" />;
      default:
        return <Clock className="w-4 h-4 text-text-tertiary" />;
    }
  };

  const getStatusBadge = (status: DocumentAnalysisItem['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success" size="sm">완료</Badge>;
      case 'analyzing':
        return <Badge variant="primary" size="sm">분석중</Badge>;
      case 'error':
        return <Badge variant="error" size="sm">오류</Badge>;
      default:
        return <Badge variant="default" size="sm">대기</Badge>;
    }
  };

  const completedCount = documents.filter(d => d.status === 'completed').length;
  const analyzingCount = documents.filter(d => d.status === 'analyzing').length;
  const errorCount = documents.filter(d => d.status === 'error').length;

  return (
    <Card className="border-border-primary">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-text-primary">
            <FileCheck className="w-5 h-5" />
            문서별 분석 진행 상황
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">
              {completedCount}/{documents.length} 완료
            </span>
            {isAnalyzing && (
              <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 전체 진행률 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-primary">전체 진행률</span>
            <span className="text-sm text-text-secondary">{Math.round(totalProgress)}%</span>
          </div>
          <Progress value={totalProgress} className="h-2" />
        </div>

        {/* 요약 통계 */}
        <div className="grid grid-cols-3 gap-3 p-3 bg-bg-tertiary/30 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-accent-green">{completedCount}</div>
            <div className="text-xs text-text-secondary">완료</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary-500">{analyzingCount}</div>
            <div className="text-xs text-text-secondary">분석중</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-semantic-error">{errorCount}</div>
            <div className="text-xs text-text-secondary">오류</div>
          </div>
        </div>

        {/* 문서 목록 */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-text-primary mb-3">개별 문서 상태</h4>
          {documents.map((doc) => (
            <div
              key={doc.documentId}
              className={`
                p-3 rounded-lg border transition-all duration-200
                ${doc.status === 'analyzing'
                  ? 'bg-primary-500/5 border-primary-500/20 shadow-sm'
                  : doc.status === 'completed'
                  ? 'bg-accent-green/5 border-accent-green/20'
                  : doc.status === 'error'
                  ? 'bg-semantic-error/5 border-semantic-error/20'
                  : 'bg-bg-secondary border-border-primary'
                }
              `}
            >
              <div className="flex items-start gap-3">
                <FileText className={`
                  w-4 h-4 mt-0.5 flex-shrink-0
                  ${doc.status === 'completed' ? 'text-accent-green' :
                    doc.status === 'analyzing' ? 'text-primary-500' :
                    doc.status === 'error' ? 'text-semantic-error' :
                    'text-text-tertiary'}
                `} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h5 className="text-sm font-medium text-text-primary truncate">
                      {doc.documentName}
                    </h5>
                    {getStatusBadge(doc.status)}
                  </div>

                  {doc.status === 'analyzing' && (
                    <div className="space-y-1">
                      <Progress value={doc.progress} className="h-1" />
                      <p className="text-xs text-text-secondary">
                        분석 중... {Math.round(doc.progress)}%
                      </p>
                    </div>
                  )}

                  {doc.status === 'completed' && doc.summary && (
                    <p className="text-xs text-text-secondary line-clamp-2 mt-1">
                      {doc.summary}
                    </p>
                  )}

                  {doc.status === 'error' && doc.error && (
                    <p className="text-xs text-semantic-error mt-1">
                      오류: {doc.error}
                    </p>
                  )}

                  {doc.endTime && (
                    <p className="text-xs text-text-tertiary mt-1">
                      소요 시간: {Math.round((doc.endTime.getTime() - (doc.startTime?.getTime() || doc.endTime.getTime())) / 1000)}초
                    </p>
                  )}
                </div>

                {getStatusIcon(doc.status)}
              </div>
            </div>
          ))}
        </div>

        {currentDocument && (
          <div className="p-3 bg-primary-500/10 border border-primary-500/20 rounded-lg flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-primary-500 animate-spin flex-shrink-0" />
            <p className="text-sm text-text-primary">
              현재 분석 중: <span className="font-medium">{currentDocument}</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};