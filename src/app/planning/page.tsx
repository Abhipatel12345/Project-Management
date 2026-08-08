'use client';

import { ModulePlaceholderPage } from '@/components/shared/module-placeholder';
import { CalendarDays } from 'lucide-react';

export default function PlanningPage() {
  return (
    <ModulePlaceholderPage
      title="Planning & Gantt Timeline"
      moduleName="Planning & Gantt"
      phase={1}
      icon={CalendarDays}
      description="Interactive Gantt schedules, milestone dependencies, and critical path analysis."
    />
  );
}
