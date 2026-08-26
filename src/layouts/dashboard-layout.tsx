'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/providers/auth-context';
import { RouteGuard } from '@/components/shared/route-guard';
import { NAVIGATION_SECTIONS, NavItem, NavSection, getRoleNavSections } from '@/constants/navigation';
import { NetlinkLogo } from '@/components/common/netlink-logo';
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
  const navSections = getRoleNavSections(user);
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Track open accordion state for items with children
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({
    Projects: true,
    'Gate Management': false,
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
    return <main className="min-h-screen w-screen overflow-y-auto bg-[#0B132B] text-slate-900">{children}</main>;
  }

  return (
    <RouteGuard>
      <div className="h-screen w-screen overflow-hidden bg-[#F7F9FC] text-slate-900 flex font-sans antialiased selection:bg-sky-500 selection:text-white">
        {/* Mobile Backdrop Overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
            />
          )}
        </AnimatePresence>

        {/* Left White Light Sidebar - Permanently Fixed Viewport Height */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 w-64 h-screen max-h-screen bg-white text-slate-700 border-r border-slate-200 flex flex-col shrink-0 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {/* Netlink Brand Header */}
          <div className="h-16 px-5 flex items-center border-b border-slate-200 bg-white shrink-0">
            <NetlinkLogo variant="sidebar" />
          </div>

          {/* Sidebar Nav Items (Scrolls Internally If Items Exceed Viewport) */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 custom-scrollbar">
            {navSections.map((section, idx) => (
              <div key={idx} className="space-y-1">
                {section.title && (
                  <h3 className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
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
                              'w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition-all duration-150 group cursor-pointer',
                              isParentActive
                                ? 'bg-sky-50 text-[#0B74DE] font-bold border border-sky-100 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <Icon className={cn('h-4 w-4 text-slate-400 group-hover:text-slate-600', isParentActive && 'text-[#0B74DE]')} />
                              <span>{item.title}</span>
                            </div>
                            <ChevronDown
                              className={cn(
                                'h-3.5 w-3.5 text-slate-400 transition-transform duration-200',
                                isOpen && 'rotate-180 text-sky-600'
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
                                ? 'bg-[#EAF4FF] text-[#0B74DE] font-bold border border-sky-200/80 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <Icon className={cn('h-4 w-4 text-slate-400 group-hover:text-slate-600', pathname === item.href && 'text-[#0B74DE]')} />
                              <span>{item.title}</span>
                            </div>
                          </Link>
                        )}

                        {/* Collapsible Sub-Items */}
                        {hasChildren && isOpen && (
                          <div className="pl-9 pr-2 py-1 space-y-1 border-l-2 border-slate-200 ml-4 my-1">
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
                                      ? 'bg-[#EAF4FF] text-[#0B74DE] font-bold border border-sky-200/80'
                                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
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
          <div className="p-3 border-t border-slate-200 bg-slate-50/70 shrink-0">
            <div className="flex items-center justify-between text-xs text-slate-500 px-2 py-1">
              <span className="text-[11px] font-medium text-slate-600">
                PDM Session ({user?.roleLabel || 'Active'})
              </span>
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
            </div>
          </div>
        </aside>

        {/* Right Main Content Area - Scrollable Container */}
        <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden bg-[#F7F9FC]">
          {/* Top Bar for Mobile & Profile - Fixed at Top */}
          <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shadow-xs shrink-0 z-30">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                aria-label="Toggle navigation menu"
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>

              <div className="lg:hidden flex items-center">
                <NetlinkLogo variant="sidebar" />
              </div>

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
              <button className="relative p-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition cursor-pointer">
                <Bell className="h-4 w-4" />
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-sky-500 ring-2 ring-white" />
              </button>

              {/* User Profile */}
              {isAuthenticated && user && (
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition cursor-pointer"
                  >
                    <div className="h-7 w-7 rounded-lg bg-sky-600 font-bold text-xs text-white flex items-center justify-center">
                      {user.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col text-left hidden sm:flex">
                      <span className="text-xs font-semibold text-slate-800 leading-tight">
                        {user.fullName}
                      </span>
                      <span className="text-[10px] text-sky-600 font-bold leading-none">
                        {user.roleLabel}
                      </span>
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden sm:inline" />
                  </button>

                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.12 }}
                        className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-slate-200 shadow-xl p-2 z-50 space-y-1 text-slate-800"
                      >
                        <div className="px-3 py-2 border-b border-slate-100 space-y-0.5">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {user.fullName}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">{user.email}</div>
                          <div className="pt-1">
                            <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-md bg-sky-100 text-sky-800 border border-sky-200">
                              Role: {user.roleLabel}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={handleLogout}
                          disabled={isLoggingOut}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl text-rose-600 hover:bg-rose-50 transition text-left cursor-pointer"
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

          {/* Dedicated Scrollable Main Content Container */}
          <main className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8">
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
