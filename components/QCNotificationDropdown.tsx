'use client';

import React, { useEffect, useRef, useState } from 'react';
import { 
  BroadcastMessage, 
  getBroadcastMessages, 
  markAllBroadcastsAsRead, 
  clearBroadcastMessages 
} from '@/lib/broadcast-service';
import { UserRole } from '@/types/refinery';
import { 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  FlaskConical, 
  CheckCheck, 
  Trash2, 
  ExternalLink,
  X
} from 'lucide-react';

interface QCNotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onViewQC?: () => void;
  currentRole?: UserRole;
}

export default function QCNotificationDropdown({
  isOpen,
  onClose,
  onViewQC,
  currentRole = 'operator',
}: QCNotificationDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<BroadcastMessage[]>([]);

  const isQCRole = currentRole === 'qc_analyst' || currentRole === 'qc_manager' || currentRole === 'supervisor' || currentRole === 'admin';

  const refreshMessages = () => {
    setMessages(getBroadcastMessages());
  };

  useEffect(() => {
    if (isOpen) {
      refreshMessages();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleUpdate = () => {
      refreshMessages();
    };
    window.addEventListener('refinery_broadcast_updated', handleUpdate);
    return () => {
      window.removeEventListener('refinery_broadcast_updated', handleUpdate);
    };
  }, []);

  // Click outside listener with safe delay
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 80);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleMarkAllRead = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    markAllBroadcastsAsRead();
    setMessages(prev => prev.map(m => ({ ...m, read: true })));
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    clearBroadcastMessages();
    setMessages([]);
  };

  const unreadCount = messages.filter(m => !m.read).length;

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const hours = Math.floor(diffMins / 60);
      if (hours < 24) return `${hours}h ago`;
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    } catch {
      return '';
    }
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl border border-[#1F2E43] bg-[#0A1018] shadow-2xl z-[99999] overflow-hidden font-sans select-none animate-alert-content-in"
      style={{ boxShadow: '0 20px 40px rgba(0,0,0,0.8), 0 0 1px rgba(255,255,255,0.1)' }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. Header with clear actionable buttons */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#0F1726] border-b border-[#1F2E43]">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-[#009FE3]" />
          <h4 className="text-xs font-bold text-white tracking-tight">
            QC Sample Notifications
          </h4>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-red-500 text-white">
              {unreadCount} new
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Read All Button */}
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="px-2 py-1 rounded text-[10px] font-mono font-medium text-slate-300 hover:text-emerald-300 bg-slate-800/80 hover:bg-emerald-950/40 border border-slate-700/60 hover:border-emerald-500/40 transition-colors flex items-center gap-1 cursor-pointer active:scale-95"
              title="Mark all notifications as read"
            >
              <CheckCheck className="h-3 w-3 text-emerald-400" />
              <span>Read All</span>
            </button>
          )}

          {/* Clear All Button */}
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="px-2 py-1 rounded text-[10px] font-mono font-medium text-slate-400 hover:text-red-300 bg-slate-800/80 hover:bg-red-950/40 border border-slate-700/60 hover:border-red-500/40 transition-colors flex items-center gap-1 cursor-pointer active:scale-95"
              title="Clear all notification history"
            >
              <Trash2 className="h-3 w-3 text-red-400" />
              <span>Clear All</span>
            </button>
          )}

          {/* Close Button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="p-1 rounded text-slate-500 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Notification List */}
      <div className="max-h-80 overflow-y-auto divide-y divide-[#162234] p-1">
        {messages.length === 0 ? (
          <div className="py-10 text-center text-slate-500 font-mono text-xs">
            <FlaskConical className="h-6 w-6 mx-auto mb-2 text-slate-600 opacity-50" />
            <p>No QC notifications yet.</p>
            <p className="text-[10px] text-slate-600 mt-0.5">
              Updates on Accepted or Rejected samples will appear here.
            </p>
          </div>
        ) : (
          messages.map((item) => {
            const isAccept = item.type === 'qc_accept';
            const isReject = item.type === 'qc_reject';
            const isConcession = item.type === 'qc_concession';

            return (
              <div
                key={item.id}
                className={`p-3 rounded-lg transition-colors ${
                  !item.read ? 'bg-[#0E1B2E]/60' : 'hover:bg-[#0E1626]/40'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {/* Status Icon */}
                  <div className="shrink-0 mt-0.5">
                    {isAccept ? (
                      <div className="p-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                    ) : isReject ? (
                      <div className="p-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
                        <AlertCircle className="h-4 w-4" />
                      </div>
                    ) : isConcession ? (
                      <div className="p-1 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30">
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                    ) : (
                      <div className="p-1 rounded-full bg-[#009FE3]/15 text-[#009FE3] border border-[#009FE3]/30">
                        <FlaskConical className="h-4 w-4" />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      {/* Status Badge */}
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                          isAccept
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : isReject
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : isConcession
                            ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {isAccept
                          ? 'ACCEPTED (DITERIMA)'
                          : isReject
                          ? 'REJECTED (DITOLAK)'
                          : isConcession
                          ? 'CONCESSION'
                          : 'AWAITING QC'}
                      </span>

                      <span className="text-[10px] font-mono text-slate-500">
                        {formatTime(item.timestamp)}
                      </span>
                    </div>

                    {/* Lot Number */}
                    {item.lot_no && (
                      <div className="text-[11px] font-mono font-semibold text-slate-200">
                        Lot: <span className="text-white">{item.lot_no}</span>
                      </div>
                    )}

                    {/* Message / Reason */}
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {item.message}
                    </p>

                    {/* Footer info: Chemist name */}
                    <div className="mt-1.5 text-[10px] font-mono text-slate-400">
                      <span>By: {item.sender_name}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 3. Footer: "Open QC Lab" is strictly for QC Roles only (qc_analyst, qc_manager, supervisor, admin) */}
      {isQCRole && onViewQC ? (
        <div className="p-2.5 bg-[#080D15] border-t border-[#1F2E43] flex items-center justify-between text-[11px] font-mono">
          <span className="text-slate-400 text-[10px]">
            QC Chemist Quick Navigation
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
              onViewQC();
            }}
            className="px-2.5 py-1 rounded bg-[#009FE3]/15 hover:bg-[#009FE3]/25 border border-[#009FE3]/40 text-[#009FE3] hover:text-[#00B4FF] flex items-center gap-1.5 font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
            title="Open QC Management Laboratory"
          >
            <span>Open QC Lab</span>
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <div className="px-3 py-2 bg-[#080D15] border-t border-[#1F2E43] flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span>Plant Operator Live Feed</span>
          <span className="text-emerald-500/90 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Real-time Active</span>
          </span>
        </div>
      )}
    </div>
  );
}
