'use client';

import { ModulePlaceholderPage } from '@/components/shared/module-placeholder';
import { Bell } from 'lucide-react';

export default function NotificationsPage() {
  return (
    <ModulePlaceholderPage
      title="Notifications & System Alerts"
      moduleName="Notifications"
      phase={2}
      icon={Bell}
      description="Real-time alerts for gate reviews, task assignments, document releases, and milestone deadlines."
    />
  );
}
