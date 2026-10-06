'use client';

import React from 'react';

interface ThemeSwitchProps {
  currentTheme: 'dark' | 'light' | 'system';
  onToggle: () => void;
  className?: string;
}

export default function ThemeSwitch({ currentTheme, onToggle, className = '' }: ThemeSwitchProps) {
  const isDark = currentTheme === 'dark';

  return (
    <div className={`theme-switch-container ${className}`}>
      <input
        type="checkbox"
        id="theme-dn-switch"
        className="theme-switch-input"
        checked={isDark}
        onChange={onToggle}
        aria-label="Toggle between Dark and Light mode"
      />
      <label 
        className="theme-switch-toggle" 
        htmlFor="theme-dn-switch"
        title={isDark ? "Tukar ke Mod Siang (Light Mode)" : "Tukar ke Mod Gelap (Dark Mode)"}
      >
        <span className="theme-switch-handler">
          <span className="theme-crater theme-crater--1"></span>
          <span className="theme-crater theme-crater--2"></span>
          <span className="theme-crater theme-crater--3"></span>
        </span>
        <span className="theme-star theme-star--1"></span>
        <span className="theme-star theme-star--2"></span>
        <span className="theme-star theme-star--3"></span>
        <span className="theme-star theme-star--4"></span>
        <span className="theme-star theme-star--5"></span>
        <span className="theme-star theme-star--6"></span>
      </label>
    </div>
  );
}
