import { api } from './api';

export interface RiderLoginResponse {
  token: string;
  rider: {
    id: string;
    name: string;
    phone: string;
    status: string;
  };
}

export class RiderAuthService {
  static async login(phone: string, password: string): Promise<RiderLoginResponse> {
    const { data } = await api.post<RiderLoginResponse>('/api/riders/auth/login', { phone, password });

    if (typeof window !== 'undefined') {
      localStorage.setItem('fiatlux_rider_token', data.token);
      localStorage.setItem('fiatlux_rider_user', JSON.stringify(data.rider));
      // Cookie séparé de fiatlux_token (admin/partenaire) pour que le
      // middleware protège /chauffeur/* indépendamment des autres espaces.
      document.cookie = `fiatlux_rider_token=${data.token}; path=/; max-age=604800; SameSite=Lax`;
    }

    return data;
  }

  static getRiderInfo(): RiderLoginResponse['rider'] | null {
    if (typeof window !== 'undefined') {
      const str = localStorage.getItem('fiatlux_rider_user');
      return str ? JSON.parse(str) : null;
    }
    return null;
  }

  static logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('fiatlux_rider_token');
      localStorage.removeItem('fiatlux_rider_user');
      document.cookie = 'fiatlux_rider_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }
  }

  static isAuthenticated(): boolean {
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem('fiatlux_rider_token');
    }
    return false;
  }
}
