export interface LocalTrackedOrder {
  order_reference: string;
  coin: string;
  amount_ngn: string | number;
  crypto_amount: string | number;
  status: string;
  timestamp: number;
  tx_hash?: string;
  explorer_url?: string;
}

const STORAGE_KEY = 'swiftsats_tracked_orders';

export function getStoredRecentOrders(): LocalTrackedOrder[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function storeRecentOrder(order: Partial<LocalTrackedOrder> & { order_reference: string }): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const existing = getStoredRecentOrders();
    const filtered = existing.filter((o) => o.order_reference !== order.order_reference);
    const updated: LocalTrackedOrder = {
      order_reference: order.order_reference,
      coin: order.coin || 'BTC',
      amount_ngn: order.amount_ngn || '0',
      crypto_amount: order.crypto_amount || '0',
      status: order.status || 'QUOTE_LOCKED',
      timestamp: order.timestamp || Date.now(),
      tx_hash: order.tx_hash,
      explorer_url: order.explorer_url,
    };
    const nextList = [updated, ...filtered].slice(0, 10);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextList));
  } catch {
    // Ignore storage errors
  }
}

export function updateStoredOrderStatus(order_reference: string, status: string, tx_hash?: string, explorer_url?: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const existing = getStoredRecentOrders();
    const item = existing.find((o) => o.order_reference === order_reference);
    if (item) {
      item.status = status;
      if (tx_hash) item.tx_hash = tx_hash;
      if (explorer_url) item.explorer_url = explorer_url;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    }
  } catch {
    // Ignore storage errors
  }
}

export function cancelStoredOrder(order_reference: string): void {
  updateStoredOrderStatus(order_reference, 'CANCELLED');
}

/**
 * Returns the most recent open order on this device if one exists.
 * An open order has status 'AWAITING_PAYMENT' or 'QUOTE_LOCKED'
 * and was created within the active operational window (60 minutes).
 */
export function getOpenOrder(): LocalTrackedOrder | null {
  const orders = getStoredRecentOrders();
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;

  const open = orders.find((o) => {
    const isOpenStatus = o.status === 'AWAITING_PAYMENT' || o.status === 'QUOTE_LOCKED';
    const isRecent = !o.timestamp || (now - o.timestamp) < ONE_HOUR;
    return isOpenStatus && isRecent;
  });

  return open || null;
}
