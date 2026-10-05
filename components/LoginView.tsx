'use client';

import React, { useState } from 'react';
import {
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { Profile } from '@/types/refinery';
import { loginUser, authenticateUser } from '@/lib/data-service';
import HelpSupportModal from '@/components/HelpSupportModal';

interface LoginViewProps {
  onLogin: (profile: Profile) => void;
}

type AuthStatus = 'idle' | 'authenticating' | 'success' | 'error';

export default function LoginView({ onLogin }: LoginViewProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('idle');
  const [isExiting, setIsExiting] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [successProfile, setSuccessProfile] = useState<Profile | null>(null);

  const handleQuickFill = (id: string, roleName: string) => {
    setIdentifier(id);
    setPassword('password123');
    setErrorMessage(null);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authStatus === 'authenticating' || authStatus === 'success') return;

    setErrorMessage(null);
    setAuthStatus('authenticating');

    try {
      const res = await authenticateUser(identifier, password);
      if (res.success && res.profile) {
        handleAuthSuccess(res.profile);
      } else {
        handleAuthFailure(res.error || 'Authentication failed. Please verify your Employee ID or password.');
      }
    } catch {
      const res = loginUser(identifier, password);
      if (res.success && res.profile) {
        handleAuthSuccess(res.profile);
      } else {
        handleAuthFailure(res.error || 'Authentication failed. Please verify your Employee ID or password.');
      }
    }
  };

  const handleAuthSuccess = (profile: Profile) => {
    setAuthStatus('success');
    setSuccessProfile(profile);

    // Emil Kowalski transition choreography:
    // 1. Give 70ms for the checkmark & emerald state to settle in perception
    // 2. Trigger the exit dissolve with blur mask (220ms duration)
    // 3. Complete handoff to router at 230ms
    setTimeout(() => {
      setIsExiting(true);
    }, 70);

    setTimeout(() => {
      onLogin(profile);
    }, 230);
  };

  const handleAuthFailure = (msg: string) => {
    setAuthStatus('error');
    setErrorMessage(msg);
    setIsShaking(true);
    setTimeout(() => {
      setIsShaking(false);
    }, 240);
  };

  const isLoading = authStatus === 'authenticating';
  const isSuccess = authStatus === 'success';

  return (
    <div className="login">
      {/* Left Column: Brand & Hero Display with Staggered Entrance */}
      <div className={`lg-l login-enter-brand ${isExiting ? 'is-exiting' : ''}`}>
        <div className="brand-redesign" style={{ padding: 0 }}>
          <div className="mark-redesign">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/lamsoon-logo.png" 
              alt="Lam Soon Badge" 
              className="w-full h-full object-contain" 
            />
          </div>
          <div>
            <b>Lam Soon Edible Oils</b>
            <span>Refinery Management System</span>
          </div>
        </div>
        <h1>Every reading, logged and verified.</h1>
        <p>Hourly process logs, QC results and shift reports for the deodorizer line.</p>
      </div>

      {/* Right Column: Clean Dark Surface Login Card with Emil Physics */}
      <form 
        className={`lg-card login-card-enter ${isExiting ? 'is-exiting' : ''} ${isShaking ? 'is-shaking' : ''}`} 
        onSubmit={handleFormSubmit} 
        noValidate
      >
        {/* Subtle scan-line light beam sweeps across top on success */}
        {isSuccess && <div className="login-portal-beam" aria-hidden="true" />}

        <h2>Log in</h2>
        <p className="hint">Use the ID and access key from your plant administrator.</p>

        {/* Quick-fill helper pills for instant switching and testing */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">
              Quick demo login:
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickFill('OPR001', 'Operator')}
              className="quick-pill"
              title="Ahmad Razak - Plant Operator"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
              <span>Operator</span>
              <span className="text-[10px] opacity-60 font-mono">OPR001</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('SUP001', 'Supervisor')}
              className="quick-pill"
              title="Chong Wei Lun - Shift Supervisor"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              <span>Supervisor</span>
              <span className="text-[10px] opacity-60 font-mono">SUP001</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('QCS001', 'QC Lab')}
              className="quick-pill"
              title="Siti Nurhaliza - Lab Chemist"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>QC Lab</span>
              <span className="text-[10px] opacity-60 font-mono">QCS001</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('ADM001', 'Plant Admin')}
              className="quick-pill"
              title="Admin User - Full System Access"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
              <span>Admin</span>
              <span className="text-[10px] opacity-60 font-mono">ADM001</span>
            </button>
          </div>
        </div>

        {/* Refinery ID Field */}
        <div className="fld">
          <label htmlFor="rid">Refinery ID</label>
          <input
            id="rid"
            type="text"
            required
            autoComplete="username"
            disabled={isLoading || isSuccess}
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value);
              if (errorMessage) setErrorMessage(null);
            }}
            placeholder="e.g. ADM001, OPR001"
          />
        </div>

        {/* Access Key Field with Show/Hide Toggle */}
        <div className="fld">
          <label htmlFor="key">Access key</label>
          <div className="pw">
            <input
              id="key"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              disabled={isLoading || isSuccess}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="Enter your access key"
            />
            <button
              type="button"
              tabIndex={-1}
              disabled={isLoading || isSuccess}
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        {/* Error message alert line with smooth slide-down */}
        <div className="err" id="err" role="alert" aria-live="polite">
          {errorMessage && (
            <>
              <AlertCircle className="w-4 h-4 text-[#fb7185] shrink-0" />
              <span>{errorMessage}</span>
            </>
          )}
        </div>

        {/* Primary Access Button with Tactile Emil Physics */}
        <button 
          className={`primary wide ${isSuccess ? 'success' : ''}`} 
          type="submit" 
          disabled={isLoading || isSuccess}
        >
          <span className={`login-btn-content ${isLoading ? 'is-transitioning' : ''}`}>
            {isLoading && (
              <>
                <span className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                <span>Authenticating credentials...</span>
              </>
            )}
            {isSuccess && (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>Access Granted · Entering...</span>
              </>
            )}
            {!isLoading && !isSuccess && (
              <>
                <span>Access system</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-70 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </span>
        </button>

        {/* Help and Support Link */}
        <button
          type="button"
          disabled={isLoading || isSuccess}
          onClick={() => setIsHelpOpen(true)}
          className="help-link"
        >
          Help and support
        </button>
      </form>

      {/* Help & Support Modal */}
      {isHelpOpen && (
        <HelpSupportModal
          isOpen={isHelpOpen}
          onClose={() => setIsHelpOpen(false)}
        />
      )}
    </div>
  );
}
