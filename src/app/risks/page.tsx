'use client';

import { ModulePlaceholderPage } from '@/components/shared/module-placeholder';
import { ShieldAlert } from 'lucide-react';

export default function RiskRegisterPage() {
  return (
    <ModulePlaceholderPage
      title="Risk Register & Mitigation Matrix"
      moduleName="Risk Register"
      phase={2}
      icon={ShieldAlert}
      description="Track technical, financial, and supply chain risks with FMEA matrix scoring and mitigation plans."
    />
  );
}
