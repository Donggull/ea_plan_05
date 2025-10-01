import React, { useState, useEffect } from 'react';
import { ChevronDown, Info, DollarSign, Clock } from 'lucide-react';
import { AnalysisSettings, AIModelInfo } from '../../types/preAnalysis';

interface AIModelSelectorProps {
  settings: AnalysisSettings;
  onSettingsChange: (settings: AnalysisSettings) => void;
}

export const AIModelSelector: React.FC<AIModelSelectorProps> = ({
  settings,
  onSettingsChange,
}) => {
  const [availableModels, setAvailableModels] = useState<AIModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<AIModelInfo | null>(null);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  // 사용 가능한 AI 모델 목록
  useEffect(() => {
    const models: AIModelInfo[] = [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'openai',
        capabilities: ['텍스트 분석', '구조화된 출력', '추론', '창의적 사고'],
        costPerInputToken: 0.0025,
        costPerOutputToken: 0.01,
        maxTokens: 128000,
        description: '가장 강력하고 균형잡힌 모델로 복잡한 분석에 적합',
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        provider: 'openai',
        capabilities: ['빠른 처리', '비용 효율성', '정확한 분석'],
        costPerInputToken: 0.001,
        costPerOutputToken: 0.003,
        maxTokens: 128000,
        description: '빠르고 경제적이면서도 높은 품질의 분석 제공',
      },
      {
        id: 'claude-3-5-sonnet',
        name: 'Claude 3.5 Sonnet',
        provider: 'anthropic',
        capabilities: ['논리적 추론', '상세한 분석', '안전한 출력'],
        costPerInputToken: 0.003,
        costPerOutputToken: 0.015,
        maxTokens: 200000,
        description: '뛰어난 추론 능력과 상세한 분석으로 유명',
      },
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        provider: 'google',
        capabilities: ['다중 모달', '긴 컨텍스트', '코드 이해'],
        costPerInputToken: 0.00125,
        costPerOutputToken: 0.005,
        maxTokens: 1000000,
        description: '매우 긴 컨텍스트와 다양한 형태의 입력 처리 가능',
      },
    ];

    setAvailableModels(models);

    // 현재 선택된 모델 찾기
    const current = models.find(m => m.id === settings.aiModel);
    setSelectedModel(current || models[0]);
  }, [settings.aiModel]);

  const handleModelChange = (modelId: string) => {
    const model = availableModels.find(m => m.id === modelId);
    if (model) {
      setSelectedModel(model);
      onSettingsChange({
        ...settings,
        aiModel: model.id,
        aiProvider: model.provider,
      });
    }
  };

  const handleDepthChange = (depth: AnalysisSettings['analysisDepth']) => {
    onSettingsChange({
      ...settings,
      analysisDepth: depth,
    });
  };

  const getDepthDescription = (depth: string) => {
    switch (depth) {
      case 'quick':
        return '빠른 개요 분석 (~2분)';
      case 'standard':
        return '표준 분석 (~5분)';
      case 'deep':
        return '심층 분석 (~10분)';
      case 'comprehensive':
        return '종합 분석 (~20분)';
      default:
        return '';
    }
  };

  const estimateCost = () => {
    if (!selectedModel) return 0;

    const depthMultiplier = {
      quick: 1,
      standard: 2.5,
      deep: 5,
      comprehensive: 10,
    };

    const baseTokens = 5000; // 기본 토큰 수 추정
    const multiplier = depthMultiplier[settings.analysisDepth];
    const estimatedTokens = baseTokens * multiplier;

    return (
      (estimatedTokens * selectedModel.costPerInputToken) +
      (estimatedTokens * 0.3 * selectedModel.costPerOutputToken)
    );
  };

  const estimateTime = () => {
    const depthTime = {
      quick: 2,
      standard: 5,
      deep: 10,
      comprehensive: 20,
    };

    return depthTime[settings.analysisDepth];
  };

  return (
    <div className="space-y-6">
      {/* AI 모델 선택 */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          AI 모델 선택
        </label>
        <div className="relative">
          <select
            value={settings.aiModel}
            onChange={(e) => handleModelChange(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
          >
            {availableModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name} - {model.provider}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>

        {/* 선택된 모델 정보 */}
        {selectedModel && (
          <div className="mt-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
            <div className="flex items-start justify-between mb-3">
              <h4 className="font-medium text-white">{selectedModel.name}</h4>
              <div
                className="relative"
                onMouseEnter={() => setShowTooltip('model-info')}
                onMouseLeave={() => setShowTooltip(null)}
              >
                <Info className="w-4 h-4 text-gray-400 cursor-help" />
                {showTooltip === 'model-info' && (
                  <div className="absolute right-0 top-6 w-64 p-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-300 z-10">
                    {selectedModel.description}
                  </div>
                )}
              </div>
            </div>

            <p className="text-sm text-gray-400 mb-3">
              {selectedModel.description}
            </p>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">최대 토큰:</span>
                <span className="text-white ml-2">
                  {selectedModel.maxTokens.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-gray-400">입력 비용:</span>
                <span className="text-white ml-2">
                  ${selectedModel.costPerInputToken}/1K 토큰
                </span>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {selectedModel.capabilities.map((capability) => (
                <span
                  key={capability}
                  className="px-2 py-1 bg-blue-900/30 text-blue-300 rounded text-xs"
                >
                  {capability}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 분석 깊이 선택 */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          분석 깊이
        </label>
        <div className="grid grid-cols-2 gap-3">
          {(['quick', 'standard', 'deep', 'comprehensive'] as const).map((depth) => (
            <button
              key={depth}
              onClick={() => handleDepthChange(depth)}
              className={`
                p-4 rounded-lg border-2 transition-all text-left
                ${settings.analysisDepth === depth
                  ? 'border-blue-500 bg-blue-900/20 text-white'
                  : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600'
                }
              `}
            >
              <div className="font-medium capitalize mb-1">
                {depth === 'quick' && '빠른'}
                {depth === 'standard' && '표준'}
                {depth === 'deep' && '심층'}
                {depth === 'comprehensive' && '종합'}
              </div>
              <div className="text-sm opacity-80">
                {getDepthDescription(depth)}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 예상 비용 및 시간 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <DollarSign className="w-4 h-4" />
            예상 비용
          </div>
          <div className="text-lg font-semibold text-white">
            ${estimateCost().toFixed(3)}
          </div>
        </div>

        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <Clock className="w-4 h-4" />
            예상 시간
          </div>
          <div className="text-lg font-semibold text-white">
            ~{estimateTime()}분
          </div>
        </div>
      </div>

      {/* 고급 설정 */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          사용자 정의 지시사항 (선택사항)
        </label>
        <textarea
          value={settings.customInstructions || ''}
          onChange={(e) => onSettingsChange({
            ...settings,
            customInstructions: e.target.value,
          })}
          placeholder="특별한 분석 요구사항이 있다면 입력해주세요..."
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows={3}
        />
      </div>

      {/* 출력 형식 */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          출력 형식
        </label>
        <div className="flex gap-3">
          {(['standard', 'detailed', 'executive'] as const).map((format) => (
            <button
              key={format}
              onClick={() => onSettingsChange({
                ...settings,
                outputFormat: format,
              })}
              className={`
                px-4 py-2 rounded-lg border transition-colors
                ${settings.outputFormat === format
                  ? 'border-blue-500 bg-blue-900/20 text-blue-300'
                  : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                }
              `}
            >
              {format === 'standard' && '표준'}
              {format === 'detailed' && '상세'}
              {format === 'executive' && '경영진용'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};