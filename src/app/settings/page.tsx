'use client';

import { ModulePlaceholderPage } from '@/components/shared/module-placeholder';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  return (
    <ModulePlaceholderPage
      title="System Settings & ERPNext Integration"
      moduleName="Settings"
      phase={3}
      icon={Settings}
      description="Configure ERPNext REST API endpoints, API keys, role permissions, theme preferences, and system logs."
    />
  );
}
