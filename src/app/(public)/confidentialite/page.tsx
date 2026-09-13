'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Lock, Eye, MapPin, Database, Clock } from 'lucide-react';

export default function ConfidentialitePage() {
  return (
    <div className="min-h-screen bg-white">
      <section className="px-6 pt-16 pb-12 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full font-black text-[10px] uppercase tracking-widest mb-6"
          >
            Confidentialité
          </motion.div>
          <h1 className="text-4xl font-black text-slate-900 leading-tight tracking-tight mb-4">
            Politique de Confidentialité
          </h1>
          <p className="text-slate-500 font-medium">Votre sécurité et la protection de vos données sont notre priorité.</p>
        </div>
      </section>

      <section className="px-6 py-16 max-w-3xl mx-auto space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-6 rounded-[32px] bg-slate-50 border border-slate-100 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
              <Database className="h-5 w-5" />
            </div>
            <h3 className="font-black text-slate-900">Données collectées</h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Nous collectons votre numéro de téléphone, vos noms et les adresses de collecte/livraison pour assurer le service.
            </p>
          </div>

          <div className="p-6 rounded-[32px] bg-slate-50 border border-slate-100 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-fiatlux-primary">
              <MapPin className="h-5 w-5" />
            </div>
            <h3 className="font-black text-slate-900">Géolocalisation</h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              La position GPS du livreur est suivie en temps réel uniquement durant la mission pour vous permettre le suivi en direct.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-3 text-slate-900">
            <Eye className="h-5 w-5 text-fiatlux-primary" />
            <h2 className="text-xl font-black uppercase tracking-tight">Pourquoi ces données ?</h2>
          </div>
          <p className="text-slate-600 leading-relaxed font-medium">
            Vos informations sont utilisées exclusivement pour :
          </p>
          <ul className="space-y-4">
            <li className="flex gap-3">
              <div className="h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-[10px] font-black italic">1</div>
              <p className="text-sm text-slate-600 font-medium">Mettre en relation l'expéditeur, le livreur et le destinataire.</p>
            </li>
            <li className="flex gap-3">
              <div className="h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-[10px] font-black italic">2</div>
              <p className="text-sm text-slate-600 font-medium">Envoyer les notifications SMS de suivi (lien de tracking).</p>
            </li>
            <li className="flex gap-3">
              <div className="h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-[10px] font-black italic">3</div>
              <p className="text-sm text-slate-600 font-medium">Garantir la preuve de livraison par photo ou signature numérique.</p>
            </li>
          </ul>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-3 text-slate-900">
            <Clock className="h-5 w-5 text-fiatlux-primary" />
            <h2 className="text-xl font-black uppercase tracking-tight">Conservation</h2>
          </div>
          <p className="text-slate-600 leading-relaxed font-medium">
            Les données de suivi GPS sont archivées 30 jours après la livraison pour le règlement d'éventuels litiges, puis anonymisées. 
            Vos coordonnées de contact sont conservées pour faciliter vos prochaines commandes, sauf demande de suppression de votre part.
          </p>
        </div>

        <div className="p-8 rounded-[40px] bg-neutral-900 text-white flex flex-col md:flex-row items-center gap-6 justify-between">
          <div className="space-y-1 text-center md:text-left">
            <h3 className="font-black text-lg italic">Vos droits</h3>
            <p className="text-xs text-neutral-400 font-medium">Vous pouvez demander l'accès ou la suppression de vos données à tout moment.</p>
          </div>
          <a href="mailto:privacy@fiatlux.cg" className="px-6 py-3 rounded-2xl bg-white text-neutral-900 font-black uppercase tracking-widest text-xs">
            Contact Privacy
          </a>
        </div>
      </section>
    </div>
  );
}
