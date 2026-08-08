'use client';

import { ModulePlaceholderPage } from '@/components/shared/module-placeholder';
import { Target } from 'lucide-react';

export default function ScorecardPage() {
  return (
    <ModulePlaceholderPage
      title="Imperative Scorecard & KPI Analytics"
      moduleName="Imperative Scorecard"
      phase={3}
      icon={Target}
      description="Track OEM strategic imperatives, quality targets (PPM), cost variance, and program KPIs."
    />
  );
}
