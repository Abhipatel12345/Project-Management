'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/providers/auth-context';
import { Loader2, ShieldAlert } from 'lucide-react';

interface RouteGuardProps {
  children: React.ReactNode;
}

const PUBLIC_PATHS = ['/login', '/connection-test'];

export function RouteGuard({ children }: RouteGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublicPath = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + '/'));

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isPublicPath) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, isAuthenticated, isPublicPath, pathname, router]);

  if (isLoading && !isPublicPath) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/10">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
        <div className="text-center space-y-1">
          <div className="text-sm font-semibold text-white">Verifying ERPNext Session...</div>
          <div className="text-xs text-slate-500">Checking authentication tokens & cookies</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !isPublicPath) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3 max-w-sm">
          <ShieldAlert className="h-8 w-8 text-amber-400 mx-auto" />
          <h2 className="text-base font-bold text-white">Authentication Required</h2>
          <p className="text-xs text-slate-400">
            Please sign in with your ERPNext account to access protected system routes.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
