import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminUser } from '../types';
import { adminApi } from '../api/admin';

export function useAdminAuth() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Verify authentication session via httpOnly cookie on load
  const verifySession = useCallback(async () => {
    const hasToken = typeof localStorage !== 'undefined' && !!localStorage.getItem('swiftsats_admin_token');
    const onLoginPage = typeof window !== 'undefined' && window.location.pathname.includes('/admin/login');

    if (!hasToken && onLoginPage) {
      setIsLoading(false);
      setUser(null);
      return;
    }

    setIsLoading(true);
    try {
      const res = await adminApi.getProfile();
      if (res.success && res.user) {
        setUser(res.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('swiftsats_admin_token');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    verifySession();
  }, [verifySession]);

  const login = useCallback((token: string, adminUser: AdminUser) => {
    try {
      localStorage.setItem('swiftsats_admin_token', token);
    } catch (_) {}
    setUser(adminUser);
  }, []);

  const logout = useCallback(async () => {
    try {
      localStorage.removeItem('swiftsats_admin_token');
      await adminApi.logout();
    } catch {
      // ignore network logout failures
    }
    setUser(null);
    navigate('/admin/login');
  }, [navigate]);

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    refetchSession: verifySession,
  };
}
