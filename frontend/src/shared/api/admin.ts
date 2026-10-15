import { request } from './client';
import {
  AdminUser,
  DashboardStats,
  TrendChartPoint,
  AdminOrderSummary,
  AdminOrderDetail,
  SystemHealthData,
  FunnelDonutItem,
} from '../types';

export interface AdminLoginInitResponse {
  success: boolean;
  message: string;
  requires_2fa: boolean;
  temp_session_token?: string;
  user_email?: string;
  token?: string;
  user?: AdminUser;
}

export interface AdminLoginVerifyResponse {
  success: boolean;
  message: string;
  token: string;
  user: AdminUser;
}

export interface OrdersListResponse {
  success: boolean;
  summary: {
    total: number;
    completed: number;
    pending: number;
    failed: number;
  };
  pagination: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
  results: AdminOrderSummary[];
}

export const adminApi = {
  /** Step 1: Admin login init with password */
  async loginInit(email: string, password: string): Promise<AdminLoginInitResponse> {
    return request<AdminLoginInitResponse>('/api/v1/auth/login/init/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  /** Step 2: 2FA TOTP verification (Sets secure httpOnly cookie) */
  async verify2FA(email: string, tempSessionToken: string, totpCode: string): Promise<AdminLoginVerifyResponse> {
    return request<AdminLoginVerifyResponse>('/api/v1/auth/login/verify-2fa/', {
      method: 'POST',
      body: JSON.stringify({
        email,
        temp_session_token: tempSessionToken,
        totp_code: totpCode,
      }),
    });
  },

  /** Log out and clear httpOnly cookie */
  async logout(): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>('/api/v1/auth/logout/', {
      method: 'POST',
    });
  },

  /** Get authenticated admin profile */
  async getProfile(): Promise<{ success: boolean; user: AdminUser; totp_uri: string }> {
    return request<{ success: boolean; user: AdminUser; totp_uri: string }>('/api/v1/auth/profile/');
  },

  /** Dashboard metrics and trend chart data */
  async getDashboard(params?: { timeframe?: 'today' | 'yesterday' | '3d' | '7d' | '30d' }): Promise<{
    success: boolean;
    stats: DashboardStats;
    charts: { orders_trend: TrendChartPoint[] };
    recent_activity: AdminOrderSummary[];
  }> {
    const query = params?.timeframe ? `?timeframe=${params.timeframe}` : '';
    return request<{
      success: boolean;
      stats: DashboardStats;
      charts: { orders_trend: TrendChartPoint[] };
      recent_activity: AdminOrderSummary[];
    }>(`/api/v1/admin/dashboard/${query}`);
  },

  /** Filtered order list */
  async getOrders(params: {
    page?: number;
    page_size?: number;
    status?: string;
    coin?: string;
    search?: string;
    date_from?: string;
    date_to?: string;
  } = {}): Promise<OrdersListResponse> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params.status && params.status !== 'ALL') searchParams.set('status', params.status);
    if (params.coin && params.coin !== 'ALL') searchParams.set('coin', params.coin);
    if (params.search) searchParams.set('search', params.search);
    if (params.date_from) searchParams.set('date_from', params.date_from);
    if (params.date_to) searchParams.set('date_to', params.date_to);

    return request<OrdersListResponse>(`/api/v1/admin/orders/?${searchParams.toString()}`);
  },

  /** Detailed single order inspection */
  async getOrderDetail(orderId: string): Promise<{ success: boolean; order: AdminOrderDetail }> {
    return request<{ success: boolean; order: AdminOrderDetail }>(`/api/v1/admin/orders/${orderId}/`);
  },

  /** Payment funnel monitor */
  async getPaymentMonitor(): Promise<{
    success: boolean;
    funnel: Record<string, number>;
    donut_data: FunnelDonutItem[];
    live_feed: AdminOrderSummary[];
  }> {
    return request<{
      success: boolean;
      funnel: Record<string, number>;
      donut_data: FunnelDonutItem[];
      live_feed: AdminOrderSummary[];
    }>('/api/v1/admin/payment-monitor/');
  },

  /** Quidax payout history */
  async getPayouts(): Promise<{
    success: boolean;
    metrics: { total_payouts: number; total_crypto_volume_ngn: string };
    payouts: AdminOrderSummary[];
  }> {
    return request<{
      success: boolean;
      metrics: { total_payouts: number; total_crypto_volume_ngn: string };
      payouts: AdminOrderSummary[];
    }>('/api/v1/admin/payouts/');
  },

  /** Disputes queue */
  async getDisputes(): Promise<{
    success: boolean;
    count: number;
    disputes: AdminOrderSummary[];
  }> {
    return request<{
      success: boolean;
      count: number;
      disputes: AdminOrderSummary[];
    }>('/api/v1/admin/disputes/');
  },

  /** Resolve dispute action */
  async resolveDispute(
    orderId: string,
    action: 'RETRY_PAYOUT' | 'MARK_REFUNDED' | 'FLAG_SUSPICIOUS' | 'CANCEL',
    notes?: string
  ): Promise<{ success: boolean; message: string; order: AdminOrderDetail }> {
    return request<{ success: boolean; message: string; order: AdminOrderDetail }>(
      `/api/v1/admin/disputes/${orderId}/action/`,
      {
        method: 'POST',
        body: JSON.stringify({ action, notes }),
      }
    );
  },

  /** Analytics aggregation */
  async getAnalytics(): Promise<{
    success: boolean;
    coin_distribution: Array<{
      coin: string;
      name: string;
      symbol: string;
      network: string;
      orders_count: number;
      volume_ngn: number;
      share_pct: number;
    }>;
    avg_order_size_ngn: number;
    peak_hours: Array<{ hour: string; orders: number }>;
  }> {
    return request('/api/v1/admin/analytics/');
  },

  /** Reports export */
  async generateReport(params: {
    date_from?: string;
    date_to?: string;
    coin?: string;
    status?: string;
    export_format?: 'json' | 'csv';
  }): Promise<Blob | { success: boolean; count: number; results: AdminOrderSummary[] }> {
    return request('/api/v1/admin/reports/', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  /** Live system health indicators */
  async getSystemHealth(): Promise<SystemHealthData> {
    return request<SystemHealthData>('/api/v1/admin/settings/');
  },

  /** Toggle or update 24/7 automation payout mode and settlement bank details */
  async updatePayoutMode(data: {
    payout_mode?: 'AUTOMATED' | 'MANUAL';
    settlement_bank_name?: string;
    settlement_account_number?: string;
    settlement_account_name?: string;
  }): Promise<{ success: boolean; payout_mode: string; message: string }> {
    return request('/api/v1/admin/settings/payout-mode/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /** Get complete platform & notification settings */
  async getPlatformSettings(): Promise<{
    success: boolean;
    payout_mode: 'AUTOMATED' | 'MANUAL';
    hot_wallet_address?: string;
    hot_wallet_address_solana?: string;
    hot_wallet_address_bitcoin?: string;
    hot_wallet_address_tron?: string;
    addresses_by_coin?: Record<string, string>;
    use_paystack_virtual_accounts: boolean;
    settlement_bank_name: string;
    settlement_account_name: string;
    settlement_account_number: string;
    telegram_alerts_enabled: boolean;
    telegram_bot_token: string;
    telegram_admin_chat_id: string;
  }> {
    return request('/api/v1/admin/settings/payout-mode/');
  },

  /** Update platform & notification settings */
  async updatePlatformSettings(data: {
    payout_mode?: 'AUTOMATED' | 'MANUAL';
    coin?: string;
    hot_wallet_address?: string;
    use_paystack_virtual_accounts?: boolean;
    settlement_bank_name?: string;
    settlement_account_number?: string;
    settlement_account_name?: string;
    telegram_alerts_enabled?: boolean;
    telegram_bot_token?: string;
    telegram_admin_chat_id?: string;
  }): Promise<{
    success: boolean;
    message: string;
    hot_wallet_address?: string;
    addresses_by_coin?: Record<string, string>;
  }> {
    return request('/api/v1/admin/settings/payout-mode/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /** Check real-time on-chain float and gas balance of platform wallet */
  async getHotWalletBalance(coin: string = 'USDT_BEP20', address?: string): Promise<{
    success: boolean;
    wallet_address: string;
    token_balance: string;
    gas_balance: string;
    gas_symbol: string;
    has_gas: boolean;
    is_configured: boolean;
    has_private_key: boolean;
    coin: string;
    network: string;
    price_usd?: string;
    usd_value?: string;
    gas_price_usd?: string;
    gas_usd_value?: string;
    usd_to_ngn_rate?: string;
    ngn_value?: string;
  }> {
    const params = new URLSearchParams({ coin });
    if (address) params.set('address', address);
    return request(`/api/v1/admin/settings/hot-wallet-balance/?${params.toString()}`);
  },

  /** Send instant test ping to admin's phone via Telegram */
  async testTelegramAlert(payload?: { bot_token?: string; chat_id?: string; save?: boolean }): Promise<{ success: boolean; message?: string; error?: string }> {
    return request('/api/v1/admin/settings/test-telegram/', {
      method: 'POST',
      body: payload ? JSON.stringify(payload) : undefined,
    });
  },

  /** Get VAPID public key for native browser Web Push */
  async getWebPushVapidKey(): Promise<{ success: boolean; vapid_public_key: string }> {
    return request('/api/v1/admin/webpush/vapid-key/');
  },

  /** Register this browser/device for native lockscreen push alerts */
  async subscribeWebPush(data: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
    device_info?: string;
  }): Promise<{ success: boolean; message: string }> {
    return request('/api/v1/admin/webpush/subscribe/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /** Unregister this browser/device from push alerts */
  async unsubscribeWebPush(endpoint: string): Promise<{ success: boolean; message: string }> {
    return request('/api/v1/admin/webpush/unsubscribe/', {
      method: 'POST',
      body: JSON.stringify({ endpoint }),
    });
  },

  /** Send immediate test push alert to this phone/computer */
  async testWebPush(): Promise<{ success: boolean; delivered_to: number; message: string; error?: string }> {
    return request('/api/v1/admin/webpush/test/', {
      method: 'POST',
    });
  },

  /** 1-Tap manual release of crypto to customer wallet (or manual tx_hash dispatch) */
  async releaseOrder(orderReference: string, txHash?: string): Promise<{ success: boolean; message: string; tx_hash?: string; error?: string; payout_error?: string; status: string }> {
    return request(`/api/v1/admin/orders/${orderReference}/release/`, {
      method: 'POST',
      body: txHash ? JSON.stringify({ tx_hash: txHash }) : undefined,
    });
  },

  /** Query Quidax / blockchain to verify if crypto has landed on-chain */
  async verifyOrderPayout(orderReference: string): Promise<{ success: boolean; status: string; tx_hash?: string; message: string; payout_error?: string }> {
    return request(`/api/v1/admin/orders/${orderReference}/verify/`, {
      method: 'POST',
    });
  },

  /** Wipe orders and clear the ledger (Super Admin only). target: 'completed' | 'all' | 'test_only' */
  async purgeOrders(target: 'completed' | 'all' | 'test_only' = 'test_only'): Promise<{ success: boolean; message: string; purged_count: number; target: string }> {
    return request('/api/v1/admin/orders/purge/', {
      method: 'POST',
      body: JSON.stringify({ target, purge_all: target === 'all' }),
    });
  },

  /** Wipe all mock / test orders and clear the ledger (Super Admin only) */
  async purgeTestOrders(): Promise<{ success: boolean; message: string; purged_count: number }> {
    return this.purgeOrders('test_only');
  },

  /** Fetch registered customer accounts and statistics */
  async getCustomers(search?: string): Promise<{ success: boolean; total_count: number; customers: AdminCustomer[] }> {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return request(`/api/v1/admin/customers/${query}`);
  },

  /** Fetch linked websites / partner integrations & live financial statistics */
  async getPartners(): Promise<AdminPartnersResponse> {
    return request('/api/v1/admin/partners/');
  },

  /** Register a new linked website integration */
  async createPartner(data: { name: string; code?: string; website_url?: string; notes?: string }): Promise<{ success: boolean; message: string; partner: AdminPartner }> {
    return request('/api/v1/admin/partners/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /** 1-Tap activate / deactivate partner integration */
  async togglePartner(code: string): Promise<{ success: boolean; message: string; code: string; is_active: boolean }> {
    return request(`/api/v1/admin/partners/${code}/toggle/`, {
      method: 'POST',
    });
  },

  /** Remove linked website integration */
  async deletePartner(code: string): Promise<{ success: boolean; message: string }> {
    return request(`/api/v1/admin/partners/${code}/`, {
      method: 'DELETE',
    });
  },
};

export interface AdminCustomer {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  is_active: boolean;
  is_email_verified: boolean;
  total_orders: number;
  completed_orders: number;
  total_spent_ngn: number;
  created_at: string;
}

export interface AdminPartner {
  id: number;
  name: string;
  code: string;
  is_active: boolean;
  website_url?: string;
  commission_rate_pct: number;
  notes?: string;
  total_orders: number;
  completed_orders: number;
  total_volume_ngn: number;
  total_profit_ngn: number;
  conversion_rate_pct: number;
  deep_link_base: string;
  deep_link_usdt: string;
  created_at: string;
}

export interface AdminPartnersResponse {
  success: boolean;
  summary: {
    total_partners: number;
    active_partners: number;
    total_volume_ngn: number;
    total_profit_ngn: number;
    total_orders: number;
  };
  chart_data: Array<{
    name: string;
    code: string;
    volume: number;
    profit: number;
    is_active: boolean;
  }>;
  partners: AdminPartner[];
  recent_orders: any[];
}
