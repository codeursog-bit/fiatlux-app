'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Truck,
  Search,
  MapPin,
  ShieldCheck,
  Zap,
  CreditCard,
  CheckCircle2,
  MessageCircle,
  ArrowRight,
  PackageSearch,
  Bike,
  BadgeCheck,
  Navigation,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface PricingZone {
  id: string;
  zoneName: string;
}

const TRUST_BADGES = [
  { icon: BadgeCheck, label: 'Sans inscription' },
  { icon: Navigation, label: 'Suivi en direct' },
  { icon: CreditCard, label: 'Paiement flexible' },
];

const FEATURES = [
  {
    icon: ShieldCheck,
    color: 'text-fiatlux-primary',
    bg: 'bg-blue-50',
    title: 'Livreurs identifiés',
    text: "Tous nos coursiers sont certifiés et portent l'équipement officiel FIATLUX.",
  },
  {
    icon: Zap,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    title: 'Suivi en temps réel',
    text: 'Visualisez la position exacte de votre livreur sur la carte dès sa prise en charge.',
  },
  {
    icon: CheckCircle2,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    title: 'Preuve de remise',
    text: 'Confirmation par double validation entre le client et le livreur pour chaque colis.',
  },
  {
    icon: CreditCard,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    title: 'Paiement flexible',
    text: 'Payez par Mobile Money (MTN, Airtel) ou directement en espèces à la livraison.',
  },
];

const STEPS = [
  {
    icon: PackageSearch,
    title: 'Décrivez votre colis',
    text: 'Indiquez le point de collecte, la destination et ce que vous envoyez — en 2 minutes.',
  },
  {
    icon: Bike,
    title: 'Un livreur est assigné',
    text: 'Un coursier vérifié prend en charge votre commande et se dirige vers le point de collecte.',
  },
  {
    icon: CheckCircle2,
    title: 'Suivez et confirmez',
    text: 'Suivez le trajet en direct sur la carte, puis validez la remise à la livraison.',
  },
];

export default function PublicLandingPage() {
  const [zones, setZones] = useState<PricingZone[]>([]);
  const [isLoadingZones, setIsLoadingZones] = useState(true);

  useEffect(() => {
    fetch('/api/public/pricing-zones')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setZones(data);
      })
      .catch(err => console.error("Failed to fetch zones", err))
      .finally(() => setIsLoadingZones(false));
  }, []);

  return (
    <div className="flex flex-col bg-white">
      {/* Hero */}
      <section className="px-6 pt-14 pb-20 bg-neutral-50 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-fiatlux-primary opacity-[0.06] rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-24 w-72 h-72 bg-fiatlux-accent opacity-[0.06] rounded-full blur-3xl" />

        <div className="relative z-10 max-w-5xl mx-auto grid lg:grid-cols-2 gap-14 items-center">
          <div className="text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 bg-blue-100 text-fiatlux-primary px-3 py-1 rounded-full font-black text-[10px] uppercase tracking-widest mb-6"
            >
              <Zap className="h-3 w-3 fill-current" /> Service n°1 à Pointe-Noire
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl font-black text-slate-900 leading-[1.1] tracking-tight mb-5"
            >
              Livraison rapide et fiable à <span className="text-fiatlux-primary italic">Pointe-Noire</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-slate-500 text-base font-medium mb-8 leading-relaxed max-w-md mx-auto lg:mx-0"
            >
              Expédiez vos colis en toute sérénité avec un suivi en temps réel et des livreurs certifiés.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col gap-3 max-w-md mx-auto lg:mx-0"
            >
              <Link href="/commander">
                <Button className="w-full h-16 rounded-2xl bg-fiatlux-primary hover:bg-fiatlux-primary/90 text-white text-lg font-black uppercase tracking-wider shadow-xl shadow-blue-200 gap-3 group">
                  Commander une livraison
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/suivre">
                <Button variant="outline" className="w-full h-14 rounded-2xl border-slate-200 text-slate-600 text-sm font-bold gap-3">
                  <Search className="w-4 h-4" /> Suivre ma commande
                </Button>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-2 mt-8"
            >
              {TRUST_BADGES.map((b) => (
                <div key={b.label} className="flex items-center gap-1.5 text-slate-400">
                  <b.icon className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-bold uppercase tracking-wide">{b.label}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Visuel — mockup de suivi stylisé (masqué sur mobile) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25 }}
            className="hidden lg:block"
          >
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-2xl shadow-slate-200 p-6 relative">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Commande</p>
                  <p className="text-sm font-black text-slate-900">EXP-081968-5997</p>
                </div>
                <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-wide px-3 py-1 rounded-full">
                  En livraison
                </span>
              </div>

              <div className="rounded-2xl bg-neutral-50 border border-slate-100 aspect-square relative overflow-hidden mb-5">
                <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full opacity-[0.07]">
                  <path d="M0 40 H200 M0 90 H200 M0 140 H200 M40 0 V200 M90 0 V200 M140 0 V200" stroke="#0F4C81" strokeWidth="1" />
                </svg>
                <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full">
                  <path d="M30 150 Q 80 60 170 40" fill="none" stroke="#0F4C81" strokeWidth="3" strokeDasharray="2 8" strokeLinecap="round" />
                </svg>
                <div className="absolute" style={{ left: '30px', top: '150px', transform: 'translate(-50%,-50%)' }}>
                  <div className="w-4 h-4 rounded-full bg-orange-500 ring-4 ring-orange-100 border-2 border-white" />
                </div>
                <div className="absolute" style={{ left: '170px', top: '40px', transform: 'translate(-50%,-50%)' }}>
                  <div className="w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-emerald-100 border-2 border-white" />
                </div>
                <div className="absolute" style={{ left: '95px', top: '108px', transform: 'translate(-50%,-50%)' }}>
                  <div className="w-8 h-8 rounded-full bg-fiatlux-primary shadow-lg flex items-center justify-center">
                    <Bike className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-fiatlux-primary/10 flex items-center justify-center shrink-0">
                  <Bike className="w-5 h-5 text-fiatlux-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-black text-slate-900">Chauffeur en route</p>
                  <p className="text-[11px] text-slate-400 font-medium">Arrivée estimée dans 8 min</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pourquoi nous choisir */}
      <section className="px-6 py-20 max-w-5xl mx-auto w-full">
        <div className="text-center mb-12">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-fiatlux-primary mb-3">Pourquoi nous choisir</h2>
          <p className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Une livraison pensée pour être fiable</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="p-6 rounded-3xl border border-slate-100 bg-white shadow-sm hover:shadow-lg hover:border-slate-200 transition-all"
            >
              <div className={`w-12 h-12 rounded-2xl ${f.bg} flex items-center justify-center mb-4`}>
                <f.icon className={`h-6 w-6 ${f.color}`} />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-1.5 leading-none">{f.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="px-6 py-20 bg-neutral-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-fiatlux-primary mb-3">Comment ça marche</h2>
            <p className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Trois étapes, du dépôt à la remise</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8 relative">
            <div className="hidden sm:block absolute top-6 left-[16.5%] right-[16.5%] h-px bg-slate-200" />
            {STEPS.map((s, i) => (
              <div key={s.title} className="relative text-center">
                <div className="w-12 h-12 rounded-2xl bg-fiatlux-primary text-white flex items-center justify-center mx-auto mb-5 relative z-10 font-black shadow-lg shadow-blue-200">
                  {i + 1}
                </div>
                <s.icon className="h-5 w-5 text-fiatlux-primary mx-auto mb-3" />
                <h3 className="text-base font-black text-slate-900 mb-1.5">{s.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed font-medium max-w-[220px] mx-auto">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Zones desservies */}
      <section className="px-6 py-16 bg-neutral-900 text-white">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <MapPin className="h-5 w-5 text-fiatlux-primary" />
            <h2 className="text-xl font-black tracking-tight">Zones desservies</h2>
          </div>

          <p className="text-neutral-400 text-sm mb-8 leading-relaxed font-medium max-w-lg">
            FIATLUX couvre actuellement les principaux quartiers de Pointe-Noire :
          </p>

          <div className="flex flex-wrap gap-2">
            {isLoadingZones ? (
              <div className="h-8 w-32 bg-neutral-800 animate-pulse rounded-lg" />
            ) : zones.length > 0 ? (
              zones.map(zone => (
                <span
                  key={zone.id}
                  className="px-4 py-2 rounded-xl bg-neutral-800 text-[11px] font-black uppercase tracking-widest text-neutral-300 border border-neutral-700"
                >
                  {zone.zoneName}
                </span>
              ))
            ) : (
              <p className="text-xs text-neutral-500 italic">Disponibilité sur tout le périmètre urbain.</p>
            )}
          </div>

          <div className="mt-12 p-6 rounded-3xl bg-neutral-800 border border-neutral-700 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-neutral-400 mb-1">Besoin d'aide ?</p>
              <p className="text-sm font-black">Contactez-nous sur WhatsApp</p>
            </div>
            <a
              href="https://wa.me/242060000000"
              className="w-12 h-12 rounded-full bg-fiatlux-success flex items-center justify-center shadow-lg shadow-emerald-900/40 shrink-0"
            >
              <MessageCircle className="h-6 w-6 text-white" />
            </a>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="px-6 py-20">
        <div className="max-w-5xl mx-auto rounded-[40px] bg-fiatlux-primary relative overflow-hidden px-8 py-14 text-center">
          <div className="absolute -top-16 -right-16 w-56 h-56 bg-white opacity-[0.06] rounded-full blur-3xl" />
          <Truck className="h-8 w-8 text-white/70 mx-auto mb-5" />
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-3">
            Prêt à expédier votre colis ?
          </h2>
          <p className="text-blue-100 text-sm font-medium mb-8 max-w-md mx-auto leading-relaxed">
            Sans inscription, en moins de 2 minutes — un livreur certifié prend le relais dès la validation.
          </p>
          <Link href="/commander">
            <Button className="h-14 px-8 rounded-2xl bg-white text-fiatlux-primary hover:bg-blue-50 text-sm font-black uppercase tracking-widest gap-3 shadow-xl">
              Commander maintenant
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}