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
} from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  icon: any;
  phase: number;
  badge?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAVIGATION_SECTIONS: NavSection[] = [
  {
    title: 'Phase 1: Product Execution',
    items: [
      { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, phase: 1 },
      { title: 'Projects', href: '/projects', icon: FolderKanban, phase: 1 },
      { title: 'Project Details', href: '/projects/detail', icon: FileText, phase: 1 },
      { title: 'Project Charter', href: '/projects/charter', icon: FileCheck, phase: 1 },
      { title: 'Task Management', href: '/tasks', icon: CheckSquare, phase: 1 },
      { title: 'Planning & Gantt', href: '/planning', icon: CalendarDays, phase: 1 },
      { title: 'Open Issues', href: '/issues', icon: AlertTriangle, phase: 1 },
      { title: 'Documents', href: '/documents', icon: FileText, phase: 1 },
    ],
  },
  {
    title: 'Phase 2: Governance & Quality',
    items: [
      { title: 'Design Review', href: '/design-review', icon: ClipboardList, phase: 2 },
      { title: 'Gate Management', href: '/gates', icon: Lock, phase: 2 },
      { title: 'Gate Review', href: '/gates/review', icon: Award, phase: 2 },
      { title: 'Risk Register', href: '/risks', icon: ShieldAlert, phase: 2 },
      { title: 'Notifications', href: '/notifications', icon: Bell, phase: 2 },
      { title: 'Workflow Status', href: '/workflows', icon: Workflow, phase: 2 },
    ],
  },
  {
    title: 'Phase 3: Launch & Intelligence',
    items: [
      { title: 'Flawless Launch', href: '/launch', icon: Rocket, phase: 3 },
      { title: 'Imperative Scorecard', href: '/scorecard', icon: Target, phase: 3 },
      { title: 'Reports & Analytics', href: '/reports', icon: BarChart3, phase: 3 },
      { title: 'Executive Dashboard', href: '/executive', icon: PieChart, phase: 3 },
      { title: 'Settings', href: '/settings', icon: Settings, phase: 3 },
    ],
  },
];
