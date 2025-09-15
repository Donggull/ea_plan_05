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

export const Button = {
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

export const Card = ({ children, className = '', hoverable = false }: CardProps) => (
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

export const Input = ({ value, onChange, placeholder, type = 'text', error }: InputProps) => (
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

export const Badge = ({ children, variant = 'default' }: BadgeProps) => (
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

export const ProgressBar = ({ 
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

export const Spinner = () => (
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

export const Tooltip = ({ children, content, position = 'top' }: TooltipProps) => (
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

export const Divider = () => (
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

export const Avatar = ({ src, name, size = 'md' }: AvatarProps) => {
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
// Export all components
// ============================================

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
};