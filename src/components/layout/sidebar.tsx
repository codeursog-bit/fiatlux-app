'use client';

import { 
  LayoutDashboard, 
  Package, 
  Users, 
  Map as MapIcon,
  UserCircle,
  Wallet,
  Truck,
  BarChart3,
  AlertTriangle,
  Settings,
  Building2,
  MessageCircle,
  MapPinned,
  ShieldAlert
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard, primary: true },
  { name: 'Commandes', href: '/orders', icon: Package },
  { name: 'Livreurs', href: '/riders', icon: UserCircle },
  { name: 'Suivi en direct', href: '/live-map', icon: MapIcon },
  { name: 'Repères', href: '/reperes', icon: MapPinned },
  { name: 'Messages', href: '/messages', icon: MessageCircle },
  { name: 'Clients', href: '/customers', icon: Users },
  { name: 'Partenaires', href: '/partenaires', icon: Building2 },
  { name: 'Paiements', href: '/payments', icon: Wallet },
  { name: 'Flotte', href: '/fleet', icon: Truck },
  { name: 'Rapports', href: '/reports', icon: BarChart3 },
  { name: 'Alertes', href: '/alerts', icon: AlertTriangle, badge: 4 },
  { name: 'Litiges', href: '/disputes', icon: ShieldAlert },
];

export function Sidebar({ onLinkClick }: { onLinkClick?: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-slate-900 text-slate-400 flex flex-col justify-between shrink-0 z-20 h-full">
      <nav className="p-3 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onLinkClick}
              className={cn(
                'group flex items-center space-x-3 px-3 py-2 rounded text-xs font-medium transition-colors',
                isActive
                  ? 'bg-slate-800 text-white'
                  : 'hover:bg-slate-850 hover:text-white'
              )}
            >
              <item.icon
                className={cn(
                  'w-4 h-4',
                  isActive && item.primary ? 'text-fiatlux-primary' : ''
                )}
              />
              <span className="flex-1">{item.name}</span>
              {item.badge && (
                <span className="bg-fiatlux-danger text-white text-[10px] px-1.5 py-0.2 rounded font-bold">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-slate-800">
        <Link
          href="/settings"
          className="flex items-center space-x-3 px-3 py-2 rounded text-xs font-medium hover:bg-slate-850 hover:text-white transition-colors"
        >
          <Settings className="w-4 h-4" />
          <span>Paramètres</span>
        </Link>
      </div>
    </aside>
  );
}