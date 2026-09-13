/**
 * FIATLUX - Conditions Générales d'Utilisation
 * NOTE: Ce contenu est fourni à titre informatif pour le prototype. 
 * Une validation par un conseiller juridique est requise avant la mise en production réelle.
 */

'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Shield, FileText, Scale, UserCheck } from 'lucide-react';

export default function CGUPage() {
  return (
    <div className="min-h-screen bg-white">
      <section className="px-6 pt-16 pb-12 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-blue-100 text-fiatlux-primary px-3 py-1 rounded-full font-black text-[10px] uppercase tracking-widest mb-6"
          >
            Légal
          </motion.div>
          <h1 className="text-4xl font-black text-slate-900 leading-tight tracking-tight mb-4">
            Conditions Générales d'Utilisation
          </h1>
          <p className="text-slate-500 font-medium italic">Dernière mise à jour : 13 Août 2026</p>
        </div>
      </section>

      <section className="px-6 py-16 max-w-3xl mx-auto space-y-12">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-fiatlux-primary mb-2">
            <FileText className="h-5 w-5" />
            <h2 className="text-xl font-black uppercase tracking-tight">1. Objet du service</h2>
          </div>
          <p className="text-slate-600 leading-relaxed font-medium">
            FIATLUX est une plateforme de mise en relation et de gestion de livraison urbaine à Pointe-Noire. 
            Nous facilitons l'expédition et le suivi de colis entre un expéditeur et un destinataire via notre réseau de coursiers partenaires.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 text-fiatlux-primary mb-2">
            <UserCheck className="h-5 w-5" />
            <h2 className="text-xl font-black uppercase tracking-tight">2. Engagements de l'utilisateur</h2>
          </div>
          <p className="text-slate-600 leading-relaxed font-medium">
            En utilisant nos services, vous vous engagez à :
          </p>
          <ul className="list-disc pl-5 space-y-2 text-slate-600 font-medium">
            <li>Fournir des informations exactes (téléphone, adresses).</li>
            <li>Ne pas expédier d'objets illicites, dangereux ou interdits par la loi congolaise.</li>
            <li>Assurer que le destinataire est informé et disponible pour la réception.</li>
          </ul>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 text-fiatlux-primary mb-2">
            <Shield className="h-5 w-5" />
            <h2 className="text-xl font-black uppercase tracking-tight">3. Responsabilités</h2>
          </div>
          <p className="text-slate-600 leading-relaxed font-medium">
            FIATLUX s'engage à mettre en œuvre tous les moyens nécessaires pour assurer la sécurité et la rapidité des livraisons. 
            Toutefois, notre responsabilité ne saurait être engagée en cas de force majeure, de retard dû au trafic urbain ou d'informations erronées fournies par l'utilisateur.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 text-fiatlux-primary mb-2">
            <Scale className="h-5 w-5" />
            <h2 className="text-xl font-black uppercase tracking-tight">4. Litiges et Données</h2>
          </div>
          <p className="text-slate-600 leading-relaxed font-medium">
            En cas de litige, une solution amiable sera privilégiée. À défaut, les tribunaux de Pointe-Noire seront seuls compétents. 
            Concernant vos données personnelles, FIATLUX respecte votre vie privée. Pour en savoir plus, consultez notre <a href="/confidentialite" className="text-fiatlux-primary font-bold underline">Politique de Confidentialité</a>.
          </p>
        </div>
      </section>
    </div>
  );
}
