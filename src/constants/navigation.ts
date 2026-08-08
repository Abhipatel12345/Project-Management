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
  ShieldAlert,
  Bell,
  Workflow,
  Rocket,
  Target,
  BarChart3,
  PieChart,
  Settings,
  HelpCircle,
  Activity,
} from 'lucide-react';

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
    title: 'PHASE 1: PRODUCT EXECUTION',
    items: [
      { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
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
      { title: 'Planning & Gantt', href: '/planning', icon: CalendarDays },
      { title: 'Open Issues', href: '/issues', icon: AlertTriangle },
      { title: 'Documents', href: '/documents', icon: FileText },
    ],
  },
  {
    title: 'PHASE 2: GOVERNANCE & QUALITY',
    items: [
      { title: 'Design Review', href: '/design-review', icon: ClipboardList },
      {
        title: 'Gate Management',
        href: '/gates',
        icon: Lock,
        children: [
          { title: 'Gate Criteria', href: '/gates' },
          { title: 'Gate Review', href: '/gates/review' },
        ],
      },
      { title: 'Risk Register & FMEA', href: '/risks', icon: ShieldAlert },
      { title: 'Notifications', href: '/notifications', icon: Bell },
      { title: 'Workflow Status', href: '/workflows', icon: Workflow },
    ],
  },
  {
    title: 'PHASE 3: LAUNCH & INTELLIGENCE',
    items: [
      { title: 'Flawless Launch', href: '/launch', icon: Rocket },
      { title: 'Imperative Scorecard', href: '/scorecard', icon: Target },
      { title: 'Reports & Analytics', href: '/reports', icon: BarChart3 },
      { title: 'Executive Dashboard', href: '/executive', icon: PieChart },
      { title: 'Connection Test', href: '/connection-test', icon: Activity },
      { title: 'Settings', href: '/settings', icon: Settings },
    ],
  },
  {
    title: 'SUPPORT',
    items: [
      { title: 'Help & Docs', href: '/help', icon: HelpCircle },
    ],
  },
];


