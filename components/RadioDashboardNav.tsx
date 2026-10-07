'use client';

import React, { useRef, useState, useEffect } from 'react';
import { LucideIcon } from 'lucide-react';

export interface RadioDashboardNavItem {
  id: string;
  label: string;
  shortLabel?: string;
  icon?: LucideIcon;
  badge?: string;
}

interface RadioDashboardNavProps {
  items: RadioDashboardNavItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export default function RadioDashboardNav({
  items,
  activeTab,
  onTabChange,
  className = '',
}: RadioDashboardNavProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{ top: number; height: number; opacity: number }>({
    top: 0,
    height: 38,
    opacity: 0,
  });

  // Calculate sliding vertical indicator position (atas ke bawah) based on active tab
  useEffect(() => {
    if (!containerRef.current) return;
    const activeEl = containerRef.current.querySelector<HTMLElement>(`[data-tab-id="${activeTab}"]`);
    if (activeEl) {
      setIndicatorStyle({
        top: activeEl.offsetTop,
        height: activeEl.offsetHeight || 38,
        opacity: 1,
      });
    } else {
      setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }));
    }
  }, [activeTab, items]);

  // Recalculate on window resize
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const activeEl = containerRef.current.querySelector<HTMLElement>(`[data-tab-id="${activeTab}"]`);
      if (activeEl) {
        setIndicatorStyle({
          top: activeEl.offsetTop,
          height: activeEl.offsetHeight || 38,
          opacity: 1,
        });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeTab]);

  const handleSelectTab = (itemId: string, el: HTMLElement) => {
    if (el) {
      setIndicatorStyle({
        top: el.offsetTop,
        height: el.offsetHeight || 38,
        opacity: 1,
      });
    }
    onTabChange(itemId);
  };

  return (
    <div className={`radio-vnav-container select-none ${className}`}>
      <div className="radio-vnav-wrap" ref={containerRef} role="tablist" aria-orientation="vertical">
        {items.map((item, index) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <React.Fragment key={item.id}>
              <input
                type="radio"
                id={`rd-vnav-${item.id}`}
                name="radio-dashboard-vnav"
                className={`rd-vnav-${index}`}
                checked={isActive}
                onChange={() => onTabChange(item.id)}
                hidden
              />
              <button
                type="button"
                data-tab-id={item.id}
                role="tab"
                aria-selected={isActive}
                aria-current={isActive ? 'page' : undefined}
                className={`radio-vnav-btn ${isActive ? 'active' : ''}`}
                style={{ '--index': index } as React.CSSProperties}
                onClick={(e) => handleSelectTab(item.id, e.currentTarget)}
              >
                {Icon && (
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-colors ${
                      isActive ? 'text-[var(--red)] opacity-100' : 'opacity-70'
                    }`}
                  />
                )}
                <span className="truncate flex-1">{item.label}</span>
                {item.badge && (
                  <span className="radio-vnav-badge">{item.badge}</span>
                )}
              </button>
            </React.Fragment>
          );
        })}

        {/* Sliding Indicator Pill and Accent Bars from Transition/animation/Radio Dashboard (Vertical: Atas ke Bawah) */}
        <div
          className="radio-vnav-bar"
          style={{
            transform: `translateY(${indicatorStyle.top}px)`,
            height: `${indicatorStyle.height}px`,
            opacity: indicatorStyle.opacity,
          }}
          aria-hidden="true"
        />
        <div
          className="radio-vnav-slidebar"
          style={{
            transform: `translateY(${indicatorStyle.top}px)`,
            height: `${indicatorStyle.height}px`,
            opacity: indicatorStyle.opacity,
          }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
