// Context7 MCP를 통해 확인한 최신 AI 모델 데이터 (2025-09-22 업데이트)
// 이 파일은 외부 API를 통해 확인한 최신 모델 정보를 포함합니다.

export interface LatestModelInfo {
  id: string
  name: string
  provider: 'openai' | 'anthropic' | 'google' | 'custom'
  model_id: string
  status: 'active' | 'inactive' | 'maintenance'
  api_endpoint?: string
  max_tokens: number
  cost_per_input_token: number
  cost_per_output_token: number
  capabilities: string[]
  characteristics: {
    speed: 'fast' | 'medium' | 'slow'
    cost: 'low' | 'medium' | 'high'
    performance: 'basic' | 'good' | 'excellent'
  }
  rate_limits: {
    requests_per_minute: number
    tokens_per_minute: number
  }
  metadata?: Record<string, any>
}

// OpenAI 최신 모델들 (2025-09-22 기준)
export const openaiLatestModels: LatestModelInfo[] = [
  {
    id: 'openai-gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    model_id: 'gpt-4o',
    status: 'active',
    max_tokens: 128000,
    cost_per_input_token: 2.5 / 1000000,  // $2.50 per 1M tokens
    cost_per_output_token: 10 / 1000000,  // $10.00 per 1M tokens
    capabilities: ['text', 'vision', 'function_calling', 'json_mode'],
    characteristics: {
      speed: 'fast',
      cost: 'medium',
      performance: 'excellent'
    },
    rate_limits: {
      requests_per_minute: 10000,
      tokens_per_minute: 2000000
    },
    metadata: {
      description: 'Latest multimodal flagship model',
      release_date: '2024-05-13',
      vision_capable: true,
      function_calling: true
    }
  },
  {
    id: 'openai-gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    model_id: 'gpt-4o-mini',
    status: 'active',
    max_tokens: 128000,
    cost_per_input_token: 0.15 / 1000000,  // $0.15 per 1M tokens
    cost_per_output_token: 0.6 / 1000000,  // $0.60 per 1M tokens
    capabilities: ['text', 'vision', 'function_calling', 'json_mode'],
    characteristics: {
      speed: 'fast',
      cost: 'low',
      performance: 'good'
    },
    rate_limits: {
      requests_per_minute: 10000,
      tokens_per_minute: 2000000
    },
    metadata: {
      description: 'Fast and cost-effective model with vision capabilities',
      release_date: '2024-07-18',
      vision_capable: true,
      function_calling: true
    }
  },
  {
    id: 'openai-gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    model_id: 'gpt-4-turbo',
    status: 'active',
    max_tokens: 128000,
    cost_per_input_token: 10 / 1000000,   // $10.00 per 1M tokens
    cost_per_output_token: 30 / 1000000,  // $30.00 per 1M tokens
    capabilities: ['text', 'vision', 'function_calling', 'json_mode'],
    characteristics: {
      speed: 'medium',
      cost: 'high',
      performance: 'excellent'
    },
    rate_limits: {
      requests_per_minute: 10000,
      tokens_per_minute: 2000000
    },
    metadata: {
      description: 'Previous generation flagship model',
      vision_capable: true,
      function_calling: true
    }
  },
  {
    id: 'openai-gpt-3-5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    model_id: 'gpt-3.5-turbo',
    status: 'active',
    max_tokens: 16385,
    cost_per_input_token: 0.5 / 1000000,   // $0.50 per 1M tokens
    cost_per_output_token: 1.5 / 1000000,  // $1.50 per 1M tokens
    capabilities: ['text', 'function_calling', 'json_mode'],
    characteristics: {
      speed: 'fast',
      cost: 'low',
      performance: 'good'
    },
    rate_limits: {
      requests_per_minute: 10000,
      tokens_per_minute: 2000000
    },
    metadata: {
      description: 'Fast and affordable legacy model',
      function_calling: true
    }
  }
]

// Anthropic Claude 최신 모델들 (2025-09-22 기준)
export const anthropicLatestModels: LatestModelInfo[] = [
  {
    id: 'anthropic-claude-opus-4',
    name: 'Claude Opus 4',
    provider: 'anthropic',
    model_id: 'claude-opus-4',
    status: 'active',
    max_tokens: 200000,
    cost_per_input_token: 15 / 1000000,   // $15 per 1M tokens
    cost_per_output_token: 75 / 1000000,  // $75 per 1M tokens
    capabilities: ['text', 'vision', 'function_calling', 'analysis', 'reasoning'],
    characteristics: {
      speed: 'slow',
      cost: 'high',
      performance: 'excellent'
    },
    rate_limits: {
      requests_per_minute: 4000,
      tokens_per_minute: 800000
    },
    metadata: {
      description: 'Most powerful Claude model for complex reasoning',
      release_date: '2024-12-01',
      vision_capable: true,
      function_calling: true,
      reasoning_capability: 'excellent'
    }
  },
  {
    id: 'anthropic-claude-sonnet-4',
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
    model_id: 'claude-sonnet-4',
    status: 'active',
    max_tokens: 200000,
    cost_per_input_token: 3 / 1000000,    // $3 per 1M tokens
    cost_per_output_token: 15 / 1000000,  // $15 per 1M tokens
    capabilities: ['text', 'vision', 'function_calling', 'analysis', 'coding'],
    characteristics: {
      speed: 'medium',
      cost: 'medium',
      performance: 'excellent'
    },
    rate_limits: {
      requests_per_minute: 4000,
      tokens_per_minute: 800000
    },
    metadata: {
      description: 'Balanced performance and cost for most use cases',
      release_date: '2024-12-01',
      vision_capable: true,
      function_calling: true,
      coding_capability: 'excellent'
    }
  },
  {
    id: 'anthropic-claude-sonnet-3-7',
    name: 'Claude Sonnet 3.7',
    provider: 'anthropic',
    model_id: 'claude-sonnet-3.7',
    status: 'active',
    max_tokens: 200000,
    cost_per_input_token: 3 / 1000000,    // $3 per 1M tokens
    cost_per_output_token: 15 / 1000000,  // $15 per 1M tokens
    capabilities: ['text', 'vision', 'function_calling', 'analysis', 'coding'],
    characteristics: {
      speed: 'medium',
      cost: 'medium',
      performance: 'excellent'
    },
    rate_limits: {
      requests_per_minute: 4000,
      tokens_per_minute: 800000
    },
    metadata: {
      description: 'Enhanced Sonnet 3.5 with improved capabilities',
      vision_capable: true,
      function_calling: true,
      coding_capability: 'excellent'
    }
  },
  {
    id: 'anthropic-claude-sonnet-3-5',
    name: 'Claude Sonnet 3.5',
    provider: 'anthropic',
    model_id: 'claude-sonnet-3.5',
    status: 'active',
    max_tokens: 200000,
    cost_per_input_token: 3 / 1000000,    // $3 per 1M tokens
    cost_per_output_token: 15 / 1000000,  // $15 per 1M tokens
    capabilities: ['text', 'vision', 'function_calling', 'analysis', 'coding'],
    characteristics: {
      speed: 'medium',
      cost: 'medium',
      performance: 'excellent'
    },
    rate_limits: {
      requests_per_minute: 4000,
      tokens_per_minute: 800000
    },
    metadata: {
      description: 'Popular balanced model for coding and analysis',
      vision_capable: true,
      function_calling: true,
      coding_capability: 'excellent'
    }
  },
  {
    id: 'anthropic-claude-haiku-3-5',
    name: 'Claude Haiku 3.5',
    provider: 'anthropic',
    model_id: 'claude-haiku-3.5',
    status: 'active',
    max_tokens: 200000,
    cost_per_input_token: 0.8 / 1000000,  // $0.80 per 1M tokens
    cost_per_output_token: 4 / 1000000,   // $4 per 1M tokens
    capabilities: ['text', 'vision', 'function_calling', 'fast_processing'],
    characteristics: {
      speed: 'fast',
      cost: 'low',
      performance: 'good'
    },
    rate_limits: {
      requests_per_minute: 4000,
      tokens_per_minute: 800000
    },
    metadata: {
      description: 'Fast and cost-effective model for quick tasks',
      vision_capable: true,
      function_calling: true,
      speed_optimized: true
    }
  },
  {
    id: 'anthropic-claude-haiku-3',
    name: 'Claude Haiku 3',
    provider: 'anthropic',
    model_id: 'claude-haiku-3',
    status: 'active',
    max_tokens: 200000,
    cost_per_input_token: 0.25 / 1000000, // $0.25 per 1M tokens
    cost_per_output_token: 1.25 / 1000000, // $1.25 per 1M tokens
    capabilities: ['text', 'fast_processing'],
    characteristics: {
      speed: 'fast',
      cost: 'low',
      performance: 'basic'
    },
    rate_limits: {
      requests_per_minute: 4000,
      tokens_per_minute: 800000
    },
    metadata: {
      description: 'Most affordable Claude model for simple tasks',
      speed_optimized: true
    }
  }
]

// Google Gemini 최신 모델들 (2025-09-22 기준)
export const googleLatestModels: LatestModelInfo[] = [
  {
    id: 'google-gemini-2-0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    model_id: 'gemini-2.0-flash',
    status: 'active',
    max_tokens: 1000000,
    cost_per_input_token: 0.075 / 1000000, // Estimated based on Google's pricing
    cost_per_output_token: 0.3 / 1000000,  // Estimated based on Google's pricing
    capabilities: ['text', 'vision', 'audio', 'video', 'multimodal', 'function_calling'],
    characteristics: {
      speed: 'fast',
      cost: 'low',
      performance: 'excellent'
    },
    rate_limits: {
      requests_per_minute: 2000,
      tokens_per_minute: 4000000
    },
    metadata: {
      description: 'Latest multimodal model with superior speed and 1M token context',
      release_date: '2024-12-11',
      vision_capable: true,
      audio_capable: true,
      video_capable: true,
      function_calling: true,
      context_window: 1000000
    }
  },
  {
    id: 'google-gemini-2-5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'google',
    model_id: 'gemini-2.5-pro',
    status: 'active',
    max_tokens: 2000000,
    cost_per_input_token: 1.25 / 1000000,  // Estimated based on Google's pricing
    cost_per_output_token: 5 / 1000000,    // Estimated based on Google's pricing
    capabilities: ['text', 'vision', 'audio', 'video', 'multimodal', 'function_calling', 'thinking', 'reasoning'],
    characteristics: {
      speed: 'medium',
      cost: 'medium',
      performance: 'excellent'
    },
    rate_limits: {
      requests_per_minute: 2000,
      tokens_per_minute: 4000000
    },
    metadata: {
      description: 'Advanced Pro model with thinking capabilities and 2M token context',
      release_date: '2024-12-11',
      vision_capable: true,
      audio_capable: true,
      video_capable: true,
      function_calling: true,
      thinking_mode: true,
      context_window: 2000000
    }
  },
  {
    id: 'google-gemini-1-5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'google',
    model_id: 'gemini-1.5-pro',
    status: 'active',
    max_tokens: 2000000,
    cost_per_input_token: 1.25 / 1000000,  // Estimated based on Google's pricing
    cost_per_output_token: 5 / 1000000,    // Estimated based on Google's pricing
    capabilities: ['text', 'vision', 'audio', 'video', 'multimodal', 'function_calling'],
    characteristics: {
      speed: 'medium',
      cost: 'medium',
      performance: 'excellent'
    },
    rate_limits: {
      requests_per_minute: 2000,
      tokens_per_minute: 4000000
    },
    metadata: {
      description: 'Stable Pro model with large context window',
      vision_capable: true,
      audio_capable: true,
      video_capable: true,
      function_calling: true,
      context_window: 2000000
    }
  },
  {
    id: 'google-gemini-1-5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'google',
    model_id: 'gemini-1.5-flash',
    status: 'active',
    max_tokens: 1000000,
    cost_per_input_token: 0.075 / 1000000, // Estimated based on Google's pricing
    cost_per_output_token: 0.3 / 1000000,  // Estimated based on Google's pricing
    capabilities: ['text', 'vision', 'audio', 'multimodal', 'function_calling'],
    characteristics: {
      speed: 'fast',
      cost: 'low',
      performance: 'good'
    },
    rate_limits: {
      requests_per_minute: 2000,
      tokens_per_minute: 4000000
    },
    metadata: {
      description: 'Fast and efficient model for most use cases',
      vision_capable: true,
      audio_capable: true,
      function_calling: true,
      context_window: 1000000
    }
  }
]

// 모든 최신 모델 통합
export const allLatestModels: LatestModelInfo[] = [
  ...openaiLatestModels,
  ...anthropicLatestModels,
  ...googleLatestModels
]

// 프로바이더별 모델 필터링 함수
export const getModelsByProvider = (provider: 'openai' | 'anthropic' | 'google'): LatestModelInfo[] => {
  return allLatestModels.filter(model => model.provider === provider)
}

// 특성별 모델 필터링 함수
export const getModelsByCharacteristic = (
  characteristic: 'speed' | 'cost' | 'performance',
  value: string
): LatestModelInfo[] => {
  return allLatestModels.filter(model => model.characteristics[characteristic] === value)
}

// 기능별 모델 필터링 함수
export const getModelsByCapability = (capability: string): LatestModelInfo[] => {
  return allLatestModels.filter(model => model.capabilities.includes(capability))
}

// 추천 모델 가져오기 함수
export const getRecommendedModels = (): {
  fastest: LatestModelInfo
  cheapest: LatestModelInfo
  best_performance: LatestModelInfo
  balanced: LatestModelInfo
} => {
  return {
    fastest: allLatestModels.find(m => m.id === 'google-gemini-2-0-flash') || allLatestModels[0],
    cheapest: allLatestModels.find(m => m.id === 'anthropic-claude-haiku-3') || allLatestModels[0],
    best_performance: allLatestModels.find(m => m.id === 'anthropic-claude-opus-4') || allLatestModels[0],
    balanced: allLatestModels.find(m => m.id === 'anthropic-claude-sonnet-4') || allLatestModels[0]
  }
}