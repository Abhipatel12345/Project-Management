import React from 'react';
import { IssuePriority } from '@/types/issue.types';

interface IssuePriorityBadgeProps {
  priority: IssuePriority;
}

export function IssuePriorityBadge({ priority }: IssuePriorityBadgeProps) {
  let styles = 'bg-slate-50 text-slate-700 border-slate-200';
  let label: string = priority;

  switch (priority) {
    case 'Urgent/Critical':
    case 'Urgent':
      styles = 'bg-rose-50 text-rose-800 border-rose-200/90 font-extrabold ring-1 ring-rose-500/20';
      label = 'URGENT';
      break;
    case 'High':
      styles = 'bg-amber-50 text-amber-800 border-amber-200/90 font-bold';
      label = 'HIGH';
      break;
    case 'Medium':
      styles = 'bg-sky-50 text-sky-800 border-sky-200/90 font-medium';
      label = 'MEDIUM';
      break;
    case 'Low':
      styles = 'bg-slate-100 text-slate-600 border-slate-200 font-normal';
      label = 'LOW';
      break;
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] uppercase tracking-wider ${styles}`}
    >
      {label}
    </span>
  );
}
