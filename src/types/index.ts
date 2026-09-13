export enum OrderStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  ACCEPTED = 'ACCEPTED',
  EN_ROUTE_TO_PICKUP = 'EN_ROUTE_TO_PICKUP',
  AT_PICKUP = 'AT_PICKUP',
  PICKED_UP = 'PICKED_UP',
  IN_TRANSIT = 'IN_TRANSIT',
  AT_DROPOFF = 'AT_DROPOFF',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
}

export enum DeliveryStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  PICKED_UP = 'PICKED_UP',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export interface Location {
  lat: number;
  lng: number;
  address: string;
}

export interface Rider {
  id: string;
  name: string;
  phone: string;
  vehiclePlate: string;
  status: 'ACTIVE' | 'INACTIVE' | 'BUSY';
  currentLat?: number;
  currentLng?: number;
  currentAddress?: string;
  currentLocation?: Location; // Keep for compatibility
  deliveriesToday?: number;
  deliveriesMonth?: number;
  rating?: number;
  joinedAt?: string;
  updatedAt?: string;
  avatar?: string;
  orders?: Delivery[];
  alerts?: Alert[];
}

export interface Delivery {
  id: string;
  trackingNumber: string;
  customerName: string;
  customer?: { id: string; name: string };
  senderPhone?: string;
  pickupAddress: string;
  dropoffAddress: string;
  recipientName?: string;
  recipientPhone?: string;
  guestCustomerName?: string;
  guestCustomerPhone?: string;
  deliveryType?: 'SELF' | 'THIRD_PARTY';
  pickupControlMode?: 'AUTO' | 'MANUAL' | null;
  pickupLocation: Location;
  dropoffLocation: Location;
  packageDescription: string;
  amount: number;
  quotedManually?: boolean;
  paymentMethod: 'ONLINE' | 'ONLINE_MTN' | 'ONLINE_AIRTEL' | 'CASH_AT_PICKUP' | 'CASH_AT_DELIVERY';
  paymentStatus: 'PAID' | 'PENDING' | 'FAILED';
  cashPaymentSubtype?: 'SENDER_PAYS' | 'RECIPIENT_PAYS';
  status: OrderStatus;
  riderId?: string;
  rider?: Rider;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  pickupZone?: string;
  dropoffZone?: string;
  pickupLandmark?: string;
  dropoffLandmark?: string;
  pickupLandmarkId?: string;
  dropoffLandmarkId?: string;
  routeGeoJson?: { type: string; coordinates: [number, number][] } | null;
  packageWeight?: string;
  declaredValue?: number;
  senderToken?: string;
  recipientToken?: string;
  pickupOTP?: string;
  deliveryOTP?: string;
  pickupOTPValidated?: boolean;
  deliveryOTPValidated?: boolean;
  pickupPhotoUrl?: string;
  deliveryPhotoUrl?: string;
  riderRating?: number;
  riderReview?: string;
  eta?: string;
  statusHistory: { id: string; status: OrderStatus; note?: string; createdAt: string }[];
  // Confirmations client/livreur (remise, réception, paiement espèces) —
  // voir le modèle Confirmation côté Prisma. Utilisé notamment par la page
  // de détail commande admin pour savoir si le client a déjà confirmé
  // avoir payé avant d'afficher le bouton "Confirmer encaissement".
  confirmations?: { step: 'PICKUP' | 'DROPOFF' | 'CASH_PAYMENT'; actor: 'SENDER' | 'RECIPIENT' | 'RIDER'; action: 'CONFIRMED' | 'DISPUTED'; createdAt?: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface Alert {
  id: string;
  type: 'STALL' | 'DEVIATION' | 'OFFLINE' | 'PAYMENT';
  title: string;
  description: string;
  duration?: string;
  value?: string;
  riderId?: string;
  riderName?: string;
  orderId?: string;
  orderNumber?: string;
  status: 'ACTIVE' | 'RESOLVED';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  timestamp: string;
}

export interface Dispute {
  id: string;
  orderId: string;
  type: 'PICKUP_MISMATCH' | 'DROPOFF_MISMATCH' | 'PAYMENT_MISMATCH' | 'POST_DELIVERY_CLAIM';
  description: string;
  status: 'OPEN' | 'RESOLVED';
  resolution?: string | null;
  resolvedByUserId?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  order: {
    trackingNumber: string;
    status: string;
  };
}

export interface Activity {
  id: string;
  type: 'PICKUP' | 'DELIVERY' | 'PAYMENT' | 'ASSIGN' | 'VALIDATION' | 'ACCOUNT';
  title: string;
  description: string;
  location: string;
  timestamp: string;
  status: string;
}

export interface Customer {
  id: string;
  name: string;
  type: 'BUSINESS' | 'INDIVIDUAL';
  phone: string;
  email?: string;
  address?: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: string;
  businessDetails?: {
    contactPerson?: string;
    billingMethod: 'MONTHLY' | 'PER_ORDER';
  };
  createdAt: string;
}

export interface DashboardStats {
  totalDeliveries: number;
  activeRiders: number;
  pendingDeliveries: number;
  completedToday: number;
  activeAlerts: number;
  avgRating: number | null;
  ratingsCount: number;
  hourlyBreakdown: { hour: string; orders: number }[];
  weeklyRevenue: { name: string; total: number }[];
  statusDistribution: { name: string; value: number; color: string }[];
  avgPickupMinutes: number | null;
  completionRate: number | null;
  completedTodayTrend: number | null;
  deliveredCount30d: number;
  cancelledCount30d: number;
  topRiders: { id: string; name: string; rating: number | null; deliveries: number }[];
}

export interface Transaction {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  amount: number;
  method: 'ONLINE' | 'CASH';
  rawMethod: string;
  status: 'PAID' | 'PENDING' | 'FAILED';
  date: string;
}

export interface PaymentStats {
  totalCollectedToday: number;
  pendingPayments: number;
  platformPercentage: number;
  cashPercentage: number;
  overdueAmount: number;
  weeklyByMethod: { name: string; platform: number; cash: number }[];
}

export interface Vehicle {
  id: string;
  plate: string;
  model: string;
  assignedRiderId?: string;
  assignedRiderName?: string;
  status: 'IN_SERVICE' | 'MAINTENANCE' | 'OUT_OF_SERVICE';
  mileage: number;
  nextServiceDate: string;
}

export interface Partner {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  totalOrders: number;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
}

export interface PartnerOrderRow {
  id: string;
  trackingNumber: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  amount: number;
  pickupAddress: string;
  dropoffAddress: string;
  recipientName: string;
  recipientPhone: string;
  packageDescription: string;
  deliveryType: string;
  cancelReason?: string | null;
  failureReason?: string | null;
  createdAt: string;
  updatedAt: string;
  rider: { id: string; name: string; phone: string } | null;
}

export interface PartnerStats {
  totalOrders: number;
  deliveredCount: number;
  cancelledCount: number;
  activeCount: number;
  totalRevenue: number;
  lastOrderAt: string | null;
}

export interface PartnerDetail {
  partner: Omit<Partner, 'totalOrders'>;
  stats: PartnerStats;
  orders: PartnerOrderRow[];
}