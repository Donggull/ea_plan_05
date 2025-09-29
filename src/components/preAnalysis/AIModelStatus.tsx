import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Cpu,
  Target,
  Settings,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  Clock,
  Sparkles
} from 'lucide-react';
import { useAIModel } from '@/contexts/AIModelContext';
import type { AIModel } from '@/contexts/AIModelContext';

interface AIModelStatusProps {
  variant?: 'full' | 'compact';
  onNavigateToSidebar?: () => void;
}

export const AIModelStatus: React.FC<AIModelStatusProps> = ({
  variant = 'full',
  onNavigateToSidebar
}) => {
  const {
    state: {
      selectedProviderId,
      selectedModelId,
      availableModels,
      loading,
      error
    },
    getRecommendedModels
  } = useAIModel();

  const selectedModel = selectedModelId
    ? availableModels.find(m => m.id === selectedModelId)
    : null;

  const getProviderColor = (provider: AIModel['provider']) => {
    switch (provider) {
      case 'openai': return 'text-green-400';
      case 'anthropic': return 'text-orange-400';
      case 'google': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const getProviderName = (provider: string) => {
    switch (provider) {
      case 'openai': return 'OpenAI';
      case 'anthropic': return 'Anthropic';
      case 'google': return 'Google AI';
      default: return provider;
    }
  };

  const formatCost = (cost: number) => {
    return (cost * 1000000).toFixed(3);
  };

  const isReady = selectedProviderId && selectedModelId && selectedModel;

  if (variant === 'compact') {
    return (
      <Card className="border-border-primary">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Cpu className={`w-5 h-5 ${selectedProviderId ? getProviderColor(selectedProviderId as AIModel['provider']) : 'text-text-tertiary'}`} />
              <div>
                <div className="text-sm font-medium text-text-primary">
                  {isReady ? getProviderName(selectedProviderId!) : 'AI 모델 미선택'}
                </div>
                <div className="text-xs text-text-secondary">
                  {selectedModel?.name || '사이드바에서 모델을 선택하세요'}
                </div>
              </div>
            </div>

            {isReady ? (
              <CheckCircle2 className="w-5 h-5 text-accent-green" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-semantic-warning" />
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-text-primary">
          <Cpu className="w-5 h-5" />
          AI 모델 설정
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 현재 선택된 모델 상태 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-text-primary">선택된 모델</h3>
            {isReady ? (
              <Badge variant="success" size="sm">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                준비 완료
              </Badge>
            ) : (
              <Badge variant="warning" size="sm">
                <AlertTriangle className="w-3 h-3 mr-1" />
                설정 필요
              </Badge>
            )}
          </div>

          {loading ? (
            <div className="p-6 text-center">
              <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2" />
              <p className="text-sm text-text-secondary">모델 정보 로딩 중...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <AlertTriangle className="w-6 h-6 text-semantic-error mx-auto mb-2" />
              <p className="text-sm text-semantic-error">{error}</p>
            </div>
          ) : isReady ? (
            <div className="p-4 bg-bg-secondary rounded-lg border border-border-secondary">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${getProviderColor(selectedProviderId as AIModel['provider'])} bg-current/10`}>
                    <Target className={`w-5 h-5 ${getProviderColor(selectedProviderId as AIModel['provider'])}`} />
                  </div>
                  <div>
                    <h4 className="font-medium text-text-primary">{selectedModel!.name}</h4>
                    <p className="text-sm text-text-secondary">{getProviderName(selectedProviderId!)}</p>
                  </div>
                </div>

                {(() => {
                  const recommended = getRecommendedModels();
                  const isRecommended =
                    selectedModel!.id === recommended.balanced?.id ||
                    selectedModel!.id === recommended.fastest?.id ||
                    selectedModel!.id === recommended.cheapest?.id ||
                    selectedModel!.id === recommended.best_performance?.id;

                  if (isRecommended) {
                    let type = '';
                    if (selectedModel!.id === recommended.fastest?.id) type = '⚡ 최고속도';
                    else if (selectedModel!.id === recommended.cheapest?.id) type = '💰 최저비용';
                    else if (selectedModel!.id === recommended.best_performance?.id) type = '🏆 최고성능';
                    else if (selectedModel!.id === recommended.balanced?.id) type = '⚖️ 균형';

                    return (
                      <Badge variant="primary" size="sm">
                        <Sparkles className="w-3 h-3 mr-1" />
                        {type}
                      </Badge>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* 모델 정보 */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-text-tertiary" />
                  <span className="text-text-secondary">비용:</span>
                  <span className="text-text-primary">
                    ${formatCost(selectedModel!.cost_per_input_token)}/1M
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-text-tertiary" />
                  <span className="text-text-secondary">토큰:</span>
                  <span className="text-text-primary">
                    {selectedModel!.max_tokens.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* 기능 */}
              {selectedModel!.capabilities && selectedModel!.capabilities.length > 0 && (
                <div className="mt-3">
                  <span className="text-xs text-text-tertiary">기능: </span>
                  <span className="text-xs text-text-secondary">
                    {selectedModel!.capabilities.join(', ')}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center">
              <Cpu className="w-8 h-8 text-text-tertiary mx-auto mb-3" />
              <h3 className="text-sm font-medium text-text-primary mb-2">
                AI 모델을 선택해주세요
              </h3>
              <p className="text-sm text-text-secondary mb-4">
                좌측 사이드바에서 분석에 사용할 AI 제공자와 모델을 선택하세요.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={onNavigateToSidebar}
              >
                <Settings className="w-4 h-4 mr-2" />
                모델 선택하기
              </Button>
            </div>
          )}
        </div>

        {/* 분석 깊이 설정 (선택된 모델이 있을 때만) */}
        {isReady && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-text-primary">분석 설정</h3>
            <div className="text-sm text-text-secondary">
              선택된 모델로 사전 분석을 진행할 준비가 완료되었습니다.
              <br />
              분석 깊이는 분석 시작 시 설정할 수 있습니다.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};