'use client';

import { ModulePlaceholderPage } from '@/components/shared/module-placeholder';
import { BarChart3 } from 'lucide-react';

export default function ReportsPage() {
  return (
    <ModulePlaceholderPage
      title="Reports & Program Analytics"
      moduleName="Reports & Analytics"
      phase={3}
      icon={BarChart3}
      description="Generate executive PDF reports, cross-program resource heatmaps, and cost breakdown charts."
    />
  );
}
