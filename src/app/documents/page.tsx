'use client';

import { ModulePlaceholderPage } from '@/components/shared/module-placeholder';
import { FileText } from 'lucide-react';

export default function DocumentsPage() {
  return (
    <ModulePlaceholderPage
      title="Engineering Documents & Specifications"
      moduleName="Documents"
      phase={1}
      icon={FileText}
      description="Centralized vault for CAD specs, DHF documentation, compliance attachments, and revision history."
    />
  );
}
