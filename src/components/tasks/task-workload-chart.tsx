import React from 'react';
import { MemberWorkload } from '@/types/task.types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { BarChart3 } from 'lucide-react';

interface TaskWorkloadChartProps {
  workloads: MemberWorkload[];
}

export function TaskWorkloadChart({ workloads }: TaskWorkloadChartProps) {
  if (workloads.length === 0) return null;

  const data = workloads.map((w) => ({
    name: w.employee_name.split(' ')[0], // First name for chart axis
    fullName: w.employee_name,
    Completed: w.completed,
    InProgress: w.inProgress,
    Open: w.open,
    Overdue: w.overdue,
  }));

  return (
    <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4 font-sans">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-sky-600" />
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
            Resource Task Distribution Chart
          </h3>
        </div>
        <span className="text-[10px] text-slate-400 font-mono font-bold">
          Dynamic Recharts Bar Breakdown
        </span>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
              axisLine={{ stroke: '#cbd5e1' }}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
              axisLine={{ stroke: '#cbd5e1' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                borderColor: '#cbd5e1',
                borderRadius: '12px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                fontSize: '12px',
                fontWeight: 600,
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '10px', fontWeight: 700 }}
            />
            <Bar dataKey="Completed" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
            <Bar dataKey="InProgress" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Open" stackId="a" fill="#0ea5e9" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Overdue" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
