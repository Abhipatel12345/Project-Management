'use client';

import { ModulePlaceholderPage } from '@/components/shared/module-placeholder';
import { Lock } from 'lucide-react';

export default function GateManagementPage() {
  return (
    <ModulePlaceholderPage
      title="Gate Management & APQP Stage-Gates"
      moduleName="Gate Management"
      phase={2}
      icon={Lock}
      description="Enforce APQP stage-gate criteria, sign-off checklists, and progression governance."
    />
  );
}
