'use client';

import React, { useEffect } from 'react';
import { RefreshCw, Home, AlertTriangle } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Plant Digital System Runtime Error:', error);
  }, [error]);

  const handleHardReset = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('refinery_auth_user');
        sessionStorage.clear();
      } catch {}
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#070B12] text-slate-100 p-4">
      <div className="max-w-md w-full rounded-xl border border-[#1F2E43] bg-[#101927] p-6 shadow-2xl text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-4">
          <AlertTriangle className="h-7 w-7" />
        </div>

        <h2 className="text-lg font-bold text-slate-100 tracking-tight">
          System Connection Recovered
        </h2>
        <p className="mt-2 text-xs text-slate-400 leading-relaxed">
          The workstation detected a temporary connection update or session refresh. 
          Click below to resume your plant session.
        </p>

        {error?.message && (
          <div className="mt-3 p-2.5 rounded-lg bg-[#080E18] border border-[#1F2E43] text-[11px] font-mono text-slate-400 text-left overflow-x-auto max-h-24">
            {error.message}
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row gap-2.5 justify-center">
          <button
            onClick={() => reset()}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#009FE3] hover:bg-[#0089C4] text-white font-medium text-xs transition shadow-md"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Reload Workstation</span>
          </button>
          <button
            onClick={handleHardReset}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#1F2E43]/60 hover:bg-[#1F2E43] text-slate-200 font-medium text-xs transition border border-slate-600/40"
          >
            <Home className="h-3.5 w-3.5" />
            <span>Return to Login / Home</span>
          </button>
        </div>
      </div>
    </div>
  );
}
