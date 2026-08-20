export interface NotificationItem {
  id: string;
  timestamp: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'alert';
  read: boolean;
  link?: string;
  targetRole?: string;
}

const STORAGE_KEY = 'pdm_notifications_v2';

function getInitialNotifications(): NotificationItem[] {
  return [
    {
      id: 'NOTIF-001',
      timestamp: '2026-02-20T10:30:00.000Z',
      title: 'Material Issued from Warehouse',
      message: '15 units of HV Cooling Plate Prototype Housing issued for PROJ-0001.',
      type: 'success',
      read: false,
      link: '/warehouse',
      targetRole: 'projectmanager',
    },
    {
      id: 'NOTIF-002',
      timestamp: '2026-02-20T09:15:00.000Z',
      title: 'New Task Assigned',
      message: 'You have been assigned to task: Perform Radar Module Sensor Calibration.',
      type: 'info',
      read: false,
      link: '/tasks',
      targetRole: 'teammember',
    },
    {
      id: 'NOTIF-003',
      timestamp: '2026-02-19T16:00:00.000Z',
      title: 'Gate Submitted for Board Review',
      message: 'Gate 1: Door Handle Concept Charter submitted for final approval.',
      type: 'warning',
      read: false,
      link: '/gates/review',
      targetRole: 'gate_reviewer',
    },
  ];
}

export const notificationService = {
  getNotifications(): NotificationItem[] {
    if (typeof window === 'undefined') return getInitialNotifications();
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      const initial = getInitialNotifications();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    try {
      return JSON.parse(stored);
    } catch {
      return getInitialNotifications();
    }
  },

  addNotification(
    title: string,
    message: string,
    type: NotificationItem['type'] = 'info',
    targetRole?: string,
    link?: string
  ): NotificationItem {
    const list = this.getNotifications();
    const newNotif: NotificationItem = {
      id: `NOTIF-${String(list.length + 1).padStart(3, '0')}`,
      timestamp: new Date().toISOString(),
      title,
      message,
      type,
      read: false,
      link,
      targetRole,
    };
    const updated = [newNotif, ...list];
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
    return newNotif;
  },

  markAllAsRead(): void {
    const list = this.getNotifications();
    const updated = list.map((n) => ({ ...n, read: true }));
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  },
};
