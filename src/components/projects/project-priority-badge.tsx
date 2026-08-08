import React from 'react';
import { cn } from '@/utils/cn';
import { AlertCircle, ArrowUpRight, Minus, AlertTriangle } from 'lucide-react';

interface ProjectPriorityBadgeProps {
  priority?: string;
  className?: string;
}

export function ProjectPriorityBadge({ priority = 'Medium', className }: ProjectPriorityBadgeProps) {
  const getPriorityConfig = (priorityStr: string) => {
    switch (priorityStr.toLowerCase()) {
      case 'critical':
      case 'urgent':
        return {
          style: 'bg-rose-500/10 text-rose-400 border-rose-500/30 font-semibold shadow-sm shadow-rose-500/10',
          icon: AlertCircle,
        };
      case 'high':
        return {
          style: 'bg-amber-500/10 text-amber-400 border-amber-500/20 font-medium',
          icon: AlertTriangle,
        };
      case 'medium':
        return {
          style: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
          icon: ArrowUpRight,
        };
      case 'low':
      default:
        return {
          style: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
          icon: Minus,
        };
    }
  };

  const config = getPriorityConfig(priority);
  const IconComponent = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs border tracking-wide',
        config.style,
        className
      )}
    >
      <IconComponent className="w-3.5 h-3.5" />
      {priority}
    </span>
  );
}
