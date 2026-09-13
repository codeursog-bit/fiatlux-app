import React from 'react';
import { Truck } from 'lucide-react';
import Link from 'next/link';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-fiatlux-primary p-1.5 rounded-lg">
              <Truck className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-neutral-900">FIATLUX</span>
          </Link>
          <Link 
            href="/suivre" 
            className="text-sm font-medium text-neutral-600 hover:text-fiatlux-primary transition-colors"
          >
            Suivre un colis
          </Link>
        </div>
      </header>
      
      <main className="flex-1 w-full max-w-4xl mx-auto">
        {children}
      </main>

      <footer className="bg-white border-t py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8 text-center md:text-left">
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="flex items-center gap-2 justify-center md:justify-start mb-4">
                <div className="bg-fiatlux-primary p-1.5 rounded-lg">
                  <Truck className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold text-lg tracking-tight text-neutral-900">FIATLUX</span>
              </Link>
              <p className="text-xs text-neutral-500 font-medium leading-relaxed">
                Le service de livraison n°1 à Pointe-Noire. Rapide, fiable et sécurisé.
              </p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Service</p>
              <ul className="space-y-2">
                <li><Link href="/commander" className="text-xs font-bold text-slate-600 hover:text-fiatlux-primary">Commander</Link></li>
                <li><Link href="/suivre" className="text-xs font-bold text-slate-600 hover:text-fiatlux-primary">Suivre un colis</Link></li>
                <li><Link href="/aide" className="text-xs font-bold text-slate-600 hover:text-fiatlux-primary">Centre d'aide</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Légal</p>
              <ul className="space-y-2">
                <li><Link href="/cgu" className="text-xs font-bold text-slate-600 hover:text-fiatlux-primary">CGU</Link></li>
                <li><Link href="/confidentialite" className="text-xs font-bold text-slate-600 hover:text-fiatlux-primary">Confidentialité</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Contact</p>
              <ul className="space-y-2">
                <li className="text-xs font-bold text-slate-600">+242 06 000 00 00</li>
                <li className="text-xs font-bold text-fiatlux-success">WhatsApp disponible</li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-50 text-center">
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
              © {new Date().getFullYear()} FIATLUX Delivery. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}