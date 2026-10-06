'use client';

import React, { useRef, useState, useEffect } from 'react';

export interface GliderTabItem {
  id: string;
  label: string;
  badge?: string | number;
}

interface GliderTabsProps {
  items: GliderTabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export default function GliderTabs({
  items,
  activeId,
  onChange,
  className = '',
  size = 'md',
}: GliderTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [gliderStyle, setGliderStyle] = useState<{ left: number; width: number }>({
    left: 0,
    width: 0,
  });

  useEffect(() => {
    if (!containerRef.current) return;
    const activeBtn = containerRef.current.querySelector<HTMLElement>(`[data-tab-id="${activeId}"]`);
    if (activeBtn) {
      setGliderStyle({
        left: activeBtn.offsetLeft,
        width: activeBtn.offsetWidth,
      });
    }
  }, [activeId, items]);

  return (
    <div
      ref={containerRef}
      className={`glider-tabs-container ${className}`}
      role="tablist"
      style={{ minHeight: size === 'sm' ? '30px' : '36px' }}
    >
      {items.map((item) => {
        const isActive = activeId === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            data-tab-id={item.id}
            onClick={() => onChange(item.id)}
            className={`glider-tab-btn ${isActive ? 'active' : ''}`}
            style={{
              height: size === 'sm' ? '26px' : '32px',
              fontSize: size === 'sm' ? '11px' : '12px',
              padding: size === 'sm' ? '0 10px' : '0 14px',
            }}
          >
            <span>{item.label}</span>
            {item.badge !== undefined && item.badge !== null && (
              <span className="glider-tab-badge">{item.badge}</span>
            )}
          </button>
        );
      })}
      <span
        className="glider-pill"
        style={{
          transform: `translateX(${gliderStyle.left}px)`,
          width: `${gliderStyle.width}px`,
          height: size === 'sm' ? '26px' : '32px',
          top: size === 'sm' ? '2px' : '3.5px',
        }}
        aria-hidden="true"
      />
    </div>
  );
}
