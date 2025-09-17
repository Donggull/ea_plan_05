// Linear Style UI Components for ELUO Project
// All components use the centralized Linear theme

import React from 'react';
import { linearTheme } from '../config/linear-theme.config';

// ============================================
// Button Components
// ============================================

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const Button = {
  Primary: ({ children, onClick, disabled, loading }: ButtonProps) => (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="linear-btn-primary"
      style={{
        backgroundColor: linearTheme.colors.accent.blue,
        color: '#ffffff',
        padding: '12px 24px',
        borderRadius: linearTheme.borderRadius.lg,
        fontSize: linearTheme.typography.fontSize.regular,
        fontWeight: linearTheme.typography.fontWeight.medium,
        transition: `all ${linearTheme.animation.duration.fast}`,
      }}
    >
      {loading ? <Spinner /> : children}
    </button>
  ),
  
  Secondary: ({ children, onClick }: ButtonProps) => (
    <button
      onClick={onClick}
      className="linear-btn-secondary"
      style={{
        backgroundColor: 'transparent',
        color: linearTheme.colors.text.tertiary,
        border: `1px solid ${linearTheme.colors.border.primary}`,
        padding: '12px 24px',
        borderRadius: linearTheme.borderRadius.lg,
        fontSize: linearTheme.typography.fontSize.regular,
        transition: `all ${linearTheme.animation.duration.fast}`,
      }}
    >
      {children}
    </button>
  ),
  
  Ghost: ({ children, onClick }: ButtonProps) => (
    <button
      onClick={onClick}
      className="linear-btn-ghost"
      style={{
        backgroundColor: 'transparent',
        color: linearTheme.colors.text.secondary,
        padding: '12px 24px',
        borderRadius: linearTheme.borderRadius.lg,
        fontSize: linearTheme.typography.fontSize.regular,
        transition: `all ${linearTheme.animation.duration.fast}`,
      }}
    >
      {children}
    </button>
  )
};

// ============================================
// Card Components
// ============================================

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

const Card = ({ children, className = '', hoverable = false }: CardProps) => (
  <div 
    className={`linear-card ${className}`}
    style={{
      backgroundColor: linearTheme.colors.background.secondary,
      border: `1px solid ${linearTheme.colors.border.primary}`,
      borderRadius: linearTheme.borderRadius.xl,
      padding: linearTheme.spacing[6],
      boxShadow: linearTheme.shadows.md,
      transition: hoverable ? `all ${linearTheme.animation.duration.normal}` : undefined,
    }}
  >
    {children}
  </div>
);

// ============================================
// Input Components
// ============================================

interface InputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  error?: string;
}

const Input = ({ value, onChange, placeholder, type = 'text', error }: InputProps) => (
  <div className="linear-input-wrapper">
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="linear-input"
      style={{
        width: '100%',
        backgroundColor: linearTheme.colors.background.secondary,
        border: `1px solid ${error ? linearTheme.colors.semantic.error : linearTheme.colors.border.primary}`,
        borderRadius: linearTheme.borderRadius.lg,
        padding: '12px 16px',
        color: linearTheme.colors.text.primary,
        fontSize: linearTheme.typography.fontSize.regular,
        transition: `all ${linearTheme.animation.duration.fast}`,
      }}
    />
    {error && (
      <span style={{ 
        color: linearTheme.colors.semantic.error, 
        fontSize: linearTheme.typography.fontSize.mini 
      }}>
        {error}
      </span>
    )}
  </div>
);

// ============================================
// Badge Components
// ============================================

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
}

const badgeStyles = {
  default: {
    backgroundColor: linearTheme.colors.background.tertiary,
    color: linearTheme.colors.text.secondary,
  },
  primary: {
    backgroundColor: `${linearTheme.colors.accent.blue}1A`, // 10% opacity
    color: linearTheme.colors.accent.blue,
  },
  success: {
    backgroundColor: `${linearTheme.colors.accent.green}1A`,
    color: linearTheme.colors.accent.green,
  },
  warning: {
    backgroundColor: `${linearTheme.colors.accent.orange}1A`,
    color: linearTheme.colors.accent.orange,
  },
  error: {
    backgroundColor: `${linearTheme.colors.accent.red}1A`,
    color: linearTheme.colors.accent.red,
  },
};

const Badge = ({ children, variant = 'default' }: BadgeProps) => (
  <span 
    className="linear-badge"
    style={{
      ...badgeStyles[variant],
      padding: '4px 8px',
      borderRadius: linearTheme.borderRadius.md,
      fontSize: linearTheme.typography.fontSize.mini,
      fontWeight: linearTheme.typography.fontWeight.medium,
      display: 'inline-flex',
      alignItems: 'center',
    }}
  >
    {children}
  </span>
);

// ============================================
// Progress Bar Component
// ============================================

interface ProgressBarProps {
  value: number;
  max: number;
  color?: string;
  showLabel?: boolean;
}

const ProgressBar = ({ 
  value, 
  max, 
  color = linearTheme.colors.accent.blue,
  showLabel = false 
}: ProgressBarProps) => {
  const percentage = (value / max) * 100;
  
  return (
    <div className="linear-progress">
      <div 
        style={{
          width: '100%',
          height: '4px',
          backgroundColor: linearTheme.colors.background.tertiary,
          borderRadius: linearTheme.borderRadius.full,
          overflow: 'hidden',
        }}
      >
        <div 
          style={{
            width: `${percentage}%`,
            height: '100%',
            backgroundColor: color,
            transition: `width ${linearTheme.animation.duration.normal} ${linearTheme.animation.easing.easeOut}`,
          }}
        />
      </div>
      {showLabel && (
        <span style={{ 
          color: linearTheme.colors.text.tertiary,
          fontSize: linearTheme.typography.fontSize.tiny,
          marginTop: '4px',
        }}>
          {percentage.toFixed(0)}%
        </span>
      )}
    </div>
  );
};

// ============================================
// Spinner Component
// ============================================

const Spinner = () => (
  <div 
    className="linear-spinner"
    style={{
      width: '16px',
      height: '16px',
      border: `2px solid ${linearTheme.colors.border.primary}`,
      borderTopColor: linearTheme.colors.accent.blue,
      borderRadius: linearTheme.borderRadius.circle,
      animation: 'spin 0.6s linear infinite',
    }}
  />
);

// ============================================
// Tooltip Component
// ============================================

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const Tooltip = ({ children, content, position = 'top' }: TooltipProps) => (
  <div className="linear-tooltip-wrapper" style={{ position: 'relative', display: 'inline-block' }}>
    {children}
    <div 
      className={`linear-tooltip linear-tooltip-${position}`}
      style={{
        position: 'absolute',
        backgroundColor: linearTheme.colors.background.elevated,
        color: linearTheme.colors.text.primary,
        padding: '6px 12px',
        borderRadius: linearTheme.borderRadius.md,
        fontSize: linearTheme.typography.fontSize.mini,
        whiteSpace: 'nowrap',
        boxShadow: linearTheme.shadows.lg,
        border: `1px solid ${linearTheme.colors.border.primary}`,
        opacity: 0,
        pointerEvents: 'none',
        transition: `opacity ${linearTheme.animation.duration.fast}`,
      }}
    >
      {content}
    </div>
  </div>
);

// ============================================
// Divider Component
// ============================================

const Divider = () => (
  <hr 
    className="linear-divider"
    style={{
      border: 'none',
      borderTop: `1px solid ${linearTheme.colors.border.primary}`,
      margin: `${linearTheme.spacing[4]} 0`,
    }}
  />
);

// ============================================
// Avatar Component
// ============================================

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

const avatarSizes = {
  sm: '32px',
  md: '40px',
  lg: '48px',
};

const Avatar = ({ src, name, size = 'md' }: AvatarProps) => {
  const initial = name.charAt(0).toUpperCase();
  
  return (
    <div 
      className="linear-avatar"
      style={{
        width: avatarSizes[size],
        height: avatarSizes[size],
        borderRadius: linearTheme.borderRadius.circle,
        backgroundColor: linearTheme.colors.background.tertiary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {src ? (
        <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span style={{ 
          color: linearTheme.colors.text.secondary,
          fontSize: size === 'sm' ? linearTheme.typography.fontSize.mini : linearTheme.typography.fontSize.regular,
          fontWeight: linearTheme.typography.fontWeight.medium,
        }}>
          {initial}
        </span>
      )}
    </div>
  );
};

// ============================================
// Page Layout Components
// ============================================

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

const PageContainer = ({ children, className = '' }: PageContainerProps) => (
  <div
    className={`linear-page-container ${className}`}
    style={{
      minHeight: '100vh',
      backgroundColor: linearTheme.colors.background.primary,
    }}
  >
    {children}
  </div>
);

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  actions?: React.ReactNode;
  showBorder?: boolean;
}

const PageHeader = ({
  title,
  subtitle,
  description,
  actions,
  showBorder = true
}: PageHeaderProps) => (
  <div
    className="linear-page-header"
    style={{
      backgroundColor: linearTheme.colors.background.primary,
      borderBottom: showBorder ? `1px solid ${linearTheme.colors.border.primary}` : 'none',
    }}
  >
    <div style={{
      maxWidth: '1280px',
      margin: '0 auto',
      padding: '24px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ flex: 1 }}>
          <h1 style={{
            fontSize: linearTheme.typography.fontSize.title3,
            fontWeight: linearTheme.typography.fontWeight.semibold,
            color: linearTheme.colors.text.primary,
            margin: 0,
            marginBottom: '4px',
            letterSpacing: linearTheme.typography.letterSpacing.tight,
          }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{
              fontSize: linearTheme.typography.fontSize.regular,
              color: linearTheme.colors.text.secondary,
              margin: 0,
              marginBottom: description ? '4px' : 0,
            }}>
              {subtitle}
            </p>
          )}
          {description && (
            <p style={{
              fontSize: linearTheme.typography.fontSize.small,
              color: linearTheme.colors.text.tertiary,
              margin: 0,
              maxWidth: '512px',
            }}>
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            {actions}
          </div>
        )}
      </div>
    </div>
  </div>
);

interface PageContentProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const maxWidthMap = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
  '7xl': '1280px',
  full: '100%'
};

const paddingMap = {
  none: '0',
  sm: '16px',
  md: '24px',
  lg: '32px'
};

const PageContent = ({
  children,
  className = '',
  maxWidth = '7xl',
  padding = 'md'
}: PageContentProps) => (
  <div
    className={`linear-page-content ${className}`}
    style={{
      maxWidth: maxWidthMap[maxWidth],
      margin: '0 auto',
      padding: paddingMap[padding],
    }}
  >
    {children}
  </div>
);

// ============================================
// Search and Filter Components
// ============================================

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
}

const SearchInput = ({ value, onChange, placeholder = "검색...", icon }: SearchInputProps) => (
  <div style={{
    position: 'relative',
    flex: 1,
  }}>
    {icon && (
      <div style={{
        position: 'absolute',
        left: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        color: linearTheme.colors.text.muted,
        pointerEvents: 'none',
        zIndex: 1,
      }}>
        {icon}
      </div>
    )}
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%',
        paddingLeft: icon ? '40px' : '16px',
        paddingRight: '16px',
        paddingTop: '8px',
        paddingBottom: '8px',
        backgroundColor: linearTheme.colors.background.secondary,
        border: `1px solid ${linearTheme.colors.border.primary}`,
        borderRadius: linearTheme.borderRadius.lg,
        color: linearTheme.colors.text.primary,
        fontSize: linearTheme.typography.fontSize.regular,
        transition: `all ${linearTheme.animation.duration.fast}`,
      }}
    />
  </div>
);

interface FilterButtonProps {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

const FilterButton = ({ active = false, onClick, children, icon }: FilterButtonProps) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      backgroundColor: active ? linearTheme.colors.accent.blue : linearTheme.colors.background.secondary,
      color: active ? '#ffffff' : linearTheme.colors.text.secondary,
      border: `1px solid ${active ? linearTheme.colors.accent.blue : linearTheme.colors.border.primary}`,
      borderRadius: linearTheme.borderRadius.lg,
      fontSize: linearTheme.typography.fontSize.regular,
      transition: `all ${linearTheme.animation.duration.fast}`,
      cursor: 'pointer',
    }}
  >
    {icon}
    {children}
  </button>
);

// ============================================
// View Mode Toggle Component
// ============================================

interface ViewModeToggleProps {
  mode: 'grid' | 'list';
  onChange: (mode: 'grid' | 'list') => void;
  gridIcon?: React.ReactNode;
  listIcon?: React.ReactNode;
}

const ViewModeToggle = ({ mode, onChange, gridIcon, listIcon }: ViewModeToggleProps) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    backgroundColor: linearTheme.colors.background.secondary,
    border: `1px solid ${linearTheme.colors.border.primary}`,
    borderRadius: linearTheme.borderRadius.lg,
    padding: '4px',
  }}>
    <button
      onClick={() => onChange('grid')}
      style={{
        padding: '8px',
        backgroundColor: mode === 'grid' ? linearTheme.colors.accent.blue : 'transparent',
        color: mode === 'grid' ? '#ffffff' : linearTheme.colors.text.muted,
        border: 'none',
        borderRadius: linearTheme.borderRadius.md,
        cursor: 'pointer',
        transition: `all ${linearTheme.animation.duration.fast}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {gridIcon}
    </button>
    <button
      onClick={() => onChange('list')}
      style={{
        padding: '8px',
        backgroundColor: mode === 'list' ? linearTheme.colors.accent.blue : 'transparent',
        color: mode === 'list' ? '#ffffff' : linearTheme.colors.text.muted,
        border: 'none',
        borderRadius: linearTheme.borderRadius.md,
        cursor: 'pointer',
        transition: `all ${linearTheme.animation.duration.fast}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {listIcon}
    </button>
  </div>
);

// ============================================
// Export all components (named exports for tree shaking)
// ============================================

export {
  Button,
  Card,
  Input,
  Badge,
  ProgressBar,
  Spinner,
  Tooltip,
  Divider,
  Avatar,
  PageContainer,
  PageHeader,
  PageContent,
  SearchInput,
  FilterButton,
  ViewModeToggle,
};

// Default export for convenience
export default {
  Button,
  Card,
  Input,
  Badge,
  ProgressBar,
  Spinner,
  Tooltip,
  Divider,
  Avatar,
  PageContainer,
  PageHeader,
  PageContent,
  SearchInput,
  FilterButton,
  ViewModeToggle,
};