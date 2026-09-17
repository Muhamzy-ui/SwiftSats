import { request } from './client';
import {
  LiveRate,
  QuoteCalculation,
  QuoteCreatedResponse,
  OrderPublic,
  PaymentInstructions,
  CoinCode,
} from '../types';

export const ordersApi = {
  /** Fetch all live cryptocurrency rates from Quidax */
  async getLiveRates(): Promise<{ success: boolean; rates: LiveRate[] }> {
    return request<{ success: boolean; rates: LiveRate[] }>('/api/v1/exchange/rates/');
  },

  /** Calculate quote estimate */
  async calculateQuote(coin: CoinCode, amountNgn: string | number): Promise<{ success: boolean; data: QuoteCalculation }> {
    return request<{ success: boolean; data: QuoteCalculation }>(
      `/api/v1/exchange/calculate/?coin=${coin}&amount_ngn=${amountNgn}`
    );
  },

  /** Generate locked price quote */
  async createQuote(coin: CoinCode, amountNgn: number): Promise<QuoteCreatedResponse> {
    return request<QuoteCreatedResponse>('/api/v1/orders/quote/', {
      method: 'POST',
      body: JSON.stringify({ coin, amount_ngn: amountNgn }),
    });
  },

  /** Lock quote, submit wallet, and obtain one-time Paystack virtual account */
  async lockAndPay(orderReference: string, walletAddress: string, userEmail?: string): Promise<{
    success: boolean;
    order: OrderPublic;
    payment_instructions: PaymentInstructions;
  }> {
    return request<{
      success: boolean;
      order: OrderPublic;
      payment_instructions: PaymentInstructions;
    }>('/api/v1/orders/create/', {
      method: 'POST',
      body: JSON.stringify({
        order_reference: orderReference,
        wallet_address: walletAddress,
        user_email: userEmail || undefined,
      }),
    });
  },

  /** Alias for lockAndPay */
  async lockAndCreateOrder(orderReference: string, walletAddress: string, userEmail?: string) {
    return this.lockAndPay(orderReference, walletAddress, userEmail);
  },

  /** Alias for getOrderStatus */
  async lookupOrder(orderReference: string) {
    return this.getOrderStatus(orderReference);
  },

  /** Real-time status lookup for an order */
  async getOrderStatus(orderReference: string): Promise<{ success: boolean; order: OrderPublic }> {
    return request<{ success: boolean; order: OrderPublic }>(`/api/v1/orders/${orderReference}/`);
  },

  /** Cancel an open/unpaid order */
  async cancelOrder(orderReference: string): Promise<{ success: boolean; message: string; order?: OrderPublic }> {
    return request<{ success: boolean; message: string; order?: OrderPublic }>(`/api/v1/orders/${orderReference}/cancel/`, {
      method: 'POST',
    });
  },

  /** Simulate payment in development mode */
  async simulatePayment(orderReference: string): Promise<{ success: boolean; message: string; order: unknown }> {
    return request<{ success: boolean; message: string; order: unknown }>('/api/v1/payments/simulate-payment/', {
      method: 'POST',
      body: JSON.stringify({ order_reference: orderReference }),
    });
  },

  /** Submit bank transfer receipt image */
  async submitReceipt(orderReference: string, file: File): Promise<{ success: boolean; message: string; status: string }> {
    const formData = new FormData();
    formData.append('order_reference', orderReference);
    formData.append('receipt_file', file);

    const res = await fetch('/api/v1/payments/submit-receipt/', {
      method: 'POST',
      body: formData,
    });
    return res.json();
  },

  /** Fetch live public telemetry of recent platform orders (in-process and completed) */
  async getRecentTelemetryOrders(): Promise<{
    success: boolean;
    in_process: Partial<OrderPublic>[];
    completed: Partial<OrderPublic>[];
  }> {
    return request<{
      success: boolean;
      in_process: Partial<OrderPublic>[];
      completed: Partial<OrderPublic>[];
    }>('/api/v1/orders/recent/');
  },

  /** Request a 6-digit OTP to user's email to recover their private orders */
  async sendEmailOTP(email: string): Promise<{ success: boolean; message: string; email?: string; order_count?: number }> {
    return request<{ success: boolean; message: string; email?: string; order_count?: number }>('/api/v1/orders/auth/send-otp/', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  /** Verify OTP and retrieve user's private orders */
  async verifyEmailOTP(email: string, otp: string): Promise<{
    success: boolean;
    message: string;
    email?: string;
    orders?: Partial<OrderPublic>[];
  }> {
    return request<{
      success: boolean;
      message: string;
      email?: string;
      orders?: Partial<OrderPublic>[];
    }>('/api/v1/orders/auth/verify-otp/', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
  },
};
