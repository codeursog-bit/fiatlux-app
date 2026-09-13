import { api } from './api';

export class RiderPortalService {
  static async getMyOrders(): Promise<any[]> {
    const { data } = await api.get('/api/riders/me/orders');
    return data;
  }

  static async getMyOrderHistory(page = 1, pageSize = 20): Promise<any> {
    const { data } = await api.get('/api/riders/me/orders/history', { params: { page, pageSize } });
    return data;
  }

  static async getMyOrder(id: string): Promise<any> {
    const { data } = await api.get(`/api/riders/me/orders/${id}`);
    return data;
  }

  static async getAvailableOrders(): Promise<any[]> {
    const { data } = await api.get('/api/riders/me/available-orders');
    return data;
  }

  static async claimOrder(id: string): Promise<any> {
    const { data } = await api.post(`/api/riders/me/available-orders/${id}/claim`);
    return data;
  }

  static async getStats(): Promise<{
    today: { deliveries: number; amount: number };
    week: { deliveries: number; amount: number };
    month: { deliveries: number; amount: number };
    rating: number;
    totalDeliveriesAllTime: number;
  }> {
    const { data } = await api.get('/api/riders/me/stats');
    return data;
  }

  // Ces deux endpoints vivent sous /api/admin/orders (route générique
  // partagée admin + rider assigné, cf. requireAuth() sans restriction de
  // rôle dans la route). L'intercepteur axios de api.ts ne bascule sur le
  // token rider (fiatlux_rider_token) que pour les URLs commençant par
  // /api/riders/me — donc ici on force explicitement le header avec le
  // token rider, sinon la requête part sans auth (ou avec le token admin,
  // absent côté chauffeur) et prend un 401.
  static async updateOrderStatus(id: string, status: string, lat?: number, lng?: number): Promise<any> {
    const { data } = await api.post(
      `/api/admin/orders/${id}/status`,
      { status, lat, lng },
      { headers: RiderPortalService.riderAuthHeader() }
    );
    return data;
  }

  static async confirmCashReceived(id: string, lat?: number, lng?: number): Promise<any> {
    const { data } = await api.post(
      `/api/admin/orders/${id}/cash-received`,
      { lat, lng },
      { headers: RiderPortalService.riderAuthHeader() }
    );
    return data;
  }

  private static riderAuthHeader(): Record<string, string> {
    if (typeof window === 'undefined') return {};
    const token = localStorage.getItem('fiatlux_rider_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  static async createManualOrder(payload: { description: string; amount: number; note?: string; lat: number; lng: number }): Promise<any> {
    const { data } = await api.post('/api/riders/me/manual-order', payload);
    return data;
  }
}

export type GeoErrorReason = 'unsupported' | 'insecure' | 'denied' | 'unavailable' | 'timeout';

type GeoResult =
  | { ok: true; position: { lat: number; lng: number } }
  | { ok: false; reason: GeoErrorReason };

const locateOnce = (options: PositionOptions): Promise<GeolocationPosition> =>
  new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });

// Version détaillée : distingue pourquoi la position n'a pas pu être obtenue
// (permission refusée, http:// non sécurisé, GPS indisponible, timeout...)
// au lieu de tout ramener à un simple null. Reprend le pattern déjà en place
// dans reperes/page.tsx et landmark-autocomplete.tsx : 1ère tentative en
// haute précision avec un délai généreux, repli sur la précision réseau si
// ça échoue pour une raison autre qu'un refus de permission.
export async function getCurrentPositionWithReason(): Promise<GeoResult> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return { ok: false, reason: 'unsupported' };
  }
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return { ok: false, reason: 'insecure' };
  }

  try {
    const pos = await locateOnce({ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
    return { ok: true, position: { lat: pos.coords.latitude, lng: pos.coords.longitude } };
  } catch (firstErr: any) {
    if (firstErr.code === firstErr.PERMISSION_DENIED) {
      return { ok: false, reason: 'denied' };
    }
    try {
      const pos = await locateOnce({ enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 });
      return { ok: true, position: { lat: pos.coords.latitude, lng: pos.coords.longitude } };
    } catch (secondErr: any) {
      return { ok: false, reason: secondErr.code === secondErr.TIMEOUT ? 'timeout' : 'unavailable' };
    }
  }
}

export function geoErrorMessage(reason: GeoErrorReason): string {
  switch (reason) {
    case 'unsupported':
      return "La géolocalisation n'est pas supportée par ce navigateur.";
    case 'insecure':
      return 'La géolocalisation nécessite une connexion sécurisée (HTTPS) — impossible en http:// hors localhost.';
    case 'denied':
      return "Localisation refusée pour cette appli — vérifiez l'autorisation du navigateur/site (pas seulement le GPS du téléphone) dans ses paramètres.";
    case 'timeout':
      return 'Le GPS met trop de temps à répondre — sortez à l\'air libre ou réessayez.';
    case 'unavailable':
    default:
      return "Position GPS indisponible pour le moment — réessayez dans quelques secondes.";
  }
}

// Conservée pour compatibilité avec les appelants existants qui tolèrent un
// simple null (courses/[id]/page.tsx). Utilisez getCurrentPositionWithReason
// si vous devez afficher un message d'erreur précis à l'utilisateur.
export async function getCurrentPosition(): Promise<{ lat: number; lng: number } | null> {
  const result = await getCurrentPositionWithReason();
  return result.ok ? result.position : null;
}