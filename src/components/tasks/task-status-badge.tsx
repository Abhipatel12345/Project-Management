import React from 'react';

interface TaskStatusBadgeProps {
  status: string;
}

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotColor = 'bg-slate-500';

  switch (status) {
    case 'Open':
      badgeStyle = 'bg-sky-50 text-sky-700 border-sky-200';
      dotColor = 'bg-sky-500';
      break;
    case 'Working':
    case 'In Progress':
      badgeStyle = 'bg-blue-50 text-blue-700 border-blue-200';
      dotColor = 'bg-blue-600';
      break;
    case 'Pending Review':
      badgeStyle = 'bg-purple-50 text-purple-700 border-purple-200';
      dotColor = 'bg-purple-600';
      break;
    case 'Completed':
      badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      dotColor = 'bg-emerald-600';
      break;
    case 'Cancelled':
      badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200';
      dotColor = 'bg-rose-500';
      break;
    default:
      badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
      dotColor = 'bg-slate-400';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badgeStyle}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span>{status}</span>
    </span>
  );
}
