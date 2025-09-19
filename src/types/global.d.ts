// Global type definitions for the application

declare global {
  interface Window {
    __supabaseAuthListenerSet?: boolean
    __supabaseAuthListenerUnsubscribe?: (() => void) | null
    __sessionRefreshTimer?: NodeJS.Timeout | null
    __sessionFocusHandler?: (() => void) | null
  }
}

export {}