'use client';

import { ModulePlaceholderPage } from '@/components/shared/module-placeholder';
import { Workflow } from 'lucide-react';

export default function WorkflowsPage() {
  return (
    <ModulePlaceholderPage
      title="Workflow Status & Process Mapping"
      moduleName="Workflow Status"
      phase={2}
      icon={Workflow}
      description="Visualize Frappe workflow states, transitions, escalation rules, and approval hierarchies."
    />
  );
}
