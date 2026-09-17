import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  customerAuthApi,
  CustomerUser,
  CustomerOrder,
} from '../api/customerAuth';

interface CustomerMetrics {
  total_orders: number;
  completed_orders: number;
  total_spent_ngn: string;
}

interface AuthContextType {
  user: CustomerUser | null;
  orders: CustomerOrder[];
  metrics: CustomerMetrics | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; full_name?: string; phone?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [metrics, setMetrics] = useState<CustomerMetrics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProfile = useCallback(async () => {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('swiftsats_customer_token') : null;
    if (!token) {
      setUser(null);
      setOrders([]);
      setMetrics(null);
      setIsLoading(false);
      return;
    }

    try {
      const data = await customerAuthApi.getMe();
      if (data.success) {
        setUser(data.user);
        setOrders(data.orders || []);
        setMetrics(data.metrics || null);
      }
    } catch {
      // Stale or invalid token
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('swiftsats_customer_token');
      }
      setUser(null);
      setOrders([]);
      setMetrics(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const login = async (email: string, password: string) => {
    const res = await customerAuthApi.login({ email, password });
    if (res.success && res.token) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('swiftsats_customer_token', res.token);
      }
      setUser(res.user);
      await refreshProfile();
    }
  };

  const register = async (data: { email: string; password: string; full_name?: string; phone?: string }) => {
    const res = await customerAuthApi.register(data);
    if (res.success && res.token) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('swiftsats_customer_token', res.token);
      }
      setUser(res.user);
      await refreshProfile();
    }
  };

  const logout = async () => {
    try {
      await customerAuthApi.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('swiftsats_customer_token');
      }
      setUser(null);
      setOrders([]);
      setMetrics(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        orders,
        metrics,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
