import type { Metadata } from 'next';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { QueryProvider } from '@/components/providers/query-provider';
import './globals.css';

import { Toaster } from 'sonner';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'FIATLUX | Logistique Express',
  description: 'Plateforme de gestion de livraison urbaine rapide et fiable.',
  manifest: '/manifest.json',
  themeColor: '#003366',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'FiatLux',
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={cn("font-sans", geist.variable)}>
      <body suppressHydrationWarning className="antialiased min-h-screen bg-slate-50">
        <QueryProvider>
          {children}
          <Toaster position="top-center" richColors />
        </QueryProvider>
      </body>
    </html>
  );
}
