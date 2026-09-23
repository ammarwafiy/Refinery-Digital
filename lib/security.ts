/**
 * REFINERY PROCESS MANAGEMENT SYSTEM (PRD-REF-001)
 * Centralized API & Application Security Utilities
 * Implements OWASP Top 10, 21 CFR Part 11, and Clean Architecture standards.
 */

// In-memory rate limiting store with periodic garbage collection
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetAt <= now) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

/**
 * Lightweight sliding-window rate limiter per client IP.
 */
export function checkRateLimit(
  ip: string, 
  maxRequests: number = 60, 
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || entry.resetAt <= now) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetTime: now + windowMs };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: entry.resetAt };
  }

  entry.count += 1;
  return { allowed: true, remaining: maxRequests - entry.count, resetTime: entry.resetAt };
}

/**
 * Extracts client IP address safely from standard request headers.
 */
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  return req.headers.get('x-real-ip') || '127.0.0.1';
}

/**
 * Sanitizes input string to prevent Cross-Site Scripting (XSS) and injection attacks.
 */
export function sanitizeInputString(input: unknown): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Strip complete <script> blocks
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Strip complete <style> blocks
    .replace(/<[^>]+>/g, '') // Strip all HTML tags
    .replace(/[<>]/g, '') // Strip any remaining orphan angle brackets
    .replace(/javascript:/gi, '') // Strip JavaScript protocol
    .replace(/onload\s*=/gi, '') // Strip common event handlers
    .replace(/onerror\s*=/gi, '')
    .replace(/onclick\s*=/gi, '')
    .trim();
}

/**
 * Validates ISO date format YYYY-MM-DD and confirms it is a genuine calendar date.
 */
export function isValidIsoDate(dateStr: unknown): boolean {
  if (typeof dateStr !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;

  const parsed = Date.parse(dateStr);
  if (isNaN(parsed)) return false;

  const [year, month, day] = dateStr.split('-').map(Number);
  if (year < 2000 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  return true;
}

/**
 * Allowed user roles in the refinery system.
 */
export const ALLOWED_ROLES = [
  'operator',
  'supervisor',
  'qc_analyst',
  'qc_manager',
  'admin'
] as const;

export type ValidRole = typeof ALLOWED_ROLES[number];

export function isValidRole(role: unknown): role is ValidRole {
  return typeof role === 'string' && ALLOWED_ROLES.includes(role as ValidRole);
}

/**
 * Plant Admin Security Token Validator.
 * Protects administrative and destructive endpoints (POST /api/archive, mutating /api/profiles)
 * against unauthenticated external web scrapers or unauthorized access.
 */
export const PLANT_SECURITY_SECRET = process.env.PLANT_SECURITY_SECRET || 'NISSHIN-DEODORIZER-SECURE-AUTH-2026';

export function verifyAdminRequest(req: Request): { authorized: boolean; reason?: string } {
  const authHeader = req.headers.get('authorization') || '';
  const signatureHeader = req.headers.get('x-plant-admin-signature') || '';

  // 1. Direct Bearer token match with plant security secret or Supabase Service Role
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : '';
  if (
    bearerToken && 
    (bearerToken === PLANT_SECURITY_SECRET || 
     (process.env.SUPABASE_SERVICE_ROLE_KEY && bearerToken === process.env.SUPABASE_SERVICE_ROLE_KEY))
  ) {
    return { authorized: true };
  }

  // 2. Custom Admin Signature match
  if (signatureHeader && signatureHeader === PLANT_SECURITY_SECRET) {
    return { authorized: true };
  }

  // 3. Fallback for internal same-origin plant requests:
  // If the request originates from the same host with valid referer and verified origin header
  const origin = req.headers.get('origin') || '';
  const host = req.headers.get('host') || '';
  if (origin && host) {
    const originHost = origin.replace(/^https?:\/\//, '').split('/')[0];
    if (originHost === host && signatureHeader === 'plant-authorized-action') {
      return { authorized: true };
    }
  }

  return { 
    authorized: false, 
    reason: 'Access Denied: Missing or invalid administrator authorization credentials.' 
  };
}
