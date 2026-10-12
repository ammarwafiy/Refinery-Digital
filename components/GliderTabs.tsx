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
    const updateGlider = () => {
      if (!containerRef.current) return;
      const activeBtn = containerRef.current.querySelector<HTMLElement>(`[data-tab-id="${activeId}"]`);
      if (activeBtn) {
        setGliderStyle({
          left: activeBtn.offsetLeft,
          width: activeBtn.offsetWidth,
        });

        // Ensure active tab is within visible scroll area if container overflows
        const cLeft = containerRef.current.scrollLeft;
        const cWidth = containerRef.current.clientWidth;
        const bLeft = activeBtn.offsetLeft;
        const bWidth = activeBtn.offsetWidth;
        if (bLeft < cLeft) {
          containerRef.current.scrollTo({ left: bLeft, behavior: 'smooth' });
        } else if (bLeft + bWidth > cLeft + cWidth) {
          containerRef.current.scrollTo({ left: bLeft + bWidth - cWidth, behavior: 'smooth' });
        }
      }
    };

    updateGlider();
    window.addEventListener('resize', updateGlider);
    return () => window.removeEventListener('resize', updateGlider);
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
              padding: size === 'sm' ? '0 8px' : '0 14px',
              gap: size === 'sm' ? '5px' : '6px',
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
