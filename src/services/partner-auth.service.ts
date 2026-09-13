import { api } from './api';

export interface PartnerLoginResponse {
  token: string;
  partner: {
    id: string;
    companyName: string;
    email: string;
  };
}

export class PartnerAuthService {
  static async login(email: string, password: string): Promise<PartnerLoginResponse> {
    const { data } = await api.post<PartnerLoginResponse>('/api/partners/auth/login', { email, password });
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('fiatlux_partner_token', data.token);
      localStorage.setItem('fiatlux_partner_user', JSON.stringify(data.partner));
      // Cookie séparé de fiatlux_token (admin) pour que le middleware et
      // l'intercepteur API protègent /partners/* indépendamment de l'admin,
      // sur le même principe que fiatlux_rider_token pour le chauffeur.
      document.cookie = `fiatlux_partner_token=${data.token}; path=/; max-age=604800; SameSite=Lax`;
    }
    
    return data;
  }

  static getPartnerInfo(): any {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('fiatlux_partner_user');
      return userStr ? JSON.parse(userStr) : null;
    }
    return null;
  }

  static logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('fiatlux_partner_token');
      localStorage.removeItem('fiatlux_partner_user');
      document.cookie = 'fiatlux_partner_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }
  }

  static isAuthenticated(): boolean {
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem('fiatlux_partner_token');
    }
    return false;
  }
}