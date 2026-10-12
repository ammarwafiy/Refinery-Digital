'use client';

import React, { useState, useEffect } from 'react';
import { 
  BroadcastMessage, 
  getBroadcastMessages, 
  sendBroadcastMessage, 
  markBroadcastAsRead, 
  markAllBroadcastsAsRead, 
  clearBroadcastMessages 
} from '@/lib/broadcast-service';
import { Profile } from '@/types/refinery';
import { 
  Radio, 
  FlaskConical, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Send, 
  X, 
  CheckCheck, 
  Trash2, 
  Filter, 
  Clock, 
  ArrowRight,
  MessageSquare
} from 'lucide-react';

interface LiveBroadcastDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: Profile | null;
  onNavigateToQC?: () => void;
}

export default function LiveBroadcastDrawer({
  isOpen,
  onClose,
  currentUser,
  onNavigateToQC,
}: LiveBroadcastDrawerProps) {
  const [messages, setMessages] = useState<BroadcastMessage[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'qc' | 'broadcast'>('all');
  const [customText, setCustomText] = useState('');
  const [isSending, setIsSending] = useState(false);

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

  if (!isOpen) return null;

  const handleSendBroadcast = (textToSend?: string) => {
    const text = (textToSend || customText).trim();
    if (!text) return;

    setIsSending(true);
    const role = currentUser?.role || 'operator';
    const isQC = role === 'qc_analyst' || role === 'qc_manager';

    sendBroadcastMessage({
      type: isQC ? 'qc_broadcast' : 'operator_broadcast',
      title: isQC ? 'QC Chemist Broadcast' : 'Operator Broadcast',
      message: text,
      sender_id: currentUser?.id || 'OPR001',
      sender_name: currentUser?.full_name || 'Plant Operator',
      sender_role: isQC ? 'QC Chemist' : 'Plant Operator',
      showToastNotification: true,
    });

    setCustomText('');
    setIsSending(false);
    refreshMessages();
  };

  const handleMarkAllRead = () => {
    markAllBroadcastsAsRead();
    refreshMessages();
  };

  const handleClearAll = () => {
    if (confirm('Clear all broadcast feed history?')) {
      clearBroadcastMessages();
      refreshMessages();
    }
  };

  const filteredMessages = messages.filter(m => {
    if (filterType === 'qc') {
      return m.type.startsWith('qc_');
    }
    if (filterType === 'broadcast') {
      return m.type === 'operator_broadcast' || m.type === 'qc_broadcast' || m.type === 'urgent_alert';
    }
    return true;
  });

  const unreadCount = messages.filter(m => !m.read).length;

  const PRESETS = [
    { label: '🧪 Sample at Drop Box', text: 'Hourly oil sample has been delivered to QC Header 4 drop box.' },
    { label: '⚡ Priority QC Request', text: 'Urgent: Priority lab test requested for upcoming tank discharge line.' },
    { label: '🔬 Testing in Progress', text: 'Laboratory test run active (FFA, Moisture, Lovibond Color). Report pending.' },
    { label: '✅ Tank Discharge Cleared', text: 'Quality verified. Safe to proceed with finished oil transfer to TK-201A.' },
  ];

  return (
    <div 
      className="fixed inset-0 z-[99999] flex justify-end bg-black/60 backdrop-blur-xs select-none animate-alert-overlay-in font-sans"
      onClick={onClose}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#080D18] border-l border-[#1F2E43] h-full shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col animate-alert-content-in"
      >
        {/* 1. Header */}
        <div className="p-4 border-b border-[#1F2E43] bg-[#0B1220] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#009FE3]/15 text-[#009FE3] border border-[#009FE3]/30">
              <Radio className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Operator ⇄ QC Broadcast Feed
                </h3>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-500 text-white animate-pulse">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Real-time communication &amp; QC test telemetry
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-950/30 transition-colors"
                title="Mark all as read"
              >
                <CheckCheck className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close drawer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* 2. Broadcast Composer Box */}
        <div className="p-4 border-b border-[#1F2E43] bg-[#0E1626]/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5 uppercase font-mono tracking-wider">
              <MessageSquare className="h-3 w-3 text-[#009FE3]" />
              Send Live Broadcast
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Broadcasting as: <b className="text-slate-200">{currentUser?.full_name || 'Operator'}</b>
            </span>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendBroadcast(p.text)}
                className="px-2 py-1 rounded text-[10px] font-mono font-medium bg-[#131F33] text-slate-300 hover:text-white hover:bg-[#1A2A45] border border-[#1F2E43] transition-colors cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Message Input */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendBroadcast();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Type message to operators & QC chemists..."
              className="flex-1 h-9 px-3 text-xs bg-[#080D18] border border-[#1F2E43] rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-[#009FE3] font-mono"
            />
            <button
              type="submit"
              disabled={!customText.trim() || isSending}
              className="h-9 px-3 rounded-lg bg-[#009FE3] hover:bg-[#00B4FF] text-white text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-md"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>

        {/* 3. Filter Navigation */}
        <div className="px-4 py-2.5 border-b border-[#1F2E43] bg-[#0A1018] flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors cursor-pointer ${
                filterType === 'all' 
                  ? 'bg-[#009FE3]/20 text-[#009FE3] border border-[#009FE3]/40' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({messages.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('qc')}
              className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors cursor-pointer ${
                filterType === 'qc' 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              QC Status ({messages.filter(m => m.type.startsWith('qc_')).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('broadcast')}
              className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors cursor-pointer ${
                filterType === 'broadcast' 
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Announcements ({messages.filter(m => !m.type.startsWith('qc_')).length})
            </button>
          </div>

          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[10px] font-mono text-slate-500 hover:text-red-400 flex items-center gap-1 transition-colors"
              title="Clear all messages"
            >
              <Trash2 className="h-3 w-3" />
              <span>Clear</span>
            </button>
          )}
        </div>

        {/* 4. Messages Feed List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredMessages.length === 0 ? (
            <div className="py-16 text-center text-slate-500 font-mono text-xs">
              <Radio className="h-8 w-8 mx-auto mb-2 text-slate-600 opacity-50" />
              <p>No broadcast messages in this category.</p>
              <p className="text-[10px] text-slate-600 mt-1">Dispatches and QC dispositions will appear here live.</p>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const isDispatch = msg.type === 'qc_dispatch';
              const isAccept = msg.type === 'qc_accept';
              const isConcession = msg.type === 'qc_concession';
              const isReject = msg.type === 'qc_reject';
              const isUrgent = msg.priority === 'urgent' || isReject;

              const borderGlow = isAccept 
                ? 'border-emerald-500/40 bg-emerald-950/20' 
                : isReject 
                ? 'border-red-500/40 bg-red-950/25' 
                : isConcession 
                ? 'border-sky-500/40 bg-sky-950/20' 
                : isDispatch 
                ? 'border-[#009FE3]/40 bg-cyan-950/20' 
                : 'border-amber-500/30 bg-amber-950/15';

              const indicatorColor = isAccept 
                ? 'bg-emerald-500' 
                : isReject 
                ? 'bg-red-500' 
                : isConcession 
                ? 'bg-sky-400' 
                : isDispatch 
                ? 'bg-[#009FE3]' 
                : 'bg-amber-400';

              const dateObj = new Date(msg.timestamp);
              const timeString = isNaN(dateObj.getTime()) 
                ? 'Recent' 
                : dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

              return (
                <div
                  key={msg.id}
                  onClick={() => markBroadcastAsRead(msg.id)}
                  className={`relative p-3.5 rounded-xl border ${borderGlow} transition-all hover:bg-[#111A2C] cursor-pointer`}
                >
                  {/* Left accent bar */}
                  <div className={`absolute top-2 bottom-2 left-0 w-1 rounded-r ${indicatorColor}`} />

                  {/* Header: Sender, Role, Time, Read Status */}
                  <div className="flex items-center justify-between gap-2 mb-1.5 pl-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">
                        {msg.sender_name}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase bg-slate-800 text-slate-300 border border-slate-700">
                        {msg.sender_role}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                      <Clock className="h-3 w-3 text-slate-500" />
                      <span>{timeString}</span>
                      {!msg.read && (
                        <span className="h-2 w-2 rounded-full bg-[#009FE3] ml-1 shadow-xs" title="Unread" />
                      )}
                    </div>
                  </div>

                  {/* Title & Lot Tag */}
                  <div className="flex items-center gap-2 flex-wrap mb-1 pl-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                      {isAccept ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      ) : isReject ? (
                        <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                      ) : isConcession ? (
                        <AlertTriangle className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                      ) : isDispatch ? (
                        <FlaskConical className="h-3.5 w-3.5 text-[#009FE3] shrink-0" />
                      ) : (
                        <Radio className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      )}
                      <span>{msg.title}</span>
                    </div>

                    {msg.lot_no && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-black/50 text-[#009FE3] border border-[#009FE3]/30">
                        {msg.lot_no}
                      </span>
                    )}

                    {isUrgent && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase bg-red-600 text-white">
                        URGENT
                      </span>
                    )}
                  </div>

                  {/* Message Body */}
                  <p className="text-xs text-slate-300 pl-2 leading-relaxed font-sans">
                    {msg.message}
                  </p>

                  {/* Quick Action Button */}
                  {msg.lot_no && onNavigateToQC && (
                    <div className="mt-2.5 pl-2 pt-2 border-t border-slate-800/60 flex justify-end">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          markBroadcastAsRead(msg.id);
                          onClose();
                          onNavigateToQC();
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-mono text-[#009FE3] hover:text-[#08B5F5] transition-colors"
                      >
                        <span>Open Sample in QC Lab</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
