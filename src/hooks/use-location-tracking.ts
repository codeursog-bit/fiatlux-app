import * as React from 'react';
import { toast } from 'sonner';
import { api } from '@/services/api';
import { RiderAuthService } from '@/services/rider-auth.service';
import { RiderPortalService } from '@/services/rider-portal.service';

const STORAGE_KEY = 'fiatlux_rider_tracking';
const MIN_SEND_INTERVAL_MS = 10_000; // n'envoie pas plus d'une position toutes les 10s

type TrackingStatus = 'idle' | 'requesting' | 'active' | 'error';

/**
 * Suit la position GPS du chauffeur en continu via navigator.geolocation.watchPosition
 * et l'envoie au serveur pour que l'admin puisse le suivre en direct sur la carte.
 *
 * Le statut du livreur (ACTIVE/INACTIVE) est mis à jour en même temps, pour que
 * "en ligne" côté chauffeur corresponde à "disponible" côté admin.
 */
export function useLocationTracking() {
  const [status, setStatus] = React.useState<TrackingStatus>('idle');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const watchIdRef = React.useRef<number | null>(null);
  const lastSentAtRef = React.useRef<number>(0);
  const wakeLockRef = React.useRef<any>(null);

  const isSupported = typeof window !== 'undefined' && 'geolocation' in navigator;

  // Empêche l'écran de s'éteindre pendant qu'une course est en ligne — sans
  // ça, un téléphone qui se verrouille en poche coupe le suivi GPS en
  // arrière-plan sur beaucoup de navigateurs mobiles. Ce n'est pas une
  // solution parfaite (ça ne remplace pas une vraie app native), mais ça
  // couvre le cas réel du chauffeur qui roule avec le téléphone visible.
  const acquireWakeLock = React.useCallback(async () => {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
    try {
      wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
    } catch {
      // Refusé (ex: onglet en arrière-plan) — non-bloquant, le suivi GPS continue.
    }
  }, []);

  const releaseWakeLock = React.useCallback(async () => {
    try {
      await wakeLockRef.current?.release();
    } catch {
      // déjà relâché ou non supporté — sans conséquence
    }
    wakeLockRef.current = null;
  }, []);

  const sendPosition = React.useCallback(async (pos: GeolocationPosition) => {
    const rider = RiderAuthService.getRiderInfo();
    if (!rider) return;

    const now = Date.now();
    if (now - lastSentAtRef.current < MIN_SEND_INTERVAL_MS) return;
    lastSentAtRef.current = now;

    try {
      await api.post(`/api/riders/me/location`, {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        speed: pos.coords.speed ?? undefined,
        heading: pos.coords.heading ?? undefined,
      });
    } catch {
      // Un échec ponctuel d'envoi ne doit pas couper le suivi; le prochain ping réessaiera.
    }
  }, []);

  const setRiderStatus = React.useCallback(async (riderStatus: 'ACTIVE' | 'INACTIVE') => {
    const rider = RiderAuthService.getRiderInfo();
    if (!rider) return;
    try {
      await api.patch(`/api/riders/me/status`, { status: riderStatus });
    } catch {
      // non-bloquant : la position continuera d'être envoyée même si le statut n'a pas pu changer
    }
  }, []);

  const stop = React.useCallback(async (opts?: { keepPersisted?: boolean }) => {
    // On ne coupe jamais le partage de position pendant une course active :
    // l'admin doit pouvoir continuer à suivre le livreur jusqu'à la livraison.
    try {
      const myOrders = await RiderPortalService.getMyOrders();
      if (myOrders && myOrders.length > 0) {
        toast.error("Vous ne pouvez pas passer hors ligne pendant une course en cours.");
        return;
      }
    } catch {
      // si la vérification échoue, on ne bloque pas le passage hors ligne
    }

    if (watchIdRef.current !== null && isSupported) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    releaseWakeLock();
    setStatus('idle');
    if (!opts?.keepPersisted && typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    setRiderStatus('INACTIVE');
  }, [isSupported, setRiderStatus, releaseWakeLock]);

  const start = React.useCallback(async () => {
    if (!isSupported) {
      setErrorMessage("Ce téléphone/navigateur ne permet pas la géolocalisation.");
      setStatus('error');
      return;
    }

    setStatus('requesting');
    setErrorMessage(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setStatus('active');
        sendPosition(pos);
      },
      (err) => {
        setStatus('error');
        const message = err.code === err.PERMISSION_DENIED
          ? "Position refusée. Autorisez la géolocalisation dans les réglages du téléphone pour passer en ligne."
          : "Impossible d'obtenir la position (signal GPS faible ou coupé).";
        setErrorMessage(message);
        toast.error(message);
        if (err.code === err.PERMISSION_DENIED) {
          if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY);
          if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 15_000 }
    );

    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, '1');
    acquireWakeLock();

    // Ne pas écraser un statut "en course" (BUSY) : le passage en ligne ne
    // doit rendre le livreur "disponible" que s'il n'a pas déjà une course active.
    try {
      const myOrders = await RiderPortalService.getMyOrders();
      if (!myOrders || myOrders.length === 0) {
        setRiderStatus('ACTIVE');
      }
    } catch {
      setRiderStatus('ACTIVE');
    }
  }, [isSupported, sendPosition, setRiderStatus, acquireWakeLock]);

  // Le Wake Lock se relâche automatiquement quand l'onglet passe en
  // arrière-plan (comportement standard du navigateur) — on le reprend dès
  // que le chauffeur revient sur l'app, tant que le suivi est actif.
  React.useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && watchIdRef.current !== null) {
        acquireWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [acquireWakeLock]);

  // Reprend automatiquement le suivi si le chauffeur avait activé "en ligne"
  // avant de recharger la page ou de rouvrir l'app.
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const wasTracking = localStorage.getItem(STORAGE_KEY) === '1';
    if (wasTracking && RiderAuthService.getRiderInfo()) {
      start();
    }
    return () => {
      if (watchIdRef.current !== null && isSupported) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isOnline: status === 'active' || status === 'requesting',
    status,
    errorMessage,
    start,
    stop,
  };
}