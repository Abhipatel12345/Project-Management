'use client';

import React from 'react';
import Link from 'next/link';
import { LayoutDashboard, ArrowLeft, Clock, ShieldCheck, Rocket } from 'lucide-react';

interface ModulePlaceholderProps {
  title: string;
  moduleName: string;
  phase: number;
  description?: string;
  icon?: React.ElementType;
}

export function ModulePlaceholderPage({
  title,
  moduleName,
  phase,
  description = 'This enterprise module is scheduled for implementation in upcoming sprint releases.',
  icon: Icon = Clock,
}: ModulePlaceholderProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-cyan-400 mb-1">
            <ShieldCheck className="h-4 w-4" />
            <span>PHASE {phase}: {moduleName.toUpperCase()}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">{title}</h1>
          <p className="text-xs text-slate-400 max-w-xl mt-1">{description}</p>
        </div>

        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-medium transition"
        >
          <LayoutDashboard className="h-4 w-4 text-cyan-400" />
          <span>Return to Dashboard</span>
        </Link>
      </div>

      {/* Main Card */}
      <div className="p-12 rounded-2xl bg-gradient-to-b from-slate-900/80 to-slate-950 border border-slate-800/80 text-center space-y-4 max-w-2xl mx-auto my-8 shadow-xl">
        <div className="h-14 w-14 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/10">
          <Icon className="h-7 w-7" />
        </div>

        <div>
          <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[11px] font-semibold uppercase tracking-wider">
            Phase {phase} Module Roadmap
          </span>
          <h2 className="text-xl font-bold text-slate-100 mt-3">{title}</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
            The ERPNext backend schema and APIs for {title} are connected. The enterprise frontend workspace will be unlocked in the next scheduled sprint update.
          </p>
        </div>

        <div className="pt-4 flex items-center justify-center gap-3">
          <Link
            href="/projects"
            className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-medium hover:bg-cyan-500/30 transition"
          >
            Explore Projects Directory
          </Link>
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
          >
            Dashboard Overview
          </Link>
        </div>
      </div>
    </div>
  );
}
