import { api } from './api';

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export class AuthService {
  static async login(email: string, password: string): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>('/api/auth/login', { email, password });
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('fiatlux_token', data.token);
      localStorage.setItem('fiatlux_user', JSON.stringify(data.user));
      // Le cookie fiatlux_token (lu par le middleware) est posé directement
      // par le serveur via Set-Cookie sur /api/auth/login — plus besoin de
      // le refaire ici, ça évite une course entre écriture client et
      // première navigation post-login.
    }
    
    return data;
  }

  static async me(): Promise<any> {
    const { data } = await api.get('/api/auth/me');
    return data;
  }

  static logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('fiatlux_token');
      localStorage.removeItem('fiatlux_user');
      document.cookie = 'fiatlux_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }
  }

  static isAuthenticated(): boolean {
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem('fiatlux_token');
    }
    return false;
  }
}