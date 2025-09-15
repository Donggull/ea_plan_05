/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_OPENAI_API_KEY?: string
  readonly VITE_ANTHROPIC_API_KEY?: string
  readonly VITE_GOOGLE_AI_API_KEY?: string
  readonly VITE_MCP_SERVER_FILESYSTEM_ENABLED?: string
  readonly VITE_MCP_SERVER_DATABASE_ENABLED?: string
  readonly VITE_MCP_SERVER_WEBSEARCH_ENABLED?: string
  readonly VITE_APP_ENV?: string
  readonly VITE_APP_VERSION?: string
  readonly VITE_FEATURE_AI_ANALYSIS?: string
  readonly VITE_FEATURE_MCP_TOOLS?: string
  readonly VITE_FEATURE_REALTIME_COLLABORATION?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}