'use client';

import React from 'react';
import { useConnectionTest } from '@/hooks/use-auth';
import {
  Server,
  Activity,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  User,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { cn } from '@/utils/cn';

export default function ConnectionTestPage() {
  const { data: result, isLoading, isError, error, refetch, isFetching } = useConnectionTest();

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-4">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800/80 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-cyan-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">ERPNext REST Connection Health</h1>
          </div>
          <p className="text-xs text-slate-400">
            Real-time latency diagnostics, API authentication validation, and ERP version check.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all shadow-md shadow-cyan-500/20 disabled:opacity-50"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
          {isFetching ? 'Testing Connection...' : 'Run Diagnostics'}
        </button>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Connection Status Card */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Connection Status</span>
            <Activity className="h-4 w-4 text-slate-500" />
          </div>
          <div className="flex items-center gap-2">
            {isLoading ? (
              <div className="h-6 w-24 bg-slate-800 rounded animate-pulse" />
            ) : result?.status === 'connected' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="h-3.5 w-3.5" /> Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <XCircle className="h-3.5 w-3.5" /> Failed
              </span>
            )}
          </div>
        </div>

        {/* Response Time Card */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Latency / Response Time</span>
            <Clock className="h-4 w-4 text-slate-500" />
          </div>
          <div className="flex items-baseline gap-1">
            {isLoading ? (
              <div className="h-6 w-16 bg-slate-800 rounded animate-pulse" />
            ) : (
              <>
                <span className="text-2xl font-bold text-white">{result?.responseTimeMs ?? 0}</span>
                <span className="text-xs text-slate-400">ms</span>
              </>
            )}
          </div>
        </div>

        {/* ERP Version Card */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>ERPNext Version</span>
            <Zap className="h-4 w-4 text-slate-500" />
          </div>
          <div>
            {isLoading ? (
              <div className="h-6 w-20 bg-slate-800 rounded animate-pulse" />
            ) : (
              <span className="text-sm font-semibold text-cyan-300 font-mono">
                {result?.erpVersion || 'Unknown'}
              </span>
            )}
          </div>
        </div>

        {/* Logged User Card */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Logged User</span>
            <User className="h-4 w-4 text-slate-500" />
          </div>
          <div>
            {isLoading ? (
              <div className="h-6 w-28 bg-slate-800 rounded animate-pulse" />
            ) : (
              <span className="text-xs font-semibold text-slate-200 truncate block">
                {result?.loggedUser || 'Guest'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Technical Connection Summary */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-4">
        <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-cyan-400" /> Endpoint & Token Parameters
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-1">
            <span className="text-slate-500 font-medium">Target ERPNext Base URL</span>
            <div className="font-mono text-slate-200 flex items-center gap-1.5 truncate">
              {result?.erpUrl || process.env.NEXT_PUBLIC_ERP_URL || 'https://demo.erpnext.com'}
              <ExternalLink className="h-3 w-3 text-slate-500" />
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-1">
            <span className="text-slate-500 font-medium">Authorization Header</span>
            <div className="font-mono text-cyan-400 truncate">
              Authorization: token API_KEY:API_SECRET
            </div>
          </div>
        </div>

        {/* Error Callout if Failed */}
        {(isError || result?.status === 'failed') && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <XCircle className="h-4 w-4 text-rose-400" /> Connection Error Diagnostic
            </div>
            <p className="text-rose-400/90 font-mono">
              {result?.errorMessage || error?.message || 'Failed to establish REST API session.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
