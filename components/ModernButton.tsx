'use client';

import React from 'react';

interface ModernButtonProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  variant?: 'primary' | 'success' | 'danger' | 'warning' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  icon?: React.ReactNode;
}

export function ModernButton({
  children,
  onClick,
  type = 'button',
  disabled = false,
  variant = 'primary',
  size = 'md',
  className = '',
  style,
  title,
  icon,
}: ModernButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={style}
      className={`modern-btn modern-btn-${variant} modern-btn-${size} ${className}`}
    >
      <svg viewBox="0 0 24 24" className="modern-arr-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z" />
      </svg>
      <span className="modern-btn-text">
        {icon && <span className="modern-btn-icon">{icon}</span>}
        {children}
      </span>
      <span className="modern-btn-circle" />
      <svg viewBox="0 0 24 24" className="modern-arr-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z" />
      </svg>
    </button>
  );
}
