import React from 'react';
import { AlertTriangle, ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface TaskPriorityBadgeProps {
  priority: string;
}

export function TaskPriorityBadge({ priority }: TaskPriorityBadgeProps) {
  let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
  let Icon = Minus;

  switch (priority) {
    case 'Urgent':
    case 'Critical':
      badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200';
      Icon = AlertTriangle;
      break;
    case 'High':
      badgeStyle = 'bg-amber-50 text-amber-800 border-amber-200';
      Icon = ArrowUp;
      break;
    case 'Medium':
      badgeStyle = 'bg-sky-50 text-sky-700 border-sky-200';
      Icon = Minus;
      break;
    case 'Low':
      badgeStyle = 'bg-slate-100 text-slate-600 border-slate-200';
      Icon = ArrowDown;
      break;
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${badgeStyle}`}>
      <Icon className="h-3 w-3" />
      <span>{priority}</span>
    </span>
  );
}
