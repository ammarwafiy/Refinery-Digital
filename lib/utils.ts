// ==============================================================================
// Utility functions for class names, time formatting, and numerical validation
// ==============================================================================

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(isoString: string): string {
  if (!isoString) return '-';
  const date = new Date(isoString);
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Kuala_Lumpur',
  });
}

export function formatDate(dateString: string): string {
  if (!dateString) return '-';
  const [y, m, d] = dateString.split('-');
  if (!d || !m || !y) return dateString;
  return `${d}/${m}/${y}`;
}

export function formatNumber(val: number | null | undefined, decimals = 1): string {
  if (val === null || val === undefined || isNaN(val)) return '-';
  return val.toFixed(decimals);
}
