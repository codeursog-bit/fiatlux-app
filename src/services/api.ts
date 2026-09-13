import axios, { AxiosInstance } from 'axios';

class ApiClient {
  private static instance: AxiosInstance;

  public static getInstance(): AxiosInstance {
    if (!ApiClient.instance) {
      ApiClient.instance = axios.create({
        baseURL: '', // Using relative paths
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Add request interceptors for Auth if needed
      ApiClient.instance.interceptors.request.use((config) => {
        if (typeof window !== 'undefined') {
          const isRiderRoute = config.url?.startsWith('/api/riders/me');
          const isPartnerRoute =
            config.url?.startsWith('/api/partners/') &&
            !config.url?.startsWith('/api/partners/auth');
          const token = isRiderRoute
            ? localStorage.getItem('fiatlux_rider_token')
            : isPartnerRoute
            ? localStorage.getItem('fiatlux_partner_token')
            : localStorage.getItem('fiatlux_token');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        return config;
      });

      // Add response interceptors for 401
      ApiClient.instance.interceptors.response.use(
        (response) => response,
        (error) => {
          if (error.response?.status === 401 && typeof window !== 'undefined') {
            // Ne pas se fier uniquement au préfixe d'URL : certaines routes
            // (ex. /api/admin/orders/[id]/status) sont partagées entre admin
            // et chauffeur assigné. On se base plutôt sur le contexte réel :
            // le header envoyé était-il le token rider, ou est-on dans
            // l'espace /chauffeur ?
            const sentRiderToken =
              typeof window !== 'undefined' &&
              error.config?.headers?.Authorization === `Bearer ${localStorage.getItem('fiatlux_rider_token')}` &&
              !!localStorage.getItem('fiatlux_rider_token');
            const isRiderRoute =
              error.config?.url?.startsWith('/api/riders/me') ||
              sentRiderToken ||
              window.location.pathname.startsWith('/chauffeur');

            if (isRiderRoute) {
              localStorage.removeItem('fiatlux_rider_token');
              localStorage.removeItem('fiatlux_rider_user');
              document.cookie = 'fiatlux_rider_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
              if (!window.location.pathname.includes('/chauffeur/login')) {
                window.location.href = '/chauffeur/login';
              }
              return Promise.reject(error);
            }

            const sentPartnerToken =
              typeof window !== 'undefined' &&
              error.config?.headers?.Authorization === `Bearer ${localStorage.getItem('fiatlux_partner_token')}` &&
              !!localStorage.getItem('fiatlux_partner_token');
            const isPartnerRoute =
              (error.config?.url?.startsWith('/api/partners/') &&
                !error.config?.url?.startsWith('/api/partners/auth')) ||
              sentPartnerToken ||
              window.location.pathname.startsWith('/partners');

            if (isPartnerRoute) {
              localStorage.removeItem('fiatlux_partner_token');
              localStorage.removeItem('fiatlux_partner_user');
              document.cookie = 'fiatlux_partner_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
              if (!window.location.pathname.includes('/partners/login')) {
                window.location.href = '/partners/login';
              }
              return Promise.reject(error);
            }

            localStorage.removeItem('fiatlux_token');
            localStorage.removeItem('fiatlux_user');
            // Clear cookie too
            document.cookie = 'fiatlux_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
            
            // Redirect to login if not already there
            if (!window.location.pathname.includes('/login')) {
              window.location.href = '/login';
            }
          }
          return Promise.reject(error);
        }
      );
    }
    return ApiClient.instance;
  }
}

export const api = ApiClient.getInstance();