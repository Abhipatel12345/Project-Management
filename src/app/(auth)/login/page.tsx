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
  Car,
  Eye,
  EyeOff,
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { cn } from '@/utils/cn';

const loginSchema = z.object({
  usr: z.string().min(1, 'Username or Email is required'),
  pwd: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

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
    <div className="min-h-screen bg-[#F7F9FC] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans text-slate-800">
      {/* Background Decorative Gradients */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-sky-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8 shadow-xl relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 rounded-2xl bg-sky-600 items-center justify-center shadow-xs mb-2 text-white">
            <Car className="h-6 w-6" />
          </div>
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-sky-600 uppercase tracking-widest">
            <span>NETLINK AUTOMOTIVE PDM</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Enterprise Gateway</h1>
          <p className="text-xs text-slate-500 font-medium">
            Sign in to access ERPNext Product Development & Lifecycle Management
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
          {/* Username Field */}
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

          {/* Remember Me */}
          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-slate-600 hover:text-slate-900 font-medium">
              <input
                {...register('rememberMe')}
                type="checkbox"
                className="rounded border-slate-300 bg-white text-sky-600 focus:ring-sky-500/20"
              />
              <span>Remember session</span>
            </label>
            <a href="#forgot" className="text-sky-600 hover:underline font-bold">
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
                <span>Authenticating PDM Session...</span>
              </>
            ) : (
              <>
                <span>Sign In to PDM</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Role Fill Buttons for Easy Executive Demo Testing */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center">
            Executive Demo Quick Test Roles
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-[10px]">
            <button
              type="button"
              onClick={() => {
                onSubmit({ usr: 'it_admin', pwd: 'password' });
              }}
              className="py-1.5 px-1.5 rounded-lg bg-slate-50 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200 border border-slate-200 text-slate-700 font-semibold transition text-center truncate cursor-pointer"
              title="IT Admin — User Management"
            >
              1. IT Admin
            </button>
            <button
              type="button"
              onClick={() => {
                onSubmit({ usr: 'Administrator', pwd: 'password' });
              }}
              className="py-1.5 px-1.5 rounded-lg bg-slate-50 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200 border border-slate-200 text-slate-700 font-semibold transition text-center truncate cursor-pointer"
              title="PMO Admin — Full Access"
            >
              2. Administrator
            </button>
            <button
              type="button"
              onClick={() => {
                onSubmit({ usr: 'sarahjenkins@gmail.com', pwd: 'password' });
              }}
              className="py-1.5 px-1.5 rounded-lg bg-slate-50 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200 border border-slate-200 text-slate-700 font-semibold transition text-center truncate cursor-pointer"
              title="Project Manager (Sarah Jenkins) — Full PM Visibility"
            >
              3. Sarah Jenkins
            </button>
            <button
              type="button"
              onClick={() => {
                onSubmit({ usr: 'teammember@netlink.com', pwd: 'password' });
              }}
              className="py-1.5 px-1.5 rounded-lg bg-slate-50 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200 border border-slate-200 text-slate-700 font-semibold transition text-center truncate cursor-pointer"
              title="Team Member (Yash) — Execution & My Tasks"
            >
              4. Yash
            </button>
            <button
              type="button"
              onClick={() => {
                onSubmit({ usr: 'warehouse_user', pwd: 'password' });
              }}
              className="py-1.5 px-1.5 rounded-lg bg-slate-50 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200 border border-slate-200 text-slate-700 font-semibold transition text-center truncate cursor-pointer"
              title="Warehouse — Reserve & Issue Materials"
            >
              5. Warehouse
            </button>
            <button
              type="button"
              onClick={() => {
                onSubmit({ usr: 'gatereviewer@netlink.com', pwd: 'password' });
              }}
              className="py-1.5 px-1.5 rounded-lg bg-slate-50 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200 border border-slate-200 text-slate-700 font-semibold transition text-center truncate cursor-pointer"
              title="Gate Reviewer — Board Approval"
            >
              6. Gate Reviewer
            </button>
          </div>
        </div>

        {/* Footer Security Badge */}
        <div className="pt-2 border-t border-slate-100 text-center flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>Isolated PDM Session & Independent Cookie Architecture</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

