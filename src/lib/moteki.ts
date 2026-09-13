/**
 * Client Storefront Moteki — remplace la simulation Mtn/Airtel Money par
 * la vraie passerelle. Doc de référence : docs.moteki.co/fr/storefront.
 *
 * ⚠️ Points à vérifier avant mise en prod réelle (non confirmés par la
 * doc fournie) :
 * - Le code opérateur Airtel Congo est déduit par convention
 *   ("airtel-cg", sur le modèle de "mtn-cg" donné en exemple) — jamais
 *   confirmé explicitement. Vérifier via GET /storefront/payment-methods
 *   ou le dashboard Moteki avant d'activer Airtel en prod.
 * - Aucun paramètre return_url n'existe dans POST /storefront/checkout.
 *   On ouvre donc redirect_url dans un nouvel onglet et on continue de
 *   sonder le statut depuis l'onglet FiatLux d'origine, plutôt que de
 *   compter sur un retour automatique dont le mécanisme n'est pas
 *   documenté. À confirmer/ajuster si le comportement réel diffère.
 */

const MOTEKI_BASE_URL = 'https://api.moteki.co/api/v1';
const MOTEKI_API_KEY = process.env.MOTEKI_API_KEY || '';

async function motekiFetch(path: string, options: RequestInit = {}) {
  if (!MOTEKI_API_KEY) {
    throw new Error('MOTEKI_API_KEY non configurée');
  }

  const res = await fetch(`${MOTEKI_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${MOTEKI_API_KEY}`,
      ...options.headers,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    const message = data?.error || data?.message || `Erreur Moteki (${res.status})`;
    throw new Error(message);
  }

  return data;
}

export type MobileMoneyOperator = 'MTN' | 'AIRTEL';

function operatorCode(operator: MobileMoneyOperator): string {
  // "mtn-cg" confirmé par la doc. "airtel-cg" déduit par convention —
  // voir avertissement en tête de fichier.
  return operator === 'MTN' ? 'mtn-cg' : 'airtel-cg';
}

export interface MotekiCheckoutParams {
  productUuid: string;
  customerFirstName: string;
  customerLastName?: string;
  customerPhone: string;
  customerEmail?: string;
  operator: MobileMoneyOperator;
  notes?: string;
}

export interface MotekiCheckoutResult {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  redirectUrl: string | null;
  totalAmount: number;
}

export async function initiateMotekiCheckout(params: MotekiCheckoutParams): Promise<MotekiCheckoutResult> {
  const data = await motekiFetch('/storefront/checkout', {
    method: 'POST',
    body: JSON.stringify({
      items: [{ product_uuid: params.productUuid, quantity: 1 }],
      customer_first_name: params.customerFirstName,
      customer_last_name: params.customerLastName,
      customer_phone: params.customerPhone,
      customer_email: params.customerEmail,
      shipping_country: 'CG',
      payment_method: 'mobile_money',
      payment_operator: operatorCode(params.operator),
      notes: params.notes,
    }),
  });

  return {
    orderNumber: data.order_number,
    status: data.status,
    paymentStatus: data.payment_status,
    redirectUrl: data.redirect_url || data.instructions_url || data.checkout_url || null,
    totalAmount: data.total_amount,
  };
}

export interface MotekiOrderStatus {
  status: string;
  paymentStatus: 'pending' | 'awaiting_payment' | 'paid' | 'failed' | 'refunded';
}

export async function getMotekiOrderStatus(orderNumber: string): Promise<MotekiOrderStatus> {
  const data = await motekiFetch(`/storefront/orders/${orderNumber}`);
  return {
    status: data.status,
    paymentStatus: data.payment_status,
  };
}
