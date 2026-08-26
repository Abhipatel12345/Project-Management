'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/providers/auth-context';
import { accessControlService, getRoleLandingPage } from '@/services/access-control.service';
import {
  FolderKanban,
  CalendarDays,
  ShieldCheck,
  Boxes,
  Eye,
  EyeOff,
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { NetlinkLogo } from '@/components/common/netlink-logo';
import { cn } from '@/utils/cn';

const loginSchema = z.object({
  usr: z.string().min(1, 'Username or Email is required'),
  pwd: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function GoogleIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}

function MicrosoftIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fill="#F25022" d="M1 1h10v10H1z" />
      <path fill="#00A4EF" d="M1 12h10v10H1z" />
      <path fill="#7FBA00" d="M12 1h10v10H12z" />
      <path fill="#FFB900" d="M12 12h10v10H12z" />
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, login, isAuthenticated } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      const redirectQuery = searchParams.get('redirect');
      let targetPath = getRoleLandingPage(user.role);

      // If a redirect was requested, verify if this specific user role is authorized for it!
      if (redirectQuery && redirectQuery !== '/login' && redirectQuery !== '/') {
        const canAccess = accessControlService.canAccessPage(user, redirectQuery).allowed;
        if (canAccess) {
          targetPath = redirectQuery;
        }
      }

      router.push(targetPath);
    }

    if (searchParams.get('session_expired') === 'true') {
      setErrorMessage('Your ERPNext session has expired. Please log in again.');
    } else if (searchParams.get('logout') === 'success') {
      setInfoMessage('You have been successfully logged out.');
    }
  }, [isAuthenticated, user, searchParams, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      usr: '',
      pwd: '',
      rememberMe: true,
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setErrorMessage(null);
    setInfoMessage(null);
    setIsSubmitting(true);
    try {
      await login({
        usr: values.usr,
        pwd: values.pwd,
      });
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Invalid username or password. Please verify your ERPNext credentials.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#0B132B] font-sans antialiased selection:bg-sky-500 selection:text-white">
      {/* ========================================================================= */}
      {/* LEFT COLUMN: Enterprise Visual Showcase (55-60% width on Desktop)        */}
      {/* ========================================================================= */}
      <div className="relative w-full lg:w-7/12 xl:w-3/5 bg-gradient-to-br from-[#0B132B] via-[#111E38] to-[#0A1128] p-8 sm:p-12 lg:p-14 xl:p-16 flex flex-col justify-between overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-800">
        {/* Subtle Engineering Grid and Glowing Orbs */}
        <div className="absolute inset-0 bg-[radial-gradient(#1E3A8A_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Branding */}
        <div className="relative z-10">
          <NetlinkLogo variant="login-hero" />
        </div>

        {/* Hero Section & Feature Cards */}
        <div className="relative z-10 my-10 lg:my-0 space-y-8 max-w-2xl">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-sky-500/10 border border-sky-400/25 text-sky-300 text-xs font-bold uppercase tracking-wider shadow-xs backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-sky-400" />
              <span>ENTERPRISE PROJECT MANAGEMENT</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.15]">
              Project Management <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-blue-300 to-indigo-200">
                for Engineering Excellence
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
              Plan, execute, govern, and deliver complex engineering programs from a unified project
              management platform.
            </p>
          </div>

          {/* 3 Feature Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:border-sky-500/30 backdrop-blur-md transition space-y-2">
              <div className="h-8 w-8 rounded-xl bg-sky-500/15 border border-sky-400/20 flex items-center justify-center text-sky-400">
                <CalendarDays className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-bold text-white tracking-wide">Project Planning</h3>
              <p className="text-[11px] text-slate-400 leading-normal">
                Multi-level WBS, dynamic Gantt tracking, and critical path milestones.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:border-indigo-500/30 backdrop-blur-md transition space-y-2">
              <div className="h-8 w-8 rounded-xl bg-indigo-500/15 border border-indigo-400/20 flex items-center justify-center text-indigo-400">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-bold text-white tracking-wide">Engineering Governance</h3>
              <p className="text-[11px] text-slate-400 leading-normal">
                Stage-gate sign-offs, formal design reviews, and compliance workflows.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:border-teal-500/30 backdrop-blur-md transition space-y-2">
              <div className="h-8 w-8 rounded-xl bg-teal-500/15 border border-teal-400/20 flex items-center justify-center text-teal-400">
                <Boxes className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-bold text-white tracking-wide">Lifecycle Management</h3>
              <p className="text-[11px] text-slate-400 leading-normal">
                End-to-end BOM tracking, ERPNext material requests, and auditability.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Left Footer Status */}
        <div className="relative z-10 pt-4 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>ERPNext Enterprise Integration Active</span>
          </div>
          <span className="font-mono text-[11px] text-slate-500">v2.4 Enterprise</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT COLUMN: Modern White Login Card (40-45% width on Desktop)          */}
      {/* ========================================================================= */}
      <div className="w-full lg:w-5/12 xl:w-2/5 bg-[#F8FAFC] flex flex-col justify-center items-center p-6 sm:p-10 lg:p-10 xl:p-12 overflow-y-auto min-h-screen text-slate-800">
        <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl p-7 sm:p-9 shadow-xl shadow-slate-200/60 space-y-6">
          {/* Right Panel Header */}
          <div className="space-y-1.5 text-center sm:text-left">
            <div className="flex justify-center sm:justify-start">
              <NetlinkLogo variant="login-card" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 pt-2">
              Welcome back
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Sign in to your project management workspace
            </p>
          </div>

          {/* Info Banner */}
          {infoMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <div className="flex-1 font-medium">{infoMessage}</div>
            </div>
          )}

          {/* Error Callout */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Username / Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Username / Email</span>
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  {...register('usr')}
                  type="text"
                  placeholder="administrator@company.com"
                  className={cn(
                    'w-full pl-10 pr-4 py-2.5 text-xs font-medium bg-slate-50 border rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 transition',
                    errors.usr
                      ? 'border-rose-300 focus:ring-rose-500'
                      : 'border-slate-200 focus:border-sky-500 focus:ring-sky-500/20'
                  )}
                />
              </div>
              {errors.usr && (
                <p className="text-[11px] text-rose-600 font-bold">{errors.usr.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Password</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  {...register('pwd')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  className={cn(
                    'w-full pl-10 pr-10 py-2.5 text-xs font-medium bg-slate-50 border rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 transition',
                    errors.pwd
                      ? 'border-rose-300 focus:ring-rose-500'
                      : 'border-slate-200 focus:border-sky-500 focus:ring-sky-500/20'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.pwd && (
                <p className="text-[11px] text-rose-600 font-bold">{errors.pwd.message}</p>
              )}
            </div>

            {/* Remember Session & ERPNext Help */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600 hover:text-slate-900 font-medium">
                <input
                  {...register('rememberMe')}
                  type="checkbox"
                  className="rounded border-slate-300 bg-white text-sky-600 focus:ring-sky-500/20 cursor-pointer"
                />
                <span>Remember session</span>
              </label>
              <a
                href="http://80.225.204.210:8083"
                target="_blank"
                rel="noreferrer"
                className="text-sky-600 hover:text-sky-700 hover:underline font-bold"
              >
                ERPNext Help
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 mt-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In →</span>
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-slate-400 font-bold text-[10px] tracking-wider">
                  OR
                </span>
              </div>
            </div>

            {/* Google & Microsoft SSO Buttons (UI-Only Placeholders) */}
            <div className="space-y-2">
              <button
                type="button"
                className="w-full py-2.5 px-4 text-xs font-bold rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 transition shadow-2xs flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <GoogleIcon className="h-4 w-4 shrink-0" />
                <span>Continue with Google</span>
              </button>

              <button
                type="button"
                className="w-full py-2.5 px-4 text-xs font-bold rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 transition shadow-2xs flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <MicrosoftIcon className="h-4 w-4 shrink-0" />
                <span>Continue with Microsoft</span>
              </button>
            </div>
          </form>

          {/* Security Footer */}
          <div className="pt-3 border-t border-slate-100 text-center flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Enterprise-grade security • Secure Project Management Access</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0B132B] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
