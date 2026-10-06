'use client';

import React from 'react';

interface AnimatedCheckboxProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  title?: string;
  className?: string;
}

export function AnimatedCheckbox({
  id,
  checked,
  onChange,
  disabled = false,
  title,
  className = '',
}: AnimatedCheckboxProps) {
  return (
    <label 
      className={`animated-cbx ${disabled ? 'disabled' : ''} ${className}`}
      title={title}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={e => {
          if (!disabled) {
            onChange(e.target.checked);
          }
        }}
        disabled={disabled}
      />
      <div className="flip">
        <div className="front" />
        <div className="back">
          <svg viewBox="0 0 16 14" height="12" width="14" aria-hidden="true">
            <path d="M2 8.5L6 12.5L14 1.5" />
          </svg>
        </div>
      </div>
    </label>
  );
}
