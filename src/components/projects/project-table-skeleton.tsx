import React from 'react';

interface ProjectTableSkeletonProps {
  rows?: number;
}

export function ProjectTableSkeleton({ rows = 5 }: ProjectTableSkeletonProps) {
  return (
    <div className="w-full space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="h-16 w-full rounded-xl bg-slate-900/60 border border-slate-800/80 p-4 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3 w-1/3">
            <div className="h-9 w-9 rounded-lg bg-slate-800" />
            <div className="space-y-1.5 flex-1">
              <div className="h-4 w-3/4 rounded bg-slate-800" />
              <div className="h-3 w-1/2 rounded bg-slate-800/60" />
            </div>
          </div>
          <div className="h-6 w-20 rounded-full bg-slate-800" />
          <div className="h-6 w-16 rounded bg-slate-800" />
          <div className="h-3 w-28 rounded bg-slate-800" />
          <div className="h-8 w-24 rounded-lg bg-slate-800" />
        </div>
      ))}
    </div>
  );
}
