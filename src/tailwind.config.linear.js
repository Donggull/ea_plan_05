/** @type {import('tailwindcss').Config} */
import { linearTheme } from './src/config/linear-theme.config';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Linear는 다크 테마가 기본
  theme: {
    extend: {
      // Linear 컬러 시스템
      colors: {
        // Primary colors
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#4ea7fc', // Main Linear blue
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e'
        },
        
        // Background colors
        'linear-bg': {
          primary: '#080910',    // Main background
          secondary: '#101113',  // Card background
          tertiary: '#202124',   // Elevated elements
          elevated: '#2a2d30',   // Hover states
        },
        
        // Text colors
        'linear-text': {
          primary: '#f7f8f8',    // Main text
          secondary: '#d0d6e0',  // Secondary text
          tertiary: '#8a8f98',   // Muted text
          muted: '#636871',      // Disabled text
          disabled: '#4a4e57',   // Very muted
        },
        
        // Border colors
        'linear-border': {
          DEFAULT: '#2a2d30',    // Default border
          secondary: '#1f2124',  // Subtle border
          focus: '#4ea7fc',      // Focus state
        },
        
        // Accent colors
        'linear-accent': {
          blue: '#4ea7fc',
          red: '#eb5757',
          green: '#4cb782',
          orange: '#fc7840',
          yellow: '#f2c94c',
          indigo: '#5e6ad2',
        },
        
        // Semantic colors
        success: '#4cb782',
        warning: '#fc7840',
        error: '#eb5757',
        info: '#4ea7fc',
      },
      
      // Typography
      fontFamily: {
        sans: [
          '"Inter Variable"',
          '"SF Pro Display"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif'
        ],
        mono: [
          '"Berkeley Mono"',
          'ui-monospace',
          '"SF Mono"',
          'Menlo',
          'monospace'
        ],
      },
      
      fontSize: {
        'linear-micro': '0.6875rem',   // 11px
        'linear-tiny': '0.625rem',     // 10px
        'linear-mini': '0.75rem',      // 12px
        'linear-small': '0.8125rem',   // 13px
        'linear-base': '0.9375rem',    // 15px - Base
        'linear-large': '1.125rem',    // 18px
        'linear-title-1': '1.0625rem', // 17px
        'linear-title-2': '1.3125rem', // 21px
        'linear-title-3': '1.5rem',    // 24px
        'linear-title-4': '2rem',      // 32px
        'linear-title-5': '2.5rem',    // 40px
      },
      
      fontWeight: {
        'linear-light': '300',
        'linear-normal': '400',
        'linear-medium': '510',
        'linear-semibold': '590',
        'linear-bold': '680',
      },
      
      // Spacing
      spacing: {
        'linear-xs': '4px',
        'linear-sm': '8px',
        'linear-md': '16px',
        'linear-lg': '24px',
        'linear-xl': '32px',
        'linear-2xl': '48px',
        'linear-3xl': '64px',
      },
      
      // Border Radius
      borderRadius: {
        'linear-sm': '4px',
        'linear-md': '6px',
        'linear-lg': '8px',
        'linear-xl': '12px',
        'linear-2xl': '16px',
      },
      
      // Box Shadow
      boxShadow: {
        'linear-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'linear-md': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        'linear-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        'linear-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        'linear-glow': '0 0 20px rgba(78, 167, 252, 0.2)',
        'linear-focus': '0 0 0 2px rgba(78, 167, 252, 0.2)',
      },
      
      // Animation
      animation: {
        'linear-fade-in': 'linearFadeIn 0.25s ease-out',
        'linear-slide-in': 'linearSlideIn 0.25s ease-out',
        'linear-scale-in': 'linearScaleIn 0.1s ease-out',
        'linear-spin': 'linearSpin 0.6s linear infinite',
        'linear-pulse': 'linearPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      
      keyframes: {
        linearFadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        linearSlideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        linearScaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        linearSpin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        linearPulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      
      // Backdrop filters
      backdropBlur: {
        'linear': '20px',
      },
      
      // Custom utilities
      transitionDuration: {
        'linear-fast': '100ms',
        'linear-normal': '250ms',
        'linear-slow': '500ms',
      },
      
      transitionTimingFunction: {
        'linear-ease': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },
    },
  },
  plugins: [
    // Custom plugin for Linear-specific utilities
    function({ addUtilities, theme }) {
      const newUtilities = {
        // Glass morphism effect
        '.linear-glass': {
          backgroundColor: 'rgba(16, 17, 19, 0.8)',
          backdropFilter: 'blur(20px)',
          borderColor: theme('colors.linear-border.DEFAULT'),
        },
        
        // Card hover effect
        '.linear-card-hover': {
          transition: 'all 0.25s ease-out',
          '&:hover': {
            backgroundColor: theme('colors.linear-bg.tertiary'),
            borderColor: 'rgba(78, 167, 252, 0.2)',
            transform: 'translateY(-2px)',
            boxShadow: theme('boxShadow.linear-lg'),
          },
        },
        
        // Button press effect
        '.linear-button-press': {
          transition: 'all 0.1s ease-out',
          '&:active': {
            transform: 'scale(0.98)',
          },
        },
        
        // Focus ring
        '.linear-focus': {
          '&:focus': {
            outline: 'none',
            borderColor: theme('colors.linear-accent.blue'),
            boxShadow: theme('boxShadow.linear-focus'),
          },
        },
        
        // Text gradient
        '.linear-gradient-text': {
          background: `linear-gradient(135deg, ${theme('colors.linear-accent.blue')}, ${theme('colors.linear-accent.indigo')})`,
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          backgroundClip: 'text',
        },
        
        // Scrollbar styling
        '.linear-scrollbar': {
          '&::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: theme('colors.linear-bg.secondary'),
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: theme('colors.linear-border.DEFAULT'),
            borderRadius: '4px',
            '&:hover': {
              backgroundColor: theme('colors.linear-border.secondary'),
            },
          },
        },
      };
      
      addUtilities(newUtilities);
    },
  ],
};