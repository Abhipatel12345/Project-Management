import React from 'react';
import { IssueStatus } from '@/types/issue.types';

interface IssueStatusBadgeProps {
  status: IssueStatus;
}

export function IssueStatusBadge({ status }: IssueStatusBadgeProps) {
  let badgeStyles = 'bg-slate-100 text-slate-800 border-slate-200';
  let dotStyles = 'bg-slate-400';

  switch (status) {
    case 'Open':
      badgeStyles = 'bg-sky-50 text-sky-800 border-sky-200/90';
      dotStyles = 'bg-sky-500';
      break;
    case 'Replied':
      badgeStyles = 'bg-blue-50 text-blue-800 border-blue-200/90';
      dotStyles = 'bg-blue-500';
      break;
    case 'On Hold':
      badgeStyles = 'bg-amber-50 text-amber-800 border-amber-200/90';
      dotStyles = 'bg-amber-500';
      break;
    case 'Resolved':
      badgeStyles = 'bg-emerald-50 text-emerald-800 border-emerald-200/90';
      dotStyles = 'bg-emerald-500';
      break;
    case 'Closed':
      badgeStyles = 'bg-slate-100 text-slate-700 border-slate-300';
      dotStyles = 'bg-slate-500';
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold tracking-tight shadow-2xs ${badgeStyles}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotStyles}`} />
      <span>{status}</span>
    </span>
  );
}
