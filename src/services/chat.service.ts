import { api } from './api';

export class ChatService {
  // Côté chauffeur
  static async getMyMessages(): Promise<any[]> {
    const { data } = await api.get('/api/riders/me/messages');
    return data;
  }

  static async sendAsRider(content: string): Promise<any> {
    const { data } = await api.post('/api/riders/me/messages', { content });
    return data;
  }

  // Côté admin
  static async getConversations(): Promise<any[]> {
    const { data } = await api.get('/api/admin/messages');
    return data;
  }

  static async getConversation(riderId: string): Promise<any[]> {
    const { data } = await api.get(`/api/admin/messages/${riderId}`);
    return data;
  }

  static async sendAsAdmin(riderId: string, content: string): Promise<any> {
    const { data } = await api.post(`/api/admin/messages/${riderId}`, { content });
    return data;
  }
}
