import { request } from './client';

export interface CustomerUser {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  is_active: boolean;
  is_email_verified: boolean;
  created_at: string;
}

export interface CustomerOrder {
  order_reference: string;
  coin: string;
  network: string;
  fiat_amount_ngn: string;
  salt_kobo_value?: number;
  fiat_amount_expected?: string;
  crypto_amount: string;
  quote_rate: string;
  masked_wallet_address: string;
  wallet_address: string;
  status: string;
  virtual_bank_name?: string;
  virtual_account_number?: string;
  virtual_account_name?: string;
  tx_hash?: string;
  explorer_url?: string;
  speed_metric_ms?: number;
  created_at: string;
  completed_at?: string;
}

export interface CustomerAuthResponse {
  success: boolean;
  message: string;
  token: string;
  user: CustomerUser;
}

export interface CustomerProfileResponse {
  success: boolean;
  user: CustomerUser;
  metrics: {
    total_orders: number;
    completed_orders: number;
    total_spent_ngn: string;
  };
  orders: CustomerOrder[];
}

export const customerAuthApi = {
  async register(data: {
    email: string;
    password: string;
    full_name?: string;
    phone?: string;
  }): Promise<CustomerAuthResponse> {
    return request<CustomerAuthResponse>('/api/v1/auth/customer/register/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async login(data: { email: string; password: string }): Promise<CustomerAuthResponse> {
    return request<CustomerAuthResponse>('/api/v1/auth/customer/login/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getMe(): Promise<CustomerProfileResponse> {
    return request<CustomerProfileResponse>('/api/v1/auth/customer/me/', {
      method: 'GET',
    });
  },

  async logout(): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>('/api/v1/auth/customer/logout/', {
      method: 'POST',
    });
  },
};
