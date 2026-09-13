'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  HelpCircle, 
  MessageCircle, 
  Phone, 
  ChevronDown, 
  Truck, 
  Search, 
  XCircle,
  CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const FAQS = [
  {
    question: "Comment passer une commande ?",
    answer: "C'est très simple ! Cliquez sur 'Commander' depuis l'accueil, remplissez les informations de collecte et de destination, puis validez. Vous recevrez instantanément un SMS de confirmation.",
    icon: Truck
  },
  {
    question: "Comment suivre mon colis ?",
    answer: "Utilisez le lien reçu par SMS ou rendez-vous sur la page 'Suivre' munis de votre numéro de téléphone et de votre référence de commande pour voir la position en temps réel du livreur.",
    icon: Search
  },
  {
    question: "Que faire si le chauffeur n'arrive pas ?",
    answer: "Si le chauffeur a plus de 15 minutes de retard sur l'estimation, vous pouvez l'appeler directement via le bouton d'appel sur votre page de suivi. Notre support est aussi disponible sur WhatsApp.",
    icon: HelpCircle
  },
  {
    question: "Comment annuler une livraison ?",
    answer: "Vous pouvez annuler gratuitement tant que le livreur n'a pas encore récupéré le colis. Le bouton 'Annuler' est disponible en bas de votre page de suivi personnelle.",
    icon: XCircle
  },
  {
    question: "Quels sont les modes de paiement ?",
    answer: "Nous acceptons le paiement en espèces à la livraison, ainsi que MTN Mobile Money et Airtel Money directement via l'application.",
    icon: CreditCard
  }
];

export default function AidePage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-white">
      <section className="px-6 pt-16 pb-12 bg-slate-50">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-16 h-16 bg-fiatlux-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6"
          >
            <HelpCircle className="h-8 w-8 text-fiatlux-primary" />
          </motion.div>
          <h1 className="text-4xl font-black text-slate-900 leading-tight tracking-tight mb-4">
            Centre d'aide
          </h1>
          <p className="text-slate-500 font-medium max-w-md mx-auto">
            Trouvez rapidement des réponses à vos questions ou contactez notre équipe support.
          </p>
        </div>
      </section>

      <section className="px-6 py-16 max-w-2xl mx-auto">
        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 mb-8 text-center">Questions fréquentes</h2>
        
        <div className="space-y-4">
          {FAQS.map((faq, index) => (
            <div 
              key={index}
              className="border border-slate-100 rounded-[32px] overflow-hidden transition-all"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full p-6 flex items-center justify-between text-left hover:bg-slate-50"
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                    <faq.icon className="h-4 w-4 text-slate-500" />
                  </div>
                  <span className="font-black text-slate-900 italic">{faq.question}</span>
                </div>
                <ChevronDown className={`h-5 w-5 text-slate-300 transition-transform ${openIndex === index ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    <div className="px-6 pb-6 pt-2 ml-12 text-sm text-slate-500 font-medium leading-relaxed">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        <div className="mt-20 p-8 rounded-[40px] bg-neutral-900 text-white text-center">
          <h3 className="text-xl font-black italic mb-2">Encore besoin d'aide ?</h3>
          <p className="text-xs text-neutral-400 font-medium mb-8">Notre équipe support est disponible 7j/7 de 8h à 20h.</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a href="https://wa.me/242060000000" target="_blank" rel="noopener noreferrer">
              <Button className="w-full h-14 rounded-2xl bg-fiatlux-success hover:bg-fiatlux-success/90 text-white font-black uppercase tracking-widest gap-2">
                <MessageCircle className="h-5 w-5" /> WhatsApp
              </Button>
            </a>
            <a href="tel:+242060000000">
              <Button variant="outline" className="w-full h-14 rounded-2xl border-neutral-700 text-white hover:bg-neutral-800 font-black uppercase tracking-widest gap-2">
                <Phone className="h-5 w-5" /> Appeler
              </Button>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
