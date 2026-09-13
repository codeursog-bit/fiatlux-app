'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutGrid, Package, Search, MessageCircle, LogOut, Satellite, SatelliteDish, Download, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RiderAuthService } from '@/services/rider-auth.service';
import { useMyMessages } from '@/hooks/use-chat';
import { useLocationTracking } from '@/hooks/use-location-tracking';

const INSTALL_DISMISSED_KEY = 'fiatlux_pwa_install_dismissed';

const NAV_ITEMS = [
  { href: '/chauffeur/dashboard', label: 'Accueil', icon: LayoutGrid },
  { href: '/chauffeur/courses', label: 'Mes courses', icon: Package },
  { href: '/chauffeur/disponibles', label: 'Disponibles', icon: Search },
  { href: '/chauffeur/messages', label: 'Messages', icon: MessageCircle },
];

export function ChauffeurLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: messages } = useMyMessages();
  const { isOnline, status, start, stop } = useLocationTracking();

  const [installPrompt, setInstallPrompt] = React.useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = React.useState(false);

  // Enregistre le Service Worker (rend la PWA installable, garde une
  // coquille utilisable en cas de coupure réseau ponctuelle en moto).
  React.useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/chauffeur/' }).catch(() => {
      // L'app reste utilisable sans Service Worker, juste pas installable/hors-ligne.
    });
  }, []);

  // Capte l'événement d'installation natif du navigateur pour proposer un
  // vrai bouton "Installer" (Chrome/Edge Android) plutôt que de laisser le
  // chauffeur deviner le menu du navigateur.
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(INSTALL_DISMISSED_KEY) === '1') return;

    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
    setShowInstallBanner(false);
  };

  const dismissInstallBanner = () => {
    setShowInstallBanner(false);
    localStorage.setItem(INSTALL_DISMISSED_KEY, '1');
  };

  const unreadCount = React.useMemo(() => {
    if (!messages) return 0;
    // Un message ADMIN non lu compte — l'API marque comme lu à
    // l'ouverture de /chauffeur/messages, donc ce compteur reflète
    // l'état avant consultation.
    return messages.filter((m: any) => m.senderType === 'ADMIN' && !m.read).length;
  }, [messages]);

  const handleLogout = () => {
    RiderAuthService.logout();
    router.push('/chauffeur/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 px-4 py-3 flex items-center justify-between gap-3">
        <span className="text-sm font-black uppercase tracking-widest text-fiatlux-primary shrink-0">FiatLux</span>

        <button
          onClick={() => (isOnline ? stop() : start())}
          className={cn(
            'flex items-center gap-2 h-9 px-3 rounded-full border transition-colors',
            isOnline
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-slate-50 border-slate-200 text-slate-500'
          )}
          aria-pressed={isOnline}
        >
          <span className={cn(
            'w-2 h-2 rounded-full shrink-0',
            status === 'active' ? 'bg-emerald-500 animate-pulse' :
            status === 'requesting' ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'
          )} />
          {isOnline ? <SatelliteDish className="w-3.5 h-3.5" /> : <Satellite className="w-3.5 h-3.5" />}
          <span className="text-[10px] font-black uppercase tracking-wider">
            {status === 'requesting' ? 'Connexion...' : isOnline ? 'En ligne' : 'Hors ligne'}
          </span>
        </button>

        <button
          onClick={handleLogout}
          className="h-9 w-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-red-500 transition-colors shrink-0"
          aria-label="Déconnexion"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      {showInstallBanner && (
        <div className="bg-fiatlux-primary text-white px-4 py-2.5 flex items-center justify-between gap-3 sticky top-[57px] z-20">
          <div className="flex items-center gap-2 min-w-0">
            <Download className="w-4 h-4 shrink-0" />
            <p className="text-[11px] font-bold leading-tight">
              Installez l&apos;app sur votre écran d&apos;accueil pour l&apos;ouvrir plus vite.
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={handleInstall} className="text-[10px] font-black uppercase bg-white text-fiatlux-primary px-3 py-1.5 rounded-full">
              Installer
            </button>
            <button onClick={dismissInstallBanner} className="p-1 text-white/70 hover:text-white" aria-label="Fermer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 pb-24 px-4 pt-4 max-w-lg mx-auto w-full">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-20">
        <div className="max-w-lg mx-auto grid grid-cols-4">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 py-3 relative transition-colors',
                  isActive ? 'text-fiatlux-primary' : 'text-slate-400'
                )}
              >
                <div className="relative">
                  <Icon className="w-6 h-6" />
                  {item.href === '/chauffeur/messages' && unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-black rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <span className="text-[9px] font-black uppercase tracking-wider">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
