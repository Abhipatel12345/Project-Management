'use client';

import { ModulePlaceholderPage } from '@/components/shared/module-placeholder';
import { AlertTriangle } from 'lucide-react';

export default function IssuesPage() {
  return (
    <ModulePlaceholderPage
      title="Open Issues & Defect Tracking"
      moduleName="Open Issues"
      phase={1}
      icon={AlertTriangle}
      description="Capture, triage, and resolve engineering defects, non-conformances, and open tickets."
    />
  );
}
