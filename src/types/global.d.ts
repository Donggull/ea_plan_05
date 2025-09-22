// Global type definitions for the application

declare global {
  interface Window {
    __supabaseAuthListenerSet?: boolean
    __sessionRefreshTimer?: NodeJS.Timeout | null
    __sessionFocusHandler?: (() => void) | null
  }
}

export {}