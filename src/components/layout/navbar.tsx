'use client';

import { Bell, Search, Plus, Calendar, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserNav } from './user-nav';

export function Navbar({ onMenuClick }: { onMenuClick?: () => void }) {
  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 z-30 shrink-0 sticky top-0">
      <div className="flex items-center space-x-3 md:space-x-6">
        {/* Mobile Menu Button */}
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Logo */}
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded bg-fiatlux-primary flex items-center justify-center text-white font-bold text-lg tracking-tight">
            M
          </div>
          <div>
            <span className="text-sm font-bold text-slate-900 tracking-tight">FIATLUX</span>
            <span className="text-[10px] block text-slate-500 font-medium -mt-1 uppercase">Système Logistique</span>
          </div>
        </div>
        
        {/* Current Date */}
        <div className="hidden md:flex items-center space-x-2 text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded border border-slate-100">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>Lundi 3 août 2026</span>
        </div>
      </div>

      {/* Global Search */}
      <div className="hidden lg:flex flex-1 max-w-md mx-8">
        <div className="relative w-full">
          <Search className="absolute inset-y-0 left-3 h-full flex items-center pointer-events-none w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Rechercher des commandes, livreurs... (Appuyez sur '/' pour rechercher)" 
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none focus:border-fiatlux-primary focus:bg-white transition-colors"
          />
        </div>
      </div>

      {/* Actions & Profile */}
      <div className="flex items-center space-x-4">
        <Button className="bg-fiatlux-primary hover:bg-fiatlux-primary/95 text-white h-8 px-3 rounded text-xs font-semibold flex items-center space-x-1.5">
          <Plus className="w-3.5 h-3.5" strokeWidth={3} />
          <span>Créer une livraison</span>
        </Button>

        <button className="relative p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded transition-colors group">
          <span className="absolute top-1 right-1 w-2 h-2 bg-fiatlux-danger rounded-full ring-2 ring-white"></span>
          <Bell className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2.5 border-l border-slate-200 pl-4 h-8">
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs">
            AM
          </div>
          <div className="hidden xl:block text-left">
            <span className="block text-xs font-bold text-slate-800 leading-none">Alex Mercer</span>
            <span className="text-[10px] text-slate-500 font-medium">Régulateur de Flux</span>
          </div>
        </div>
      </div>
    </header>
  );
}
