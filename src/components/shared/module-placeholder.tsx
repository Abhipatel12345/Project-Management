'use client';

import React from 'react';
import Link from 'next/link';
import { LayoutDashboard, Clock, ShieldCheck } from 'lucide-react';

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
    <div className="space-y-6 font-sans text-slate-800">
      {/* Header Banner */}
      <div className="rounded-2xl bg-[#EBF5FF] border border-sky-200/90 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-wider uppercase text-sky-800 mb-1">
            <ShieldCheck className="h-4 w-4 text-sky-600" />
            <span>PHASE {phase}: {moduleName.toUpperCase()}</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">{title}</h1>
          <p className="text-xs text-slate-500 max-w-xl mt-1">{description}</p>
        </div>

        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-sky-200 text-sky-700 hover:bg-sky-50 text-xs font-bold transition shadow-2xs shrink-0 self-start sm:self-auto"
        >
          <LayoutDashboard className="h-4 w-4 text-sky-600" />
          <span>Return to Dashboard</span>
        </Link>
      </div>

      {/* Main Roadmap Card */}
      <div className="p-10 sm:p-12 rounded-2xl bg-white border border-slate-200/90 text-center space-y-4 max-w-2xl mx-auto my-8 shadow-xs">
        <div className="h-14 w-14 rounded-2xl bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center mx-auto shadow-xs">
          <Icon className="h-7 w-7" />
        </div>

        <div>
          <span className="px-3 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-[11px] font-bold uppercase tracking-wider">
            Phase {phase} Module Roadmap
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 mt-3">{title}</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-2 leading-relaxed">
            The ERPNext backend schema and REST APIs for {title} are connected. The enterprise frontend workspace will be unlocked in the next scheduled sprint update.
          </p>
        </div>

        <div className="pt-4 flex items-center justify-center gap-3">
          <Link
            href="/projects"
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition shadow-xs"
          >
            Explore Projects Directory
          </Link>
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
          >
            Dashboard Overview
          </Link>
        </div>
      </div>
    </div>
  );
}

