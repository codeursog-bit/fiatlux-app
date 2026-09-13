'use client';

import * as React from 'react';
import { Sidebar } from './sidebar';
import { Navbar } from './navbar';
import { motion, AnimatePresence } from 'motion/react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function DashboardLayout({ children, fullWidth = false }: { children: React.ReactNode, fullWidth?: boolean }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-slate-50 font-sans">
      <Navbar onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
      
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm"
            />
          )}
        </AnimatePresence>

        {/* Sidebar Container */}
        <div className={cn(
          "fixed inset-y-0 left-0 z-50 lg:static lg:block transition-transform duration-300 ease-in-out",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}>
          <Sidebar onLinkClick={() => setIsSidebarOpen(false)} />
        </div>
        
        <main className="flex-1 overflow-y-auto bg-[#F8FAFC]">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ 
                duration: 0.25,
                ease: [0.22, 1, 0.36, 1] 
              }}
              className={cn(fullWidth ? "" : "p-4 md:p-6")}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
