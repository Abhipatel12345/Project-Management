'use client';

import React from 'react';
import Link from 'next/link';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F7F9FC] flex flex-col items-center justify-center p-4 font-sans text-slate-800">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 shadow-xl text-center space-y-5">
        <div className="inline-flex h-16 w-16 rounded-2xl bg-sky-50 text-sky-600 items-center justify-center border border-sky-200 shadow-xs">
          <FileQuestion className="h-8 w-8" />
        </div>
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">404</h1>
          <h2 className="text-base font-bold text-slate-800">Resource Not Found</h2>
          <p className="text-xs text-slate-500 font-medium">
            The requested PDM page or resource does not exist or has been moved.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-xs transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
