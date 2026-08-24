'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft, LayoutDashboard, Lock } from 'lucide-react';
import { useAuth } from '@/providers/auth-context';

interface AccessDeniedProps {
  title?: string;
  reason?: string;
  returnUrl?: string;
}

export function AccessDenied({
  title = '403 Forbidden — Access Denied',
  reason = 'You do not have permission to view or manage this resource under your current ERPNext role authorization.',
  returnUrl = '/dashboard',
}: AccessDeniedProps) {
  const { user } = useAuth();

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 font-sans text-slate-800">
      <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-lg w-full text-center space-y-6 shadow-md">
        <div className="h-16 w-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
            Authorization Security Policy
          </span>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
          <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">{reason}</p>
        </div>

        {user && (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold uppercase">
              <span>Current Authenticated User</span>
              <span className="text-emerald-600 font-mono">ERPNext Active</span>
            </div>
            <div className="font-bold text-slate-900 truncate">{user.fullName} ({user.username})</div>
            <div className="text-slate-500 text-[11px]">
              ERPNext Role: <strong className="text-sky-600">{user.roleLabel}</strong>
            </div>
          </div>
        )}

        <div className="pt-2 flex items-center justify-center gap-3">
          <Link
            href={returnUrl}
            className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-sm"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
