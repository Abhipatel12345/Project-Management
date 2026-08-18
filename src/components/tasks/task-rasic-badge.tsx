import React from 'react';
import { TaskRASIC } from '@/types/task.types';
import { ShieldCheck } from 'lucide-react';

interface TaskRASICBadgeProps {
  rasic?: TaskRASIC;
  fallbackAssignee?: string;
}

export function TaskRASICBadge({ rasic, fallbackAssignee }: TaskRASICBadgeProps) {
  const r = rasic?.responsible || fallbackAssignee || 'Unassigned';
  const a = rasic?.accountable || 'PM';

  return (
    <div
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-800 text-[10px] font-bold"
      title={`RASIC Matrix:\nR (Responsible): ${r}\nA (Accountable): ${a}\nS (Support): ${rasic?.support || 'N/A'}\nC (Consulted): ${rasic?.consulted || 'N/A'}\nI (Informed): ${rasic?.informed || 'N/A'}`}
    >
      <ShieldCheck className="h-3 w-3 text-sky-600 shrink-0" />
      <span className="truncate max-w-[80px]">R: {r.split(' ')[0]}</span>
    </div>
  );
}
