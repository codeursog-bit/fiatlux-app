'use client';

import Link from 'next/link';
import { Plus, UserPlus, FileText, MapPinned } from 'lucide-react';
import { cn } from '@/lib/utils';

const ACTIONS = [
  { icon: Plus, label: 'Livraison', color: 'bg-blue-50 text-blue-600', href: '/orders' },
  { icon: UserPlus, label: 'Livreur', color: 'bg-emerald-50 text-success', href: '/riders' },
  { icon: FileText, label: 'Rapport', color: 'bg-amber-50 text-amber-600', href: '/reports' },
  { icon: MapPinned, label: 'Repères', color: 'bg-slate-100 text-slate-600', href: '/reperes' },
];

export function QuickActions() {
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
      <div className="px-4 py-3 border-b border-slate-200">
        <h2 className="text-sm font-bold text-slate-900">Actions rapides</h2>
      </div>
      <div className="p-3 grid grid-cols-2 xl:grid-cols-4 gap-2">
        {ACTIONS.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="flex flex-col items-center justify-center p-2 rounded border border-slate-100 hover:bg-slate-50 transition-all group"
          >
            <div className={cn("h-8 w-8 rounded-full flex items-center justify-center mb-1.5 transition-transform group-hover:scale-110", action.color)}>
              <action.icon className="h-4 w-4" />
            </div>
            <span className="text-[10px] font-bold text-slate-700">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}