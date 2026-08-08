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
  ShoppingBag,
  DollarSign,
  Package,
  Layers,
  Inbox,
  FileSpreadsheet,
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
    items: [
      { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      {
        title: 'Sourcing (RFx)',
        href: '/sourcing',
        icon: Inbox,
        defaultOpen: true,
        children: [
          { title: 'All RFIs', href: '/sourcing/rfis' },
          { title: 'All RFPs', href: '/sourcing/rfps' },
          { title: 'All RFQs', href: '/dashboard' }, // Links to RFQs dashboard
          { title: 'Upload BOM', href: '/sourcing/upload-bom' },
          { title: 'RFQ Template Library', href: '/sourcing/templates' },
          { title: 'Reverse Bidding', href: '/sourcing/bidding' },
        ],
      },
      {
        title: 'Material Requests',
        href: '/material-requests',
        icon: FileText,
        defaultOpen: true,
        children: [
          { title: 'Forwarded Material Requests', href: '/material-requests/forwarded' },
          { title: 'Forwarded History', href: '/material-requests/history' },
        ],
      },
      {
        title: 'Product & APQP',
        href: '/projects',
        icon: FolderKanban,
        children: [
          { title: 'All Projects', href: '/projects' },
          { title: 'APQP Gate Review', href: '/gates/review' },
          { title: 'Design Review', href: '/design-review' },
          { title: 'Risk Register', href: '/risks' },
          { title: 'Task Management', href: '/tasks' },
        ],
      },
      { title: 'Suppliers', href: '/suppliers', icon: Users },
      { title: 'Budget', href: '/budget', icon: DollarSign },
    ],
  },
  {
    title: 'SUPPORT',
    items: [
      { title: 'Help', href: '/help', icon: HelpCircle },
    ],
  },
];

