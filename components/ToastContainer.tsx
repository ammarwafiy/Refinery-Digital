'use client';

import React, { useState, useEffect } from 'react';
import { ToastItem } from '@/lib/broadcast-service';
import { 
  FlaskConical, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Radio, 
  X,
  Bell
} from 'lucide-react';

interface ToastContainerProps {
  onOpenDrawer?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export default function ToastContainer({ onOpenDrawer, onNavigateTab }: ToastContainerProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handleToastEvent = (e: Event) => {
      const customEvent = e as CustomEvent<ToastItem>;
      if (!customEvent.detail) return;
      const newToast = customEvent.detail;

      setToasts(prev => {
        // Keep at most 4 simultaneous toasts
        const filtered = prev.filter(t => t.id !== newToast.id);
        return [newToast, ...filtered].slice(0, 4);
      });

      // Auto dismiss
      const duration = newToast.duration || 5000;
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== newToast.id));
      }, duration);
    };

    window.addEventListener('refinery_toast_event', handleToastEvent);
    return () => {
      window.removeEventListener('refinery_toast_event', handleToastEvent);
    };
  }, []);

  const dismissToast = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div 
      className="fixed top-4 right-4 z-[999999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none select-none font-sans"
      aria-live="polite"
    >
      {toasts.map(toast => {
        const isDispatch = toast.type === 'qc_dispatch';
        const isAccept = toast.type === 'qc_accept';
        const isConcession = toast.type === 'qc_concession';
        const isReject = toast.type === 'qc_reject';
        const isUrgent = toast.type === 'urgent_alert' || isReject;

        const borderClass = isAccept 
          ? 'border-emerald-500/50 shadow-emerald-950/40' 
          : isReject 
          ? 'border-red-500/50 shadow-red-950/40' 
          : isConcession 
          ? 'border-sky-500/50 shadow-sky-950/40' 
          : isDispatch 
          ? 'border-[#009FE3]/50 shadow-cyan-950/40' 
          : 'border-amber-500/50 shadow-amber-950/40';

        const glowBg = isAccept 
          ? 'bg-[#0B1A15]' 
          : isReject 
          ? 'bg-[#1C0D11]' 
          : isConcession 
          ? 'bg-[#0A1624]' 
          : isDispatch 
          ? 'bg-[#071926]' 
          : 'bg-[#18130B]';

        return (
          <div
            key={toast.id}
            onClick={() => {
              if (onOpenDrawer) onOpenDrawer();
            }}
            className={`pointer-events-auto cursor-pointer relative overflow-hidden rounded-xl border ${borderClass} ${glowBg} p-3.5 shadow-2xl backdrop-blur-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.99] animate-alert-content-in`}
          >
            {/* Top Indicator Strip */}
            <div 
              className={`absolute top-0 left-0 bottom-0 w-1 ${
                isAccept ? 'bg-emerald-500' : isReject ? 'bg-red-500' : isConcession ? 'bg-sky-400' : isDispatch ? 'bg-[#009FE3]' : 'bg-amber-400'
              }`}
            />

            <div className="flex items-start gap-3 pl-1.5">
              {/* Type Icon */}
              <div 
                className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                  isAccept 
                    ? 'bg-emerald-500/20 text-emerald-400' 
                    : isReject 
                    ? 'bg-red-500/20 text-red-400' 
                    : isConcession 
                    ? 'bg-sky-500/20 text-sky-400' 
                    : isDispatch 
                    ? 'bg-[#009FE3]/20 text-[#009FE3]' 
                    : 'bg-amber-500/20 text-amber-400'
                }`}
              >
                {isAccept ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : isReject ? (
                  <AlertCircle className="h-4 w-4" />
                ) : isConcession ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : isDispatch ? (
                  <FlaskConical className="h-4 w-4" />
                ) : (
                  <Radio className="h-4 w-4" />
                )}
              </div>

              {/* Text Body */}
              <div className="flex-1 min-w-0 pr-6">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <h4 className="text-xs font-bold text-white tracking-tight truncate">
                    {toast.title}
                  </h4>
                  {toast.lot_no && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-medium bg-black/40 text-slate-300 border border-slate-700">
                      {toast.lot_no}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed font-sans line-clamp-2">
                  {toast.message}
                </p>
                <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-slate-400">
                  <span className="text-[#009FE3]">Click to view details →</span>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={(e) => dismissToast(toast.id, e)}
                className="absolute top-2.5 right-2.5 p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
