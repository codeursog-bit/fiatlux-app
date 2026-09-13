import { api } from './api';
import { Delivery, DashboardStats, Activity, Alert, Rider, Customer, Transaction, PaymentStats, Vehicle, Partner, PartnerDetail } from '@/types';

export interface NearestRider {
  id: string;
  name: string;
  phone: string;
  vehiclePlate: string;
  distanceMeters: number;
}

export class DeliveryService {
  static async getDeliveries(): Promise<Delivery[]> {
    const { data } = await api.get<{ orders: Delivery[] }>('/api/admin/orders');
    return data.orders;
  }

  static async getPayments(): Promise<{ transactions: Transaction[], stats: PaymentStats }> {
    const [transactionsData, summaryData] = await Promise.all([
      api.get<{ orders: any[] }>('/api/admin/payments'),
      api.get<any>('/api/admin/payments/summary')
    ]);

    const CASH_METHODS = ['CASH_AT_PICKUP', 'CASH_AT_DELIVERY'];

    const transactions: Transaction[] = transactionsData.data.orders.map(t => ({
      id: t.id,
      orderId: t.id,
      orderNumber: t.trackingNumber,
      customerName: t.customer?.name || t.guestCustomerName || 'Client inconnu',
      amount: t.amount,
      method: CASH_METHODS.includes(t.paymentMethod) ? 'CASH' : 'ONLINE',
      rawMethod: t.paymentMethod,
      status: t.paymentStatus,
      date: t.createdAt
    }));

    const stats: PaymentStats = {
      totalCollectedToday: summaryData.data.todayCollected,
      pendingPayments: summaryData.data.pendingCount,
      platformPercentage: summaryData.data.platformPercentage,
      cashPercentage: summaryData.data.cashPercentage,
      overdueAmount: summaryData.data.overdueAmount,
      weeklyByMethod: summaryData.data.weeklyByMethod || [],
    };

    return { transactions, stats };
  }

  static async recordCashPayment(orderId: string): Promise<void> {
    await api.post(`/api/admin/payments/${orderId}/record-cash`);
  }

  static async getDeliveryById(id: string): Promise<Delivery> {
    const { data } = await api.get<Delivery>(`/api/admin/orders/${id}`);
    return data;
  }

  static async getDashboardStats(): Promise<DashboardStats> {
    const { data } = await api.get<DashboardStats>('/api/admin/dashboard/stats');
    return data;
  }

  static async getActivities(): Promise<Activity[]> {
    // We don't have a direct activities API yet, but we can use alerts or order history
    const { data } = await api.get<{ alerts: Alert[] }>('/api/admin/alerts');
    return data.alerts.map(a => ({
      id: a.id,
      type: 'VALIDATION',
      title: a.title,
      description: a.description,
      location: 'Système',
      timestamp: new Date(a.timestamp).toLocaleTimeString(),
      status: a.status
    }));
  }

  static async getAlerts(): Promise<Alert[]> {
    const { data } = await api.get<{ alerts: Alert[] }>('/api/admin/alerts');
    return data.alerts;
  }

  static async getRiders(filters?: { search?: string; status?: string }): Promise<Rider[]> {
    const { data } = await api.get<{ riders: Rider[] }>('/api/admin/riders', {
      params: { q: filters?.search, status: filters?.status, limit: 100 }
    });
    return data.riders;
  }

  static async setRiderPassword(riderId: string, password: string): Promise<void> {
    await api.post('/api/riders/auth/set-password', { riderId, password });
  }

  static async getRider(id: string): Promise<Rider & { orders: Delivery[] }> {
    const { data } = await api.get<Rider & { orders: Delivery[] }>(`/api/admin/riders/${id}`);
    return data;
  }

  static async getCustomers(): Promise<Customer[]> {
    const { data } = await api.get<{ customers: Customer[] }>('/api/admin/customers');
    return data.customers;
  }

  static async createCustomer(customer: Partial<Customer>): Promise<Customer> {
    const { data } = await api.post<Customer>('/api/admin/customers', customer);
    return data;
  }

  static async createRider(rider: Partial<Rider>): Promise<Rider> {
    const { data } = await api.post<Rider>('/api/admin/riders', rider);
    return data;
  }

  static async getOrders(filters?: { search?: string; status?: string; partnerId?: string }): Promise<Delivery[]> {
    const { data } = await api.get<{ orders: Delivery[] }>('/api/admin/orders', { 
      params: { q: filters?.search, status: filters?.status, partnerId: filters?.partnerId } 
    });
    return data.orders;
  }

  static async getOrder(id: string): Promise<Delivery> {
    const { data } = await api.get<Delivery>(`/api/admin/orders/${id}`);
    return data;
  }

  static async assignRider(orderId: string, riderId: string): Promise<Delivery> {
    const { data } = await api.post<Delivery>(`/api/admin/orders/${orderId}/assign`, { riderId });
    return data;
  }

  static async setOrderAmount(orderId: string, amount: number): Promise<Delivery> {
    const { data } = await api.patch<Delivery>(`/api/admin/orders/${orderId}`, { amount });
    return data;
  }

  static async getOrderClaims(orderId: string): Promise<any[]> {
    const { data } = await api.get(`/api/admin/orders/${orderId}/claims`);
    return data;
  }

  static async approveClaim(orderId: string, claimId: string): Promise<Delivery> {
    const { data } = await api.post<Delivery>(`/api/admin/orders/${orderId}/claims/${claimId}/approve`);
    return data;
  }

  static async rejectClaim(orderId: string, claimId: string): Promise<any> {
    const { data } = await api.post(`/api/admin/orders/${orderId}/claims/${claimId}/reject`);
    return data;
  }

  static async confirmCashReceivedByAdmin(orderId: string): Promise<any> {
    const { data } = await api.post(`/api/admin/orders/${orderId}/cash-received`, {});
    return data;
  }

  static async getNearestRiders(lat: number, lng: number, radius = 5000, limit = 10): Promise<NearestRider[]> {
    const { data } = await api.get<NearestRider[]>('/api/admin/riders/nearest', {
      params: { lat, lng, radius, limit },
    });
    return data;
  }

  static async createOrder(payload: any): Promise<Delivery> {
    const { data } = await api.post<Delivery>('/api/admin/orders', payload);
    return data;
  }

  static async getFleet(): Promise<Vehicle[]> {
    const { data } = await api.get<{ vehicles: Vehicle[] }>('/api/admin/vehicles');
    return data.vehicles;
  }

  static async getPartners(): Promise<Partner[]> {
    const { data } = await api.get<{ partners: Partner[] }>('/api/admin/partners');
    return data.partners;
  }

  static async getPartner(id: string): Promise<PartnerDetail> {
    const { data } = await api.get<PartnerDetail>(`/api/admin/partners/${id}`);
    return data;
  }

  static async createPartner(partner: Partial<Partner>): Promise<Partner> {
    const { data } = await api.post<Partner>('/api/admin/partners', partner);
    return data;
  }

  static async updatePartnerStatus(id: string, status: 'ACTIVE' | 'SUSPENDED'): Promise<Partner> {
    const { data } = await api.patch<Partner>(`/api/admin/partners/${id}`, { status });
    return data;
  }

  static async updatePartner(id: string, updates: Partial<Partner>): Promise<Partner> {
    const { data } = await api.patch<Partner>(`/api/admin/partners/${id}`, updates);
    return data;
  }

  static async deletePartner(id: string): Promise<any> {
    const { data } = await api.delete(`/api/admin/partners/${id}`);
    return data;
  }

  static async updateOrder(id: string, updates: any): Promise<Delivery> {
    const { data } = await api.patch<Delivery>(`/api/admin/orders/${id}`, updates);
    return data;
  }

  // Transition de statut (annulation, échec livraison...) — passe par le
  // même endpoint que l'appli chauffeur, pour que la state machine
  // (order-state-machine.ts) reste la seule source de vérité sur les
  // transitions autorisées, plutôt que de dupliquer cette logique ici.
  static async updateOrderStatus(id: string, status: string, note?: string): Promise<Delivery> {
    const { data } = await api.post<Delivery>(`/api/admin/orders/${id}/status`, { status, note });
    return data;
  }

  static async updateRider(id: string, updates: Partial<Rider>): Promise<Rider> {
    const { data } = await api.patch<Rider>(`/api/admin/riders/${id}`, updates);
    return data;
  }

  static async deleteRider(id: string): Promise<any> {
    const { data } = await api.delete(`/api/admin/riders/${id}`);
    return data;
  }

  static async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
    const { data } = await api.patch<Customer>(`/api/admin/customers/${id}`, updates);
    return data;
  }

  static async deleteCustomer(id: string): Promise<any> {
    const { data } = await api.delete(`/api/admin/customers/${id}`);
    return data;
  }

  static async updateVehicle(id: string, updates: Partial<Vehicle>): Promise<Vehicle> {
    const { data } = await api.patch<Vehicle>(`/api/admin/vehicles/${id}`, updates);
    return data;
  }

  static async deleteVehicle(id: string): Promise<any> {
    const { data } = await api.delete(`/api/admin/vehicles/${id}`);
    return data;
  }

  // Pricing
  static async getPricingZones(): Promise<any[]> {
    const { data } = await api.get('/api/admin/pricing/zones');
    return data;
  }

  static async createPricingZone(zoneName: string): Promise<any> {
    const { data } = await api.post('/api/admin/pricing/zones', { zoneName });
    return data;
  }

  static async saveZoneBoundary(zoneId: string, points: { lat: number; lng: number }[]): Promise<any> {
    const { data } = await api.patch(`/api/admin/pricing/zones/${zoneId}/boundary`, { points });
    return data;
  }

  static async deleteZoneBoundary(zoneId: string): Promise<any> {
    const { data } = await api.delete(`/api/admin/pricing/zones/${zoneId}/boundary`);
    return data;
  }

  static async updatePricingZone(id: string, zoneName: string): Promise<any> {
    const { data } = await api.patch(`/api/admin/pricing/zones/${id}`, { zoneName });
    return data;
  }

  static async deletePricingZone(id: string): Promise<any> {
    const { data } = await api.delete(`/api/admin/pricing/zones/${id}`);
    return data;
  }

  static async getPricingRules(): Promise<any[]> {
    const { data } = await api.get('/api/admin/pricing/rules');
    return data;
  }

  static async createPricingRule(rule: any): Promise<any> {
    const { data } = await api.post('/api/admin/pricing/rules', rule);
    return data;
  }

  static async updatePricingRule(id: string, rule: any): Promise<any> {
    const { data } = await api.patch(`/api/admin/pricing/rules/${id}`, rule);
    return data;
  }

  static async deletePricingRule(id: string): Promise<any> {
    const { data } = await api.delete(`/api/admin/pricing/rules/${id}`);
    return data;
  }
}