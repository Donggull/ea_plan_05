import { linearTheme } from './src/config/linear-theme.config.ts';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      // Linear Theme Colors
      colors: {
        // Primary color system from Linear Theme
        primary: linearTheme.colors.primary,

        // Background system
        bg: {
          primary: linearTheme.colors.background.primary,
          secondary: linearTheme.colors.background.secondary,
          tertiary: linearTheme.colors.background.tertiary,
          elevated: linearTheme.colors.background.elevated,
        },

        // Text system
        text: {
          primary: linearTheme.colors.text.primary,
          secondary: linearTheme.colors.text.secondary,
          tertiary: linearTheme.colors.text.tertiary,
          muted: linearTheme.colors.text.muted,
          disabled: linearTheme.colors.text.disabled,
        },

        // Border system
        border: {
          primary: linearTheme.colors.border.primary,
          secondary: linearTheme.colors.border.secondary,
          focus: linearTheme.colors.border.focus,
        },

        // Accent colors
        accent: linearTheme.colors.accent,

        // Semantic colors
        success: linearTheme.colors.semantic.success,
        warning: linearTheme.colors.semantic.warning,
        error: linearTheme.colors.semantic.error,
        info: linearTheme.colors.semantic.info,

        // Status colors (for UI components)
        status: {
          success: "var(--status-success)",
          warning: "var(--status-warning)",
          error: "var(--status-error)",
          info: "var(--status-info)",
        },

        // Legacy compatibility (mapped to Linear Theme)
        background: "var(--bg-primary)",
        foreground: "var(--text-primary)",
        card: "var(--bg-secondary)",
        "card-foreground": "var(--text-primary)",
        popover: "var(--bg-secondary)",
        "popover-foreground": "var(--text-primary)",
        secondary: "var(--bg-tertiary)",
        "secondary-foreground": "var(--text-primary)",
        muted: "var(--bg-tertiary)",
        "muted-foreground": "var(--text-muted)",
        destructive: linearTheme.colors.semantic.error,
        "destructive-foreground": linearTheme.colors.text.primary,
        input: "var(--bg-secondary)",
        ring: linearTheme.colors.border.focus,
      },

      // Typography from Linear Theme
      fontFamily: {
        sans: linearTheme.typography.fontFamily.primary.split(',').map(f => f.trim().replace(/"/g, '')),
        serif: linearTheme.typography.fontFamily.serif.split(',').map(f => f.trim().replace(/"/g, '')),
        mono: linearTheme.typography.fontFamily.mono.split(',').map(f => f.trim().replace(/"/g, '')),
      },

      fontSize: linearTheme.typography.fontSize,
      fontWeight: linearTheme.typography.fontWeight,
      lineHeight: linearTheme.typography.lineHeight,
      letterSpacing: linearTheme.typography.letterSpacing,

      // Spacing from Linear Theme
      spacing: linearTheme.spacing,

      // Border radius from Linear Theme
      borderRadius: {
        ...linearTheme.borderRadius,
        // Legacy compatibility
        DEFAULT: linearTheme.borderRadius.md,
        lg: linearTheme.borderRadius.lg,
        md: linearTheme.borderRadius.md,
        sm: linearTheme.borderRadius.sm,
      },

      // Shadows from Linear Theme
      boxShadow: linearTheme.shadows,

      // Animation from Linear Theme
      animation: {
        "fade-in": `fadeIn ${linearTheme.animation.duration.normal} ${linearTheme.animation.easing.easeOut}`,
        "slide-in": `slideIn ${linearTheme.animation.duration.normal} ${linearTheme.animation.easing.easeOut}`,
        "scale-in": `scaleIn ${linearTheme.animation.duration.fast} ${linearTheme.animation.easing.easeOut}`,
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },

      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateX(-10px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },

      // Breakpoints from Linear Theme
      screens: linearTheme.layout.breakpoints,
    },
  },
  plugins: [],
}