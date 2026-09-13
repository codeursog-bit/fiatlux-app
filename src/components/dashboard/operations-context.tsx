'use client';

import { CloudOff, Info } from 'lucide-react';

export function OperationsContext() {
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
      <div className="px-4 py-3 border-b border-slate-200">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-tight">Contexte Opérationnel</h2>
        <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Conditions environnementales et impact sur la livraison.</p>
      </div>

      <div className="p-6 flex flex-col items-center text-center gap-2">
        <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
          <CloudOff className="w-5 h-5" />
        </div>
        <p className="text-xs font-bold text-slate-500">Intégration météo non configurée</p>
        <p className="text-[10px] text-slate-400 leading-relaxed max-w-[220px] flex items-start gap-1">
          <Info className="w-3 h-3 shrink-0 mt-0.5" />
          Connectez un service météo pour afficher ici l&apos;impact réel sur les délais.
        </p>
      </div>
    </div>
  );
}