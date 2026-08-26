import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  Users,
  CheckSquare,
  CalendarDays,
  AlertTriangle,
  FileCheck,
  Award,
  Lock,
  ClipboardList,
  Settings,
  HelpCircle,
  Activity,
  Boxes,
} from 'lucide-react';
import { PDMUserSession } from '@/types/auth.types';
import { accessControlService } from '@/services/access-control.service';

export interface NavChildItem {
  title: string;
  href: string;
  badge?: string;
}

export interface NavItem {
  title: string;
  href: string;
  icon: any;
  phase?: number;
  badge?: string;
  children?: NavChildItem[];
  defaultOpen?: boolean;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export const NAVIGATION_SECTIONS: NavSection[] = [
  {
    title: 'PRODUCT EXECUTION',
    items: [
      { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { title: 'Users', href: '/users', icon: Users },
      {
        title: 'Projects',
        href: '/projects',
        icon: FolderKanban,
        defaultOpen: true,
        children: [
          { title: 'All Projects', href: '/projects' },
          { title: 'Project Details', href: '/projects/detail' },
          { title: 'Project Charter', href: '/projects/charter' },
          { title: 'Team Allocation', href: '/projects/team' },
        ],
      },
      { title: 'Task Management', href: '/tasks', icon: CheckSquare },
      { title: 'Warehouse & Materials', href: '/warehouse', icon: Boxes },
      { title: 'Planning & Gantt', href: '/planning', icon: CalendarDays },
      { title: 'Open Issues', href: '/issues', icon: AlertTriangle },
      { title: 'Documents', href: '/documents', icon: FileText },
    ],
  },
  {
    title: 'GOVERNANCE & QUALITY',
    items: [
      { title: 'Design Review', href: '/design-review', icon: ClipboardList },
      {
        title: 'Gate Management',
        href: '/gates',
        icon: Lock,
        children: [
          { title: 'Gate Criteria', href: '/gates' },
          { title: 'Gate Review Board', href: '/gates/review' },
        ],
      },
    ],
  },
  {
    title: 'LAUNCH & INTELLIGENCE',
    items: [
      { title: 'Connection Test', href: '/connection-test', icon: Activity },
      { title: 'Settings', href: '/settings', icon: Settings },
    ],
  },
];

/**
 * Dynamically filter navigation sections based on active user's ERPNext role permissions
 */
export function getRoleNavSections(user: PDMUserSession | null): NavSection[] {
  if (!user) return NAVIGATION_SECTIONS;

  const result: NavSection[] = [];

  for (const section of NAVIGATION_SECTIONS) {
    const validItems: NavItem[] = [];

    for (const item of section.items) {
      const canAccessMain = accessControlService.canAccessPage(user, item.href).allowed;
      let filteredChildren: NavChildItem[] | undefined = undefined;

      if (item.children) {
        filteredChildren = item.children.filter(
          (c) => accessControlService.canAccessPage(user, c.href).allowed
        );
      }

      if (canAccessMain || (filteredChildren && filteredChildren.length > 0)) {
        validItems.push({
          ...item,
          children: filteredChildren,
        });
      }
    }

    if (validItems.length > 0) {
      result.push({
        title: section.title,
        items: validItems,
      });
    }
  }

  return result;
}
