'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/providers/auth-context';
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
  const { login, isAuthenticated } = useAuth();
  
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      const redirectPath = searchParams.get('redirect') || '/dashboard';
      router.push(redirectPath);
    }

    if (searchParams.get('session_expired') === 'true') {
      setErrorMessage('Your ERPNext session has expired. Please log in again.');
    } else if (searchParams.get('logout') === 'success') {
      setInfoMessage('You have been successfully logged out.');
    }
  }, [isAuthenticated, searchParams, router]);

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
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Decorative Gradients */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800/90 rounded-2xl p-8 shadow-2xl backdrop-blur-xl relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 items-center justify-center shadow-lg shadow-cyan-500/20 mb-2">
            <Car className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Automotive PDM Platform</h1>
          <p className="text-xs text-slate-400">
            Enterprise Gateway into ERPNext Product Lifecycle Management
          </p>
        </div>

        {/* Info Banner */}
        {infoMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <div className="flex-1">{infoMessage}</div>
          </div>
        )}

        {/* Error Callout */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMessage}</div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Username Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Username / Email</span>
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                {...register('usr')}
                type="text"
                placeholder="administrator@company.com"
                className={cn(
                  'w-full pl-10 pr-4 py-2.5 text-sm bg-slate-950/80 border rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 transition',
                  errors.usr
                    ? 'border-rose-500/60 focus:ring-rose-500'
                    : 'border-slate-800 focus:border-cyan-500/60 focus:ring-cyan-500/30'
                )}
              />
            </div>
            {errors.usr && (
              <p className="text-[11px] text-rose-400 font-medium">{errors.usr.message}</p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Password</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                {...register('pwd')}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                className={cn(
                  'w-full pl-10 pr-10 py-2.5 text-sm bg-slate-950/80 border rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 transition',
                  errors.pwd
                    ? 'border-rose-500/60 focus:ring-rose-500'
                    : 'border-slate-800 focus:border-cyan-500/60 focus:ring-cyan-500/30'
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.pwd && (
              <p className="text-[11px] text-rose-400 font-medium">{errors.pwd.message}</p>
            )}
          </div>

          {/* Remember Me */}
          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-200">
              <input
                {...register('rememberMe')}
                type="checkbox"
                className="rounded border-slate-800 bg-slate-950 text-cyan-500 focus:ring-cyan-500/20"
              />
              <span>Remember session</span>
            </label>
            <a href="#forgot" className="text-cyan-400 hover:underline">
              ERPNext Help
            </a>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 text-sm font-semibold rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                <span>Authenticating with ERPNext...</span>
              </>
            ) : (
              <>
                <span>Sign In to PDM</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Security Badge */}
        <div className="pt-4 border-t border-slate-800/80 text-center flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>Secured via ERPNext REST Session & Cookies</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
