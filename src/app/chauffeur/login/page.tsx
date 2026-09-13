'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Bike, Loader2, AlertCircle, Lock, Phone } from 'lucide-react';
import { RiderAuthService } from '@/services/rider-auth.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
  phone: z.string().min(6, 'Numéro de téléphone requis'),
  password: z.string().min(4, 'Mot de passe requis'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function ChauffeurLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: '', password: '' },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      await RiderAuthService.login(data.phone, data.password);
      router.push('/chauffeur/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Identifiants invalides.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 relative overflow-hidden px-4">
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-fiatlux-primary blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-fiatlux-primary blur-[120px]" />
      </div>

      <div className="w-full max-w-sm py-12 relative z-10">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
          <div className="bg-fiatlux-primary px-8 py-10 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 mb-4 backdrop-blur-sm">
              <Bike className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-[0.2em] uppercase">Espace Chauffeur</h1>
            <p className="text-white/60 text-[10px] uppercase tracking-widest mt-2 font-medium">FiatLux</p>
          </div>

          <div className="p-6 space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="font-medium">{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                  Numéro de téléphone
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="06 xxx xx xx"
                    className={cn(
                      "pl-10 h-14 border-slate-200 focus:ring-fiatlux-primary/20 focus:border-fiatlux-primary transition-all text-base",
                      errors.phone && "border-red-300 focus:ring-red-50"
                    )}
                    {...register('phone')}
                  />
                </div>
                {errors.phone && <p className="text-[10px] text-red-500 font-medium ml-1">{errors.phone.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                  Mot de passe
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className={cn(
                      "pl-10 h-14 border-slate-200 focus:ring-fiatlux-primary/20 focus:border-fiatlux-primary transition-all text-base",
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
                className="w-full h-14 bg-fiatlux-primary hover:bg-[#0d4270] text-white font-bold uppercase tracking-widest text-[13px] shadow-lg shadow-fiatlux-primary/20 transition-all mt-4"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Se connecter'}
              </Button>
            </form>

            <div className="pt-2 text-center">
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">
                Identifiants fournis par votre administrateur.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
