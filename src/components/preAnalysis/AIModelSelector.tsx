import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Label } from '@/components/ui/Label';
import { Slider } from '@/components/ui/Slider';
import { Bot, Zap, Brain, Settings, CheckCircle2 } from 'lucide-react';
import type { AIProvider, AIModel, AnalysisDepth } from '@/types/preAnalysis';

interface AIModelSelectorProps {
  onSelectionChange: (selection: {
    provider: AIProvider;
    model: string;
    depth: AnalysisDepth;
    temperature: number;
  }) => void;
  disabled?: boolean;
}

export const AIModelSelector: React.FC<AIModelSelectorProps> = ({
  onSelectionChange,
  disabled = false
}) => {
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('openai');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [analysisDepth, setAnalysisDepth] = useState<AnalysisDepth>('standard');
  const [temperature, setTemperature] = useState([0.7]);

  const providers: { id: AIProvider; name: string; icon: React.ReactNode; models: AIModel[] }[] = [
    {
      id: 'openai',
      name: 'OpenAI',
      icon: <Bot className="w-4 h-4" />,
      models: [
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai', capabilities: ['text', 'reasoning'], costPerInputToken: 0.01, costPerOutputToken: 0.03, maxTokens: 128000, description: '가장 강력한 모델', cost: 'high' },
        { id: 'gpt-4', name: 'GPT-4', provider: 'openai', capabilities: ['text', 'reasoning'], costPerInputToken: 0.03, costPerOutputToken: 0.06, maxTokens: 8192, description: '균형잡힌 성능', cost: 'medium' },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai', capabilities: ['text'], costPerInputToken: 0.0015, costPerOutputToken: 0.002, maxTokens: 4096, description: '빠르고 경제적', cost: 'low' }
      ]
    },
    {
      id: 'anthropic',
      name: 'Anthropic',
      icon: <Brain className="w-4 h-4" />,
      models: [
        { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'anthropic', capabilities: ['text', 'reasoning', 'analysis'], costPerInputToken: 0.015, costPerOutputToken: 0.075, maxTokens: 200000, description: '최고 성능 모델', cost: 'high' },
        { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'anthropic', capabilities: ['text', 'reasoning'], costPerInputToken: 0.003, costPerOutputToken: 0.015, maxTokens: 200000, description: '균형잡힌 성능', cost: 'medium' },
        { id: 'claude-3-haiku', name: 'Claude 3 Haiku', provider: 'anthropic', capabilities: ['text'], costPerInputToken: 0.00025, costPerOutputToken: 0.00125, maxTokens: 200000, description: '빠른 응답', cost: 'low' }
      ]
    },
    {
      id: 'google',
      name: 'Google AI',
      icon: <Zap className="w-4 h-4" />,
      models: [
        { id: 'gemini-pro', name: 'Gemini Pro', provider: 'google', capabilities: ['text', 'multimodal'], costPerInputToken: 0.0005, costPerOutputToken: 0.0015, maxTokens: 32000, description: '강력한 멀티모달', cost: 'medium' },
        { id: 'gemini-pro-vision', name: 'Gemini Pro Vision', provider: 'google', capabilities: ['text', 'vision', 'multimodal'], costPerInputToken: 0.0005, costPerOutputToken: 0.0015, maxTokens: 32000, description: '이미지 분석 특화', cost: 'medium' }
      ]
    }
  ];

  const depthOptions: { id: AnalysisDepth; name: string; description: string; duration: string }[] = [
    { id: 'quick', name: 'Quick', description: '빠른 개요 분석', duration: '2-3분' },
    { id: 'standard', name: 'Standard', description: '표준 분석', duration: '5-10분' },
    { id: 'deep', name: 'Deep', description: '심층 분석', duration: '15-20분' },
    { id: 'comprehensive', name: 'Comprehensive', description: '종합 분석', duration: '30-45분' }
  ];

  const currentProvider = providers.find(p => p.id === selectedProvider);
  const currentModel = currentProvider?.models.find(m => m.id === selectedModel);

  useEffect(() => {
    if (currentProvider && !selectedModel) {
      setSelectedModel(currentProvider.models[1]?.id || currentProvider.models[0]?.id);
    }
  }, [selectedProvider, currentProvider, selectedModel]);

  useEffect(() => {
    if (selectedProvider && selectedModel && analysisDepth) {
      onSelectionChange({
        provider: selectedProvider,
        model: selectedModel,
        depth: analysisDepth,
        temperature: temperature[0]
      });
    }
  }, [selectedProvider, selectedModel, analysisDepth, temperature, onSelectionChange]);

  const getCostColor = (cost?: string) => {
    switch (cost) {
      case 'high': return 'text-semantic-warning';
      case 'medium': return 'text-accent-blue';
      case 'low': return 'text-accent-green';
      default: return 'text-text-secondary';
    }
  };

  const getCostBadgeVariant = (cost?: string) => {
    switch (cost) {
      case 'high': return 'warning';
      case 'medium': return 'primary';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-text-primary">
            <Bot className="w-5 h-5" />
            AI 모델 선택
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Provider Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-text-primary">AI 제공업체</Label>
            <div className="grid grid-cols-3 gap-3">
              {providers.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => setSelectedProvider(provider.id)}
                  disabled={disabled}
                  className={`
                    p-3 rounded-lg border transition-all duration-200 text-left
                    ${selectedProvider === provider.id
                      ? 'bg-primary-500/10 border-primary-500 shadow-lg'
                      : 'bg-bg-secondary border-border-primary hover:bg-bg-elevated'
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {provider.icon}
                    <span className="font-medium text-text-primary text-sm">
                      {provider.name}
                    </span>
                    {selectedProvider === provider.id && (
                      <CheckCircle2 className="w-4 h-4 text-primary-500 ml-auto" />
                    )}
                  </div>
                  <p className="text-xs text-text-secondary">
                    {provider.models.length}개 모델 사용 가능
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Model Selection */}
          {currentProvider && (
            <div className="space-y-3">
              <Label className="text-sm font-medium text-text-primary">모델</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel} disabled={disabled}>
                <SelectTrigger className="bg-bg-secondary border-border-primary">
                  <SelectValue placeholder="모델을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {currentProvider.models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex items-center justify-between w-full">
                        <div>
                          <div className="font-medium">{model.name}</div>
                          <div className="text-xs text-text-secondary">{model.description}</div>
                        </div>
                        <Badge variant={getCostBadgeVariant(model.cost)} size="sm">
                          {model.cost}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {currentModel && (
                <div className="p-3 bg-bg-secondary/50 rounded-lg border border-border-secondary">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-text-primary">{currentModel.name}</h4>
                      <p className="text-sm text-text-secondary">{currentModel.description}</p>
                    </div>
                    <Badge variant={getCostBadgeVariant(currentModel.cost)} size="sm">
                      {currentModel.cost} cost
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Analysis Depth */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-text-primary">분석 깊이</Label>
            <div className="grid grid-cols-2 gap-3">
              {depthOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setAnalysisDepth(option.id)}
                  disabled={disabled}
                  className={`
                    p-3 rounded-lg border transition-all duration-200 text-left
                    ${analysisDepth === option.id
                      ? 'bg-accent-blue/10 border-accent-blue shadow-lg'
                      : 'bg-bg-secondary border-border-primary hover:bg-bg-elevated'
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-text-primary text-sm">
                      {option.name}
                    </span>
                    {analysisDepth === option.id && (
                      <CheckCircle2 className="w-4 h-4 text-accent-blue" />
                    )}
                  </div>
                  <p className="text-xs text-text-secondary mb-1">
                    {option.description}
                  </p>
                  <Badge variant="primary" size="sm">
                    {option.duration}
                  </Badge>
                </button>
              ))}
            </div>
          </div>

          {/* Temperature Control */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-text-primary">창의성 (Temperature)</Label>
              <span className="text-sm text-text-secondary">{temperature[0]}</span>
            </div>
            <div className="px-2">
              <Slider
                value={temperature}
                onValueChange={setTemperature}
                min={0}
                max={1}
                step={0.1}
                disabled={disabled}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-text-tertiary mt-1">
                <span>보수적 (0.0)</span>
                <span>창의적 (1.0)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {selectedProvider && selectedModel && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-3">
              <Settings className="w-4 h-4 text-text-secondary" />
              <span className="text-sm font-medium text-text-primary">선택 요약</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">모델:</span>
                <span className="text-text-primary">{currentModel?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">분석 깊이:</span>
                <span className="text-text-primary">
                  {depthOptions.find(d => d.id === analysisDepth)?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">예상 소요시간:</span>
                <span className="text-text-primary">
                  {depthOptions.find(d => d.id === analysisDepth)?.duration}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">비용 예상:</span>
                <span className={getCostColor(currentModel?.cost)}>
                  {currentModel?.cost || 'unknown'} cost
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};