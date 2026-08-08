'use client';

import { ModulePlaceholderPage } from '@/components/shared/module-placeholder';
import { ClipboardList } from 'lucide-react';

export default function DesignReviewPage() {
  return (
    <ModulePlaceholderPage
      title="Design Review & Milestone Approvals"
      moduleName="Design Review"
      phase={2}
      icon={ClipboardList}
      description="Conduct peer reviews, sign off on design gates, and approve engineering release packages."
    />
  );
}
