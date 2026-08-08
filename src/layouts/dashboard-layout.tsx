'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/providers/auth-context';
import { RouteGuard } from '@/components/shared/route-guard';
import { NAVIGATION_SECTIONS, NavItem } from '@/constants/navigation';
import {
  Sun,
  Moon,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
  Search,
  Bell,
  LogOut,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Track open accordion state for items with children
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({
    'Sourcing (RFx)': true,
    'Material Requests': true,
    'Product & APQP': false,
  });

  const menuRef = useRef<HTMLDivElement>(null);
  const isAuthPage = pathname === '/login' || pathname.startsWith('/login');

  useEffect(() => {
    setMounted(true);
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleAccordion = (title: string) => {
    setOpenItems((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setUserMenuOpen(false);
    await logout();
    setIsLoggingOut(false);
  };

  // Clean auth layout for login page
  if (isAuthPage) {
    return <main className="min-h-screen bg-slate-950 text-slate-100">{children}</main>;
  }

  return (
    <RouteGuard>
      <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans antialiased selection:bg-sky-500 selection:text-white">
        {/* Left Dark Navy Sidebar */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-40 w-64 bg-[#090E1A] text-slate-300 border-r border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {/* Netlink Brand Header */}
          <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-800/60 bg-[#070B15]">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center font-black text-lg text-white shadow-md shadow-sky-500/20 shrink-0">
              N
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm tracking-wide text-white uppercase font-sans">
                NETLINK
              </span>
              <span className="text-[10px] font-semibold text-sky-400 tracking-wider uppercase">
                PROCUREMENT & PDM
              </span>
            </div>
          </div>

          {/* Sidebar Nav Items */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 custom-scrollbar">
            {NAVIGATION_SECTIONS.map((section, idx) => (
              <div key={idx} className="space-y-1">
                {section.title && (
                  <h3 className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                    {section.title}
                  </h3>
                )}
                <div className="space-y-0.5">
                  {section.items.map((item: NavItem) => {
                    const Icon = item.icon;
                    const hasChildren = item.children && item.children.length > 0;
                    const isOpen = openItems[item.title];
                    const isParentActive =
                      pathname === item.href ||
                      (hasChildren && item.children?.some((c) => pathname === c.href));

                    return (
                      <div key={item.title} className="space-y-0.5">
                        {hasChildren ? (
                          <button
                            onClick={() => toggleAccordion(item.title)}
                            className={cn(
                              'w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition-all duration-150 group',
                              isParentActive
                                ? 'bg-slate-800/90 text-white shadow-sm'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <Icon className={cn('h-4 w-4 text-slate-400 group-hover:text-slate-200')} />
                              <span>{item.title}</span>
                            </div>
                            <ChevronDown
                              className={cn(
                                'h-3.5 w-3.5 text-slate-400 transition-transform duration-200',
                                isOpen && 'rotate-180 text-sky-400'
                              )}
                            />
                          </button>
                        ) : (
                          <Link
                            href={item.href}
                            onClick={() => setSidebarOpen(false)}
                            className={cn(
                              'flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition-all duration-150 group',
                              pathname === item.href
                                ? 'bg-sky-600 text-white font-bold shadow-md shadow-sky-600/30'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <Icon className="h-4 w-4 text-slate-400 group-hover:text-slate-200" />
                              <span>{item.title}</span>
                            </div>
                          </Link>
                        )}

                        {/* Collapsible Sub-Items */}
                        {hasChildren && isOpen && (
                          <div className="pl-9 pr-2 py-1 space-y-1 border-l-2 border-slate-800/80 ml-4 my-1">
                            {item.children?.map((child) => {
                              const isChildActive = pathname === child.href;
                              return (
                                <Link
                                  key={child.href}
                                  href={child.href}
                                  onClick={() => setSidebarOpen(false)}
                                  className={cn(
                                    'block px-2.5 py-1.5 text-[11px] font-medium rounded-lg transition-all duration-150',
                                    isChildActive
                                      ? 'bg-sky-500/10 text-sky-400 font-bold border border-sky-500/20'
                                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                                  )}
                                >
                                  {child.title}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Footer User Badge */}
          <div className="p-3 border-t border-slate-800/80 bg-[#070B15]">
            <div className="flex items-center justify-between text-xs text-slate-400 px-2 py-1">
              <span className="text-[11px] font-medium text-slate-400">ERPNext Session</span>
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#F4F7FA]">
          {/* Top Bar for Mobile & Profile */}
          <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shadow-xs sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition"
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>

              <div className="relative hidden md:block w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search RFQs, material requests, parts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Notifications */}
              <button className="relative p-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition">
                <Bell className="h-4 w-4" />
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-sky-500 ring-2 ring-white" />
              </button>

              {/* User Profile */}
              {isAuthenticated && user && (
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition"
                  >
                    <div className="h-7 w-7 rounded-lg bg-sky-600 font-bold text-xs text-white flex items-center justify-center">
                      {user.fullName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-semibold text-slate-700 hidden sm:inline">
                      {user.fullName}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden sm:inline" />
                  </button>

                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.12 }}
                        className="absolute right-0 mt-2 w-52 rounded-2xl bg-white border border-slate-200 shadow-xl p-2 z-50 space-y-1 text-slate-800"
                      >
                        <div className="px-3 py-2 border-b border-slate-100">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {user.fullName}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">{user.email}</div>
                        </div>

                        <button
                          onClick={handleLogout}
                          disabled={isLoggingOut}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl text-rose-600 hover:bg-rose-50 transition text-left"
                        >
                          <LogOut className="h-4 w-4 text-rose-500" />
                          <span>Sign Out</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </header>

          {/* Scrollable Page Body */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="max-w-7xl mx-auto space-y-6"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </RouteGuard>
  );
}

