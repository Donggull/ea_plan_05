// Linear Theme Configuration for ELUO Project
// Based on Linear.app design system

export const linearTheme = {
  name: "Linear Theme",
  description: "Linear.app 웹사이트의 디자인 시스템을 기반으로 한 다크 테마",
  type: "dark",
  
  colors: {
    primary: {
      50: "#f0f9ff",
      100: "#e0f2fe",
      200: "#bae6fd",
      300: "#7dd3fc",
      400: "#38bdf8",
      500: "#4ea7fc",
      600: "#0284c7",
      700: "#0369a1",
      800: "#075985",
      900: "#0c4a6e"
    },
    
    background: {
      primary: "#080910",    // Main background
      secondary: "#101113",  // Card background
      tertiary: "#202124",   // Elevated elements
      elevated: "#2a2d30"    // Hover states
    },
    
    text: {
      primary: "#f7f8f8",    // Main text
      secondary: "#d0d6e0",  // Secondary text
      tertiary: "#8a8f98",   // Muted text
      muted: "#636871",      // Disabled text
      disabled: "#4a4e57"    // Very muted
    },
    
    border: {
      primary: "#2a2d30",    // Default border
      secondary: "#1f2124",  // Subtle border
      focus: "#4ea7fc"       // Focus state
    },
    
    accent: {
      blue: "#4ea7fc",
      red: "#eb5757",
      green: "#4cb782",
      orange: "#fc7840",
      yellow: "#f2c94c",
      indigo: "#5e6ad2",
      linearPlan: "#68cc58",
      linearBuild: "#d4b144",
      linearSecurity: "#7a7fad"
    },
    
    semantic: {
      success: "#4cb782",
      warning: "#fc7840",
      error: "#eb5757",
      info: "#4ea7fc"
    }
  },
  
  typography: {
    fontFamily: {
      primary: '"Inter Variable", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif',
      serif: '"Tiempos Headline", ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
      mono: '"Berkeley Mono", ui-monospace, "SF Mono", "Menlo", monospace',
      emoji: '"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Segoe UI", "Twemoji Mozilla", "Noto Color Emoji", "Android Emoji"'
    },
    
    fontSize: {
      micro: "0.6875rem",   // 11px
      tiny: "0.625rem",     // 10px
      mini: "0.75rem",      // 12px
      small: "0.8125rem",   // 13px
      regular: "0.9375rem", // 15px - Base
      large: "1.125rem",    // 18px
      title1: "1.0625rem",  // 17px
      title2: "1.3125rem",  // 21px
      title3: "1.5rem",     // 24px
      title4: "2rem",       // 32px
      title5: "2.5rem",     // 40px
      title6: "3rem",       // 48px
      title7: "3.5rem",     // 56px
      title8: "4rem",       // 64px
      title9: "4.5rem"      // 72px
    },
    
    fontWeight: {
      light: "300",
      normal: "400",
      medium: "510",
      semibold: "590",
      bold: "680"
    },
    
    lineHeight: {
      tight: "1.1",
      normal: "1.4",
      relaxed: "1.6"
    },
    
    letterSpacing: {
      tight: "-0.022em",
      normal: "-0.012em",
      wide: "0em"
    }
  },
  
  spacing: {
    0: "0px",
    1: "4px",
    2: "8px",
    3: "12px",
    4: "16px",
    5: "20px",
    6: "24px",
    8: "32px",
    10: "40px",
    12: "48px",
    16: "64px",
    20: "80px",
    24: "96px",
    32: "128px"
  },
  
  borderRadius: {
    none: "0px",
    sm: "4px",
    md: "6px",
    lg: "8px",
    xl: "12px",
    "2xl": "16px",
    "3xl": "24px",
    "4xl": "32px",
    full: "9999px",
    circle: "50%"
  },
  
  shadows: {
    none: "0px 0px 0px transparent",
    sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    md: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
    xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
    inner: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)",
    glow: "0 0 20px rgba(78, 167, 252, 0.2)"
  },
  
  animation: {
    duration: {
      fast: "0.1s",
      normal: "0.25s",
      slow: "0.5s"
    },
    
    easing: {
      linear: "linear",
      easeIn: "cubic-bezier(0.55, 0.085, 0.68, 0.53)",
      easeOut: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      easeInOut: "cubic-bezier(0.645, 0.045, 0.355, 1)"
    }
  },
  
  layout: {
    container: {
      maxWidth: "1024px",
      padding: "24px"
    },
    
    header: {
      height: "64px",
      backdropBlur: "20px"
    },
    
    sidebar: {
      width: "240px",
      collapsedWidth: "64px"
    },
    
    grid: {
      columns: 12
    },
    
    breakpoints: {
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px"
    }
  },
  
  components: {
    button: {
      primary: {
        background: "#4ea7fc",
        color: "#ffffff",
        borderRadius: "8px",
        padding: "12px 24px",
        fontSize: "0.9375rem",
        fontWeight: "510",
        border: "none",
        hover: {
          background: "#38bdf8"
        },
        active: {
          background: "#0284c7",
          transform: "scale(0.98)"
        }
      },
      
      secondary: {
        background: "transparent",
        color: "#8a8f98",
        borderRadius: "8px",
        padding: "12px 24px",
        fontSize: "0.9375rem",
        fontWeight: "400",
        border: "1px solid #2a2d30",
        hover: {
          background: "#101113",
          color: "#d0d6e0"
        }
      },
      
      ghost: {
        background: "transparent",
        color: "#d0d6e0",
        borderRadius: "8px",
        padding: "12px 24px",
        fontSize: "0.9375rem",
        fontWeight: "400",
        border: "none",
        hover: {
          background: "#101113"
        }
      }
    },
    
    card: {
      background: "#101113",
      border: "1px solid #2a2d30",
      borderRadius: "12px",
      padding: "24px",
      shadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
      hover: {
        background: "#202124",
        borderColor: "rgba(78, 167, 252, 0.2)"
      }
    },
    
    input: {
      background: "#101113",
      border: "1px solid #2a2d30",
      borderRadius: "8px",
      padding: "12px 16px",
      fontSize: "0.9375rem",
      color: "#f7f8f8",
      placeholder: "#8a8f98",
      focus: {
        borderColor: "#4ea7fc",
        outline: "2px solid rgba(78, 167, 252, 0.2)",
        outlineOffset: "2px"
      }
    },
    
    navigation: {
      background: "rgba(8, 9, 16, 0.8)",
      backdropFilter: "blur(20px)",
      border: "1px solid #2a2d30",
      height: "64px",
      padding: "0 24px"
    },
    
    badge: {
      default: {
        background: "#202124",
        color: "#d0d6e0"
      },
      primary: {
        background: "rgba(78, 167, 252, 0.1)",
        color: "#4ea7fc"
      },
      success: {
        background: "rgba(76, 183, 130, 0.1)",
        color: "#4cb782"
      },
      warning: {
        background: "rgba(252, 120, 64, 0.1)",
        color: "#fc7840"
      },
      error: {
        background: "rgba(235, 87, 87, 0.1)",
        color: "#eb5757"
      }
    }
  }
};

// Tailwind config generator
export const generateTailwindConfig = () => {
  return {
    darkMode: 'class',
    theme: {
      extend: {
        colors: {
          primary: linearTheme.colors.primary,
          bg: linearTheme.colors.background,
          text: linearTheme.colors.text,
          border: linearTheme.colors.border,
          accent: linearTheme.colors.accent,
          ...linearTheme.colors.semantic
        },
        fontFamily: {
          sans: linearTheme.typography.fontFamily.primary.split(',').map(f => f.trim()),
          mono: linearTheme.typography.fontFamily.mono.split(',').map(f => f.trim())
        },
        fontSize: linearTheme.typography.fontSize,
        fontWeight: linearTheme.typography.fontWeight,
        spacing: linearTheme.spacing,
        borderRadius: linearTheme.borderRadius,
        boxShadow: linearTheme.shadows,
        animation: {
          'fade-in': `fadeIn ${linearTheme.animation.duration.normal} ${linearTheme.animation.easing.easeOut}`,
          'slide-in': `slideIn ${linearTheme.animation.duration.normal} ${linearTheme.animation.easing.easeOut}`,
          'scale-in': `scaleIn ${linearTheme.animation.duration.fast} ${linearTheme.animation.easing.easeOut}`
        }
      }
    }
  };
};

export default linearTheme;