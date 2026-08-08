'use client';

import { ModulePlaceholderPage } from '@/components/shared/module-placeholder';
import { CheckSquare } from 'lucide-react';

export default function TasksPage() {
  return (
    <ModulePlaceholderPage
      title="Task Management & Work Packages"
      moduleName="Task Management"
      phase={1}
      icon={CheckSquare}
      description="Track technical deliverables, work packages, dependencies, and task completion metrics."
    />
  );
}
