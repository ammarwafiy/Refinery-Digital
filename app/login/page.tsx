'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoginView from '@/components/LoginView';
import { getAuthUser, setAuthUser, ROLE_DEFAULT_TAB } from '@/lib/data-service';
import { initWorkstationTracking } from '@/lib/workstation-service';
import { Profile } from '@/types/refinery';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    const savedUser = getAuthUser();
    if (savedUser) {
      const defaultTab = ROLE_DEFAULT_TAB[savedUser.role] || 'process';
      router.replace(`/dashboard/${defaultTab}`);
    }
  }, [router]);

  const handleLogin = (profile: Profile) => {
    setAuthUser(profile);
    initWorkstationTracking(profile);
    const defaultTab = ROLE_DEFAULT_TAB[profile.role] || 'process';
    router.push(`/dashboard/${defaultTab}`);
  };

  return <LoginView onLogin={handleLogin} />;
}
