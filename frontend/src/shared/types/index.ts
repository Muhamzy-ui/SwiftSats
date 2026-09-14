export type CoinCode =
  | 'BTC'
  | 'USDC'
  | 'BNB'
  | 'USDT_ERC20'
  | 'USDT_TRC20'
  | 'SOL'
  | 'USDT_BEP20'
  | 'ETH'
  | 'BCH'
  | 'TRX'
  | 'DOGE'
  | 'POL'
  | 'SHIB'
  | 'XLM'
  | 'USDC_BASE'
  | 'ALIPAY'
  | 'VENMO'
  | 'CASHAPP';

export type BlockchainNetwork =
  | 'BITCOIN'
  | 'ERC20'
  | 'TRC20'
  | 'SOLANA'
  | 'BEP20'
  | 'BASE'
  | 'BCH'
  | 'DOGE'
  | 'POLYGON'
  | 'STELLAR'
  | 'FIAT';

export type OrderStatus =
  | 'QUOTE_LOCKED'
  | 'AWAITING_PAYMENT'
  | 'VERIFYING'
  | 'PAYMENT_CONFIRMED'
  | 'PAYOUT_PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REFUNDED';

export type AdminRole = 'SUPER_ADMIN' | 'OPERATOR' | 'AUDITOR' | 'SUPPORT';

export interface LiveRate {
  coin: CoinCode;
  name: string;
  symbol: string;
  network: BlockchainNetwork;
  rate_ngn: string;
  price_usd?: string;
  usd_to_ngn_rate?: string;
  is_featured: boolean;
  is_coming_soon?: boolean;
  speed_category: 'Fastest' | 'Standard';
  estimated_delivery_time: string;
  min_amount_usd?: string;
  min_amount_ngn: string;
  max_amount_ngn: string;
  network_fee_crypto: string;
}

export interface QuoteCalculation {
  coin: CoinCode;
  fiat_amount_ngn: string;
  unit_rate_ngn: string;
  price_usd?: string;
  dollar_value?: string;
  usd_to_ngn_rate?: string;
  service_fee_usd?: string;
  service_fee_ngn?: string;
  network_fee_crypto: string;
  net_crypto_amount: string;
  network: BlockchainNetwork;
  speed_category: string;
  estimated_delivery_time: string;
}

export interface QuoteCreatedResponse {
  order_reference: string;
  coin: CoinCode;
  network: BlockchainNetwork;
  fiat_amount_ngn: string;
  crypto_amount: string;
  quote_rate: string;
  network_fee_crypto: string;
  quote_expires_at: string;
  expires_in_seconds: number;
  estimated_delivery_time: string;
}

export interface OrderPublic {
  order_reference: string;
  coin: CoinCode;
  network: BlockchainNetwork;
  fiat_amount_ngn: string;
  crypto_amount: string;
  quote_rate: string;
  service_fee_ngn: string;
  network_fee_crypto: string;
  masked_wallet_address: string;
  status: OrderStatus;
  quote_expires_at: string;
  seconds_remaining: number;
  virtual_bank_name: string | null;
  virtual_account_number: string | null;
  virtual_account_name: string | null;
  tx_hash: string | null;
  explorer_url: string;
  speed_metric_ms: number | null;
  created_at: string;
  completed_at: string | null;
}

export type OrderDetail = OrderPublic;

export interface OrderLockedResponse {
  success: boolean;
  order: OrderPublic;
  payment_instructions: PaymentInstructions;
}

export interface PaymentInstructions {
  bank_name: string;
  account_number: string;
  account_name: string;
  amount_ngn: string;
  order_reference: string;
  salt_kobo?: number;
  expires_at?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: AdminRole;
  is_two_factor_enabled: boolean;
  is_active: boolean;
  created_at: string;
}

export interface DashboardStats {
  total_orders_today: number;
  orders_growth_pct: number;
  total_volume_today: string;
  volume_growth_pct: number;
  pending_payouts: number;
  today_revenue: string;
  success_rate_pct: number;
  avg_speed_ms: number;
  payout_mode?: 'AUTOMATED' | 'MANUAL';
  settlement_bank_name?: string;
  settlement_account_number?: string;
  settlement_account_name?: string;
}

export interface TrendChartPoint {
  date: string;
  orders: number;
  volume: number;
  completed_volume: number;
}

export interface AdminOrderSummary {
  id: string;
  order_reference: string;
  coin: CoinCode;
  network: BlockchainNetwork;
  fiat_amount_ngn: string;
  crypto_amount: string;
  quote_rate: string;
  wallet_address: string;
  masked_wallet: string;
  status: OrderStatus;
  virtual_bank_name: string | null;
  virtual_account_number: string | null;
  paystack_reference: string | null;
  tx_hash: string | null;
  explorer_url: string;
  speed_metric_ms: number | null;
  created_at: string;
  payment_received_at: string | null;
  completed_at: string | null;
}

export interface AuditLogEntry {
  id: string;
  order_reference: string;
  from_state: string;
  to_state: string;
  actor: string;
  actor_id: string | null;
  ip_address: string | null;
  metadata: Record<string, unknown>;
  timestamp: string;
}

export interface AdminOrderDetail extends AdminOrderSummary {
  idempotency_key: string;
  user_email: string | null;
  ip_address: string | null;
  quote_expires_at: string;
  virtual_account_name: string | null;
  paystack_customer_code: string | null;
  quidax_payout_id: string | null;
  quidax_swap_id: string | null;
  payout_error: string | null;
  payout_initiated_at: string | null;
  updated_at: string;
  audit_logs: AuditLogEntry[];
}

export interface ServiceHealthItem {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  latency_ms: number;
  mode: string;
  last_check: string;
}

export interface SystemHealthData {
  services: ServiceHealthItem[];
  security: {
    mfa_enforced: boolean;
    session_timeout_minutes: number;
    active_admins: number;
    total_audit_events: number;
  };
}

export interface FunnelDonutItem {
  status: string;
  count: number;
  color: string;
}
