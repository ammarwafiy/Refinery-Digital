'use client';

export type BroadcastType = 
  | 'qc_dispatch'
  | 'qc_accept'
  | 'qc_concession'
  | 'qc_reject'
  | 'operator_broadcast'
  | 'qc_broadcast'
  | 'urgent_alert';

export interface BroadcastMessage {
  id: string;
  type: BroadcastType;
  title: string;
  message: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  timestamp: string;
  lot_no?: string;
  report_no?: string;
  priority?: 'normal' | 'urgent';
  read: boolean;
}

export interface ToastItem {
  id: string;
  type: BroadcastType;
  title: string;
  message: string;
  lot_no?: string;
  timestamp?: string;
  duration?: number;
}

const STORAGE_KEY_BROADCASTS = 'refinery_broadcast_messages_v1';

const INITIAL_BROADCASTS: BroadcastMessage[] = [
  {
    id: 'bc-init-001',
    type: 'qc_accept',
    title: 'QC Sample Accepted',
    message: 'Lot LOT-PL65-260920-0700 (RBD Palm Olein) PASSED QC test. Parameters in-spec (FFA 0.038%, Color 2.8R). Released for export.',
    sender_id: 'QCS001',
    sender_name: 'Dr. Emily Carter (QC Chemist)',
    sender_role: 'QC Chemist',
    timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    lot_no: 'LOT-PL65-260920-0700',
    priority: 'normal',
    read: true,
  },
  {
    id: 'bc-init-002',
    type: 'qc_reject',
    title: 'QC Sample Rejected',
    message: 'Lot LOT-PL65-260920-0800 REJECTED. Free Fatty Acid high (0.075%, max 0.050%). Disposition: HOLD.',
    sender_id: 'QCS001',
    sender_name: 'Dr. Emily Carter (QC Chemist)',
    sender_role: 'QC Chemist',
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    lot_no: 'LOT-PL65-260920-0800',
    priority: 'urgent',
    read: false,
  },
  {
    id: 'bc-init-003',
    type: 'qc_dispatch',
    title: 'Sample Sent to QC',
    message: 'Hourly oil sample for Lot LOT-PL65-260920-0900 submitted to QC Lab queue. Awaiting chemist testing.',
    sender_id: 'OPR001',
    sender_name: 'Ammar Wafiy (Plant Operator)',
    sender_role: 'Plant Operator',
    timestamp: new Date(Date.now() - 70 * 60 * 1000).toISOString(),
    lot_no: 'LOT-PL65-260920-0900',
    priority: 'normal',
    read: true,
  }
];

export function getBroadcastMessages(): BroadcastMessage[] {
  if (typeof window === 'undefined') return INITIAL_BROADCASTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BROADCASTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_BROADCASTS, JSON.stringify(INITIAL_BROADCASTS));
      return INITIAL_BROADCASTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_BROADCASTS;
  } catch {
    return INITIAL_BROADCASTS;
  }
}

export function saveBroadcastMessages(msgs: BroadcastMessage[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_BROADCASTS, JSON.stringify(msgs));
    window.dispatchEvent(new CustomEvent('refinery_broadcast_updated', { detail: msgs }));
  } catch (err) {
    console.warn('[Broadcast] Failed to save messages:', err);
  }
}

export function emitToast(toastData: Omit<ToastItem, 'id'>): void {
  if (typeof window === 'undefined') return;
  const toast: ToastItem = {
    ...toastData,
    id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  };
  window.dispatchEvent(new CustomEvent('refinery_toast_event', { detail: toast }));
}

export function sendBroadcastMessage(data: {
  type: BroadcastType;
  title: string;
  message: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  lot_no?: string;
  report_no?: string;
  priority?: 'normal' | 'urgent';
  showToastNotification?: boolean;
}): BroadcastMessage {
  const current = getBroadcastMessages();
  const newMsg: BroadcastMessage = {
    id: `bc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: data.type,
    title: data.title,
    message: data.message,
    sender_id: data.sender_id,
    sender_name: data.sender_name,
    sender_role: data.sender_role,
    timestamp: new Date().toISOString(),
    lot_no: data.lot_no,
    report_no: data.report_no,
    priority: data.priority || 'normal',
    read: false,
  };

  const updated = [newMsg, ...current.slice(0, 99)]; // keep latest 100 messages
  saveBroadcastMessages(updated);

  if (data.showToastNotification !== false) {
    emitToast({
      type: newMsg.type,
      title: newMsg.title,
      message: newMsg.message,
      lot_no: newMsg.lot_no,
    });
  }

  return newMsg;
}

export function markBroadcastAsRead(id: string): void {
  const current = getBroadcastMessages();
  const idx = current.findIndex(m => m.id === id);
  if (idx >= 0 && !current[idx].read) {
    current[idx].read = true;
    saveBroadcastMessages([...current]);
  }
}

export function markAllBroadcastsAsRead(): void {
  const current = getBroadcastMessages();
  const updated = current.map(m => ({ ...m, read: true }));
  saveBroadcastMessages(updated);
}

export function clearBroadcastMessages(): void {
  saveBroadcastMessages([]);
}

export function getUnreadBroadcastCount(): number {
  const msgs = getBroadcastMessages();
  return msgs.filter(m => !m.read).length;
}
