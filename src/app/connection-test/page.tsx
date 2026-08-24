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
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { cn } from '@/utils/cn';

export default function ConnectionTestPage() {
  const { data: result, isLoading, isError, error, refetch, isFetching } = useConnectionTest();

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2 font-sans text-slate-800">
      {/* Header Banner */}
      <div className="rounded-2xl bg-[#EBF5FF] border border-sky-200/90 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-sky-600" />
            <h1 className="text-xl font-black text-slate-900 tracking-tight">ERPNext REST Connection Health</h1>
          </div>
          <p className="text-xs text-slate-500">
            Real-time latency diagnostics, API authentication validation, and ERP version check.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition shadow-xs disabled:opacity-50 shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
          {isFetching ? 'Testing Connection...' : 'Run Diagnostics'}
        </button>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Connection Status Card */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Connection Status</span>
            <Activity className="h-4 w-4 text-slate-400" />
          </div>
          <div className="flex items-center gap-2">
            {isLoading ? (
              <div className="h-6 w-24 bg-slate-100 rounded animate-pulse" />
            ) : result?.status === 'connected' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5" /> Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                <XCircle className="h-3.5 w-3.5" /> Failed
              </span>
            )}
          </div>
        </div>

        {/* Response Time Card */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Latency / Response Time</span>
            <Clock className="h-4 w-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-1">
            {isLoading ? (
              <div className="h-6 w-16 bg-slate-100 rounded animate-pulse" />
            ) : (
              <>
                <span className="text-2xl font-black text-slate-900">{result?.responseTimeMs ?? 0}</span>
                <span className="text-xs font-bold text-slate-500">ms</span>
              </>
            )}
          </div>
        </div>

        {/* ERP Version Card */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>ERPNext Version</span>
            <Zap className="h-4 w-4 text-slate-400" />
          </div>
          <div>
            {isLoading ? (
              <div className="h-6 w-20 bg-slate-100 rounded animate-pulse" />
            ) : (
              <span className="text-sm font-bold text-sky-700 font-mono">
                {result?.erpVersion || 'v15 REST'}
              </span>
            )}
          </div>
        </div>

        {/* Authenticated User Card */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Active Session User</span>
            <User className="h-4 w-4 text-slate-400" />
          </div>
          <div>
            {isLoading ? (
              <div className="h-6 w-24 bg-slate-100 rounded animate-pulse" />
            ) : (
              <span className="text-xs font-bold text-slate-800 truncate block max-w-[160px]">
                {result?.loggedUser || 'Administrator'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Connection Log Output Card */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-sky-600" /> API Endpoint Diagnostic Log
          </h2>
          <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
            JSON Output
          </span>
        </div>

        <div className="bg-slate-50 border border-slate-200 text-slate-800 rounded-xl p-4 font-mono text-xs overflow-x-auto shadow-inner">
          {isLoading ? (
            <div className="text-slate-400">Testing connection to ERPNext server...</div>
          ) : isError ? (
            <div className="text-rose-600 font-medium">
              Error: {error instanceof Error ? error.message : 'Failed to reach ERPNext instance.'}
            </div>
          ) : (
            <pre className="text-emerald-700 font-semibold leading-relaxed">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

