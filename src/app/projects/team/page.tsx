'use client';

import { ModulePlaceholderPage } from '@/components/shared/module-placeholder';
import { Users } from 'lucide-react';

export default function ProjectTeamPage() {
  return (
    <ModulePlaceholderPage
      title="Project Team & Resource Allocation"
      moduleName="Project Team"
      phase={1}
      icon={Users}
      description="Manage cross-functional engineering team assignments, roles, and resource utilization."
    />
  );
}
