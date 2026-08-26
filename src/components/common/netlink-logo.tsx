import React from 'react';
import Image from 'next/image';
import { cn } from '@/utils/cn';

interface NetlinkLogoProps {
  className?: string;
  variant?: 'sidebar' | 'login-hero' | 'login-card' | 'compact' | 'icon';
  showSubtitle?: boolean;
}

export function NetlinkLogo({
  className,
  variant = 'sidebar',
  showSubtitle = true,
}: NetlinkLogoProps) {
  if (variant === 'icon') {
    return (
      <div className={cn('relative flex items-center justify-center shrink-0', className)}>
        <Image
          src="/netlink-logo.png"
          alt="Netlink Logo"
          width={36}
          height={36}
          className="h-8 w-auto object-contain"
          priority
        />
      </div>
    );
  }

  if (variant === 'login-hero') {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <div className="h-11 w-11 rounded-2xl bg-white p-1.5 flex items-center justify-center shadow-lg shadow-sky-500/10 border border-white/20 shrink-0">
          <Image
            src="/netlink-logo.png"
            alt="Netlink Logo"
            width={44}
            height={44}
            className="h-full w-auto object-contain"
            priority
          />
        </div>
        <div>
          <div className="text-xs font-black tracking-widest text-sky-400 uppercase leading-tight">
            NETLINK
          </div>
          <div className="text-sm font-bold text-white tracking-wide leading-tight">
            PROJECT MANAGEMENT
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'login-card') {
    return (
      <div className={cn('flex items-center gap-2.5', className)}>
        <div className="h-9 w-9 rounded-xl bg-white p-1 flex items-center justify-center shadow-2xs border border-slate-200 shrink-0">
          <Image
            src="/netlink-logo.png"
            alt="Netlink Logo"
            width={36}
            height={36}
            className="h-full w-auto object-contain"
            priority
          />
        </div>
        <div>
          <div className="text-[10px] font-black tracking-widest text-sky-600 uppercase leading-none">
            NETLINK
          </div>
          <div className="text-[11px] font-bold text-slate-500 tracking-wider uppercase leading-none mt-0.5">
            PROJECT MANAGEMENT
          </div>
        </div>
      </div>
    );
  }

  // Default 'sidebar' variant
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="h-9 w-9 rounded-xl bg-white p-1 flex items-center justify-center border border-slate-200 shadow-2xs shrink-0 overflow-hidden">
        <Image
          src="/netlink-logo.png"
          alt="Netlink Logo"
          width={36}
          height={36}
          className="h-full w-auto object-contain"
          priority
        />
      </div>
      <div className="flex flex-col">
        <span className="font-extrabold text-sm tracking-wide text-slate-900 uppercase font-sans leading-none">
          NETLINK
        </span>
        {showSubtitle && (
          <span className="text-[9px] font-bold text-[#0B74DE] tracking-wider uppercase mt-0.5 leading-none">
            PROJECT MANAGEMENT
          </span>
        )}
      </div>
    </div>
  );
}
