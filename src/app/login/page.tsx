'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Bike, Loader2, AlertCircle, Lock, Mail } from 'lucide-react';
import { AuthService } from '@/services/auth.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      await AuthService.login(data.email, data.password);
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Une erreur est survenue lors de la connexion.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-fiatlux-primary blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-fiatlux-primary blur-[120px]" />
      </div>

      <div className="w-full max-w-md px-6 py-12 relative z-10">
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
          <div className="bg-fiatlux-primary px-8 py-10 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 mb-4 backdrop-blur-sm">
              <Bike className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-[0.2em] uppercase">FIATLUX</h1>
            <p className="text-white/60 text-[10px] uppercase tracking-widest mt-2 font-medium">Plateforme de gestion de livraison</p>
          </div>

          <div className="p-8 space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg text-xs flex items-center space-x-2 animate-in fade-in slide-in-from-top-1">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="font-medium">{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                  Adresse email professionelle
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="nom@fiatlux.com"
                    className={cn(
                      "pl-10 h-11 border-slate-200 focus:ring-fiatlux-primary/20 focus:border-fiatlux-primary transition-all text-sm",
                      errors.email && "border-red-300 focus:ring-red-50"
                    )}
                    {...register('email')}
                  />
                </div>
                {errors.email && <p className="text-[10px] text-red-500 font-medium ml-1">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between ml-1">
                  <Label htmlFor="password" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Mot de passe
                  </Label>
                  <button type="button" className="text-[10px] font-bold text-fiatlux-primary hover:underline uppercase tracking-wider">
                    Oublié ?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className={cn(
                      "pl-10 h-11 border-slate-200 focus:ring-fiatlux-primary/20 focus:border-fiatlux-primary transition-all text-sm",
                      errors.password && "border-red-300 focus:ring-red-50"
                    )}
                    {...register('password')}
                  />
                </div>
                {errors.password && <p className="text-[10px] text-red-500 font-medium ml-1">{errors.password.message}</p>}
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-fiatlux-primary hover:bg-[#0d4270] text-white font-bold uppercase tracking-widest text-[11px] shadow-lg shadow-fiatlux-primary/20 transition-all mt-4"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Se connecter au portail'
                )}
              </Button>
            </form>

            <div className="pt-4 text-center">
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">
                Accès restreint au personnel autorisé uniquement.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-slate-500 text-[10px] font-medium uppercase tracking-widest">
            &copy; 2026 FIATLUX LOGISTICS &bull; Pointe-Noire &bull; Brazzaville
          </p>
        </div>
      </div>
    </div>
  );
}
