'use client';

import { ModulePlaceholderPage } from '@/components/shared/module-placeholder';
import { PieChart } from 'lucide-react';

export default function ExecutivePage() {
  return (
    <ModulePlaceholderPage
      title="Executive Dashboard & Portfolio Insights"
      moduleName="Executive Dashboard"
      phase={3}
      icon={PieChart}
      description="C-suite overview of portfolio health, strategic program milestones, capital expenditure, and risk posture."
    />
  );
}
