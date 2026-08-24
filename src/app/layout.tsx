import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/providers/app-provider';
import { DashboardLayout } from '@/layouts/dashboard-layout';

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
});

const mono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Automotive Product Development Management System (PDM)',
  description:
    'Enterprise Automotive PDM Platform with Gate Reviews, APQP Workflows, and ERPNext Integration',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${mono.variable} h-full`}>
      <body className="font-sans antialiased bg-[#F7F9FC] text-slate-900 h-full overflow-hidden selection:bg-sky-500 selection:text-white">
        <AppProvider>
          <DashboardLayout>{children}</DashboardLayout>
        </AppProvider>
      </body>
    </html>
  );
}
