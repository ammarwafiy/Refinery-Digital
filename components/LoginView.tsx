'use client';

import React, { useState } from 'react';
import {
  AlertCircle,
  Eye,
  EyeOff,
  CreditCard,
} from 'lucide-react';
import { Profile } from '@/types/refinery';
import { loginUser, authenticateUser } from '@/lib/data-service';
import HelpSupportModal from '@/components/HelpSupportModal';

interface LoginViewProps {
  onLogin: (profile: Profile) => void;
}

export default function LoginView({ onLogin }: LoginViewProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await authenticateUser(identifier, password);
      setIsLoading(false);
      if (res.success && res.profile) {
        onLogin(res.profile);
      } else {
        setErrorMessage(res.error || 'Authentication failed. Please verify your Employee ID or password.');
      }
    } catch {
      const res = loginUser(identifier, password);
      setIsLoading(false);
      if (res.success && res.profile) {
        onLogin(res.profile);
      } else {
        setErrorMessage(res.error || 'Authentication failed. Please verify your Employee ID or password.');
      }
    }
  };

  return (
    <div className="login">
      {/* Left Column: Brand & Hero Display */}
      <div className="lg-l">
        <div className="brand-redesign" style={{ padding: 0 }}>
          <div className="mark-redesign">LS</div>
          <div>
            <b>Lam Soon Edible Oils</b>
            <span>Refinery Management System</span>
          </div>
        </div>
        <h1>Every reading, logged and verified.</h1>
        <p>Hourly process logs, QC results and shift reports for the deodorizer line.</p>
      </div>

      {/* Right Column: Clean Dark Surface Login Card */}
      <form className="lg-card" onSubmit={handleFormSubmit} noValidate>
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
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your access key"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        {/* Error message alert line */}
        <p className="err" id="err" role="alert">
          {errorMessage || ''}
        </p>

        {/* Primary Red Access Button */}
        <button className="primary wide" type="submit" disabled={isLoading}>
          {isLoading ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-3.5 w-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
              <span>Authenticating...</span>
            </span>
          ) : (
            'Access system'
          )}
        </button>

        {/* Help and Support Link */}
        <button
          type="button"
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
