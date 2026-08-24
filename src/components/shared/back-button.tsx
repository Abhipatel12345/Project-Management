'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/utils/cn';

interface BackButtonProps {
  label?: string;
  fallbackUrl?: string;
  className?: string;
}

export function BackButton({
  label = 'Back',
  fallbackUrl = '/dashboard',
  className = '',
}: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackUrl);
    }
  };

  return (
    <button
      onClick={handleBack}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition border border-slate-200 cursor-pointer shadow-xs',
        className
      )}
      title="Navigate to previous page"
    >
      <ArrowLeft className="h-3.5 w-3.5 text-slate-500" />
      <span>{label}</span>
    </button>
  );
}
