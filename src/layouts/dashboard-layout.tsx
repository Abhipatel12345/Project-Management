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
  Car,
  ChevronRight,
  ShieldCheck,
  Search,
  Bell,
  User,
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

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setUserMenuOpen(false);
    await logout();
    setIsLoggingOut(false);
  };

  // If on login page, render clean auth wrapper without topbar/sidebar
  if (isAuthPage) {
    return <main className="min-h-screen bg-slate-950 text-slate-100">{children}</main>;
  }

  return (
    <RouteGuard>
      <div className="min-h-screen bg-slate-950 text-slate-100 dark:bg-slate-950 dark:text-slate-100 flex flex-col font-sans antialiased selection:bg-cyan-500 selection:text-white">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-40 h-16 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
              aria-label="Toggle Navigation"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform duration-200">
                <Car className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="font-semibold text-base tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  AUTO-PDM
                </span>
                <span className="ml-2 px-1.5 py-0.5 text-[10px] font-medium tracking-wider uppercase rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Enterprise
                </span>
              </div>
            </Link>
          </div>

          {/* Global Search & Actions */}
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search programs, gates, tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-sm bg-slate-900/90 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition"
              />
            </div>

            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Toggle Theme"
            >
              {!mounted ? (
                <Sun className="h-4 w-4 text-amber-400 opacity-50" />
              ) : theme === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-cyan-400" />
              )}
            </button>

            {/* Notifications */}
            <button
              className="relative p-2 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-cyan-400 ring-2 ring-slate-950" />
            </button>

            {/* Logged-In User Profile Menu */}
            {isAuthenticated && user ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2.5 p-1.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800/80 transition"
                >
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-xs text-white shadow-sm">
                    {user.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:block text-left pr-1">
                    <div className="text-xs font-semibold text-slate-200 max-w-[120px] truncate">
                      {user.fullName}
                    </div>
                    <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" /> Active Session
                    </div>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden sm:block" />
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.12 }}
                      className="absolute right-0 mt-2 w-56 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50 space-y-1"
                    >
                      <div className="px-3 py-2 border-b border-slate-800/80">
                        <div className="text-xs font-bold text-white truncate">{user.fullName}</div>
                        <div className="text-[11px] text-slate-400 truncate">{user.email}</div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {user.roles.slice(0, 2).map((role) => (
                            <span
                              key={role}
                              className="px-1.5 py-0.5 rounded text-[9px] bg-slate-800 text-slate-300 border border-slate-700"
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition text-left disabled:opacity-50"
                      >
                        {isLoggingOut ? (
                          <Loader2 className="h-4 w-4 animate-spin text-rose-400" />
                        ) : (
                          <LogOut className="h-4 w-4 text-rose-400" />
                        )}
                        <span>{isLoggingOut ? 'Signing Out...' : 'Sign Out of ERPNext'}</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                href="/login"
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition"
              >
                Sign In
              </Link>
            )}
          </div>
        </header>

        {/* Main Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <aside
            className={cn(
              'fixed inset-y-0 left-0 z-30 w-64 bg-slate-950/95 border-r border-slate-800/80 pt-16 flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 lg:pt-0',
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            )}
          >
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 custom-scrollbar">
              {NAVIGATION_SECTIONS.map((section) => (
                <div key={section.title} className="space-y-1">
                  <h3 className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {section.title}
                  </h3>
                  <div className="mt-2 space-y-0.5">
                    {section.items.map((item: NavItem) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setSidebarOpen(false)}
                          className={cn(
                            'flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-all duration-150 group',
                            isActive
                              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-sm shadow-cyan-500/5'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon
                              className={cn(
                                'h-4 w-4 transition-colors',
                                isActive
                                  ? 'text-cyan-400'
                                  : 'text-slate-500 group-hover:text-slate-300'
                              )}
                            />
                            <span>{item.title}</span>
                          </div>
                          {isActive && (
                            <ChevronRight className="h-3.5 w-3.5 text-cyan-400" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-800/80 bg-slate-950/60">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span>ERPNext Engine</span>
                  <span className="text-emerald-400 font-mono text-[10px]">v15 REST</span>
                </div>
                <p className="text-[11px] text-slate-500">Active Authenticated Session</p>
              </div>
            </div>
          </aside>

          {/* Content Container */}
          <main className="flex-1 overflow-y-auto bg-slate-950 p-4 sm:p-6 lg:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
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
