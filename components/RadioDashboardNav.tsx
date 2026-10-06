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
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({
    left: 0,
    width: 0,
  });

  // Calculate sliding indicator position based on active tab
  useEffect(() => {
    if (!containerRef.current) return;
    const activeEl = containerRef.current.querySelector<HTMLElement>(`[data-tab-id="${activeTab}"]`);
    if (activeEl) {
      setIndicatorStyle({
        left: activeEl.offsetLeft,
        width: activeEl.offsetWidth,
      });
    }
  }, [activeTab, items]);

  return (
    <div className={`radio-dashboard-container select-none ${className}`}>
      <div className="radio-dashboard-wrap" ref={containerRef} role="tablist">
        {items.map((item, index) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <React.Fragment key={item.id}>
              <input
                type="radio"
                id={`rd-tab-${item.id}`}
                name="radio-dashboard-nav"
                className={`rd-tab-${index}`}
                checked={isActive}
                onChange={() => onTabChange(item.id)}
                hidden
              />
              <label
                htmlFor={`rd-tab-${item.id}`}
                data-tab-id={item.id}
                role="tab"
                aria-selected={isActive}
                className={`radio-dashboard-label ${isActive ? 'active' : ''}`}
                style={{ '--index': index } as React.CSSProperties}
                onClick={(e) => {
                  e.preventDefault();
                  onTabChange(item.id);
                }}
              >
                {Icon && <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" />}
                <span className="truncate">{item.label}</span>
                {item.badge && (
                  <span className="radio-dashboard-badge">{item.badge}</span>
                )}
              </label>
            </React.Fragment>
          );
        })}

        {/* Sliding Indicator Pill and Accent Bars from Transition/animation/Radio Dashboard */}
        <div
          className="radio-dashboard-bar"
          style={{
            transform: `translateX(${indicatorStyle.left}px)`,
            width: `${indicatorStyle.width}px`,
          }}
          aria-hidden="true"
        />
        <div
          className="radio-dashboard-slidebar"
          style={{
            transform: `translateX(${indicatorStyle.left}px)`,
            width: `${indicatorStyle.width}px`,
          }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
