'use client';

import React, { useState } from 'react';
import {
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2
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
      {/* Left Column: Brand & Hero Display */}
      <div className={`lg-l ${isExiting ? 'is-exiting' : ''}`}>
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

      {/* Right Column: Clean Dark Surface Login Card */}
      <form 
        className={`lg-card ${isExiting ? 'is-exiting' : ''} ${isShaking ? 'is-shaking' : ''}`} 
        onSubmit={handleFormSubmit} 
        noValidate
      >
        {/* Subtle scan-line light beam sweeps across top on success */}
        {isSuccess && <div className="login-portal-beam" aria-hidden="true" />}

        <h2>Log in</h2>
        <p className="hint">Use the ID and access key from your plant administrator.</p>

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

        {/* Error message alert line */}
        <p className="err" id="err" role="alert">
          {errorMessage || ''}
        </p>

        {/* Primary Access Button with Tactile Emil Physics */}
        <button 
          className={`primary wide ${isSuccess ? 'success' : ''}`} 
          type="submit" 
          disabled={isLoading || isSuccess}
        >
          {isLoading && (
            <span className="inline-flex items-center gap-2">
              <span className="h-3.5 w-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
              <span>Authenticating...</span>
            </span>
          )}
          {isSuccess && (
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>Access Granted · Entering...</span>
            </span>
          )}
          {!isLoading && !isSuccess && 'Access system'}
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
