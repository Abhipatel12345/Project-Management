import React from 'react';
import { cn } from '@/utils/cn';

interface ProjectStatusBadgeProps {
  status?: string;
  className?: string;
}

export function ProjectStatusBadge({ status = 'Open', className }: ProjectStatusBadgeProps) {
  const getBadgeStyle = (statusStr: string) => {
    switch (statusStr.toLowerCase()) {
      case 'open':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'in progress':
      case 'inprogress':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'completed':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'cancelled':
      case 'canceled':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'on hold':
      case 'onhold':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border tracking-wide transition-colors',
        getBadgeStyle(status),
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-80" />
      {status}
    </span>
  );
}
