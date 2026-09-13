'use client';

import React from 'react';
import { WifiOff, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-slate-100 rounded-[32px] flex items-center justify-center mb-8">
        <WifiOff className="h-10 w-10 text-slate-400" />
      </div>
      
      <h1 className="text-3xl font-black text-slate-900 mb-4 italic uppercase tracking-tight">
        Pas de connexion
      </h1>
      
      <p className="text-slate-500 font-medium max-w-xs mb-10">
        Il semble que vous soyez hors ligne. Certaines fonctionnalités de FiatLux nécessitent une connexion active pour fonctionner en temps réel.
      </p>

      <Button 
        onClick={() => window.location.reload()}
        className="h-14 px-8 rounded-2xl bg-fiatlux-primary text-white font-black uppercase tracking-widest flex items-center gap-2"
      >
        <RefreshCcw className="h-5 w-5" />
        Réessayer
      </Button>
    </div>
  );
}
