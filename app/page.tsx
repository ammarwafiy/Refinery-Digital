'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthUser, ROLE_DEFAULT_TAB } from '@/lib/data-service';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const savedUser = getAuthUser();
    if (savedUser) {
      const defaultTab = ROLE_DEFAULT_TAB[savedUser.role] || 'process';
      router.replace(`/dashboard/${defaultTab}`);
    } else {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
      <div className="flex items-center gap-3 text-slate-400 font-mono text-sm">
        <div className="w-2.5 h-2.5 rounded-full bg-[#009FE3] animate-ping" />
        <span>Verifying plant workstation session...</span>
      </div>
    </div>
  );
}
