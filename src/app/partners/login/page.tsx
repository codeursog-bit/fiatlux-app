'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'motion/react';
import { Building2, ArrowRight, Lock, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { PartnerAuthService } from '@/services/partner-auth.service';

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function PartnerLoginPage() {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const router = useRouter();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    }
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsSubmitting(true);
    try {
      const data = await PartnerAuthService.login(values.email, values.password);
      
      toast.success('Bienvenue sur votre espace partenaire');
      router.push('/partners/dashboard');
      router.refresh();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Identifiants invalides');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-10">
          <div className="bg-slate-900 w-20 h-20 rounded-[24px] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-slate-200">
            <Building2 className="h-10 w-10 text-fiatlux-primary" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-[0.2em] uppercase mb-1">FIATLUX</h1>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Espace Entreprises Partenaires</p>
        </div>

        <div className="bg-white rounded-[40px] p-10 shadow-xl shadow-slate-200/60 border border-slate-100">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Identifiant Entreprise (Email)</Label>
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                <Input 
                  {...form.register('email')}
                  type="email"
                  placeholder="nom@votre-entreprise.com"
                  className="h-16 pl-14 rounded-2xl border-2 border-slate-50 bg-slate-50/30 focus:bg-white focus:border-fiatlux-primary transition-all text-base font-bold"
                />
              </div>
              {form.formState.errors.email && (
                <p className="text-red-500 text-[10px] font-bold uppercase ml-1">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                <Input 
                  {...form.register('password')}
                  type="password"
                  placeholder="••••••••"
                  className="h-16 pl-14 rounded-2xl border-2 border-slate-50 bg-slate-50/30 focus:bg-white focus:border-fiatlux-primary transition-all text-base font-bold"
                />
              </div>
              {form.formState.errors.password && (
                <p className="text-red-500 text-[10px] font-bold uppercase ml-1">{form.formState.errors.password.message}</p>
              )}
            </div>

            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full h-16 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-base font-black uppercase tracking-widest gap-3 shadow-xl shadow-slate-200 mt-2"
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : 'Accéder au tableau de bord'}
            </Button>
          </form>

          <div className="mt-10 pt-8 border-t border-slate-50 text-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
              Pour toute demande d'assistance technique ou commerciale,<br /> contactez le support FIATLUX Logistics.
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="text-slate-400 hover:text-slate-600 transition-colors text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
            <ArrowRight className="h-3 w-3 rotate-180" /> Retour au site public
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
