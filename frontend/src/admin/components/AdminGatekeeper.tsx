import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { NotFoundPage } from '../../shared/components/NotFoundPage';

interface AdminGatekeeperProps {
  children: React.ReactNode;
  isDedicatedEntry?: boolean;
}

export const AdminGatekeeper: React.FC<AdminGatekeeperProps> = ({ children, isDedicatedEntry = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isUnlocked, setIsUnlocked] = useState<boolean | null>(null);

  useEffect(() => {
    // 1. If arriving via dedicated secret URL (e.g. /swiftsats-hq or /operator-hq)
    const isDedicatedPath =
      isDedicatedEntry ||
      location.pathname.startsWith('/swiftsats-hq') ||
      location.pathname.startsWith('/operator-hq');

    if (isDedicatedPath) {
      try {
        localStorage.setItem('swiftsats_admin_gate_unlocked', 'true');
      } catch {}
      setIsUnlocked(true);

      // Seamlessly transition into admin console
      if (location.pathname.startsWith('/swiftsats-hq') || location.pathname.startsWith('/operator-hq')) {
        navigate('/admin', { replace: true });
      }
      return;
    }

    // 2. Check if device is already authorized
    const hasAdminToken = typeof localStorage !== 'undefined' && !!localStorage.getItem('swiftsats_admin_token');
    const isGateUnlocked = typeof localStorage !== 'undefined' && localStorage.getItem('swiftsats_admin_gate_unlocked') === 'true';

    // 3. Check for secret key in query parameters: e.g. /admin?key=swift or /admin?secret=swift
    const searchParams = new URLSearchParams(location.search);
    const queryKey = searchParams.get('key') || searchParams.get('secret') || searchParams.get('access');

    // Default secret key is 'swift' unless customized by admin in Settings
    const configuredKey =
      (typeof localStorage !== 'undefined' && localStorage.getItem('swiftsats_admin_secret_key')) || 'swift';

    if (hasAdminToken || isGateUnlocked) {
      setIsUnlocked(true);
      return;
    }

    if (queryKey && queryKey.trim().toLowerCase() === configuredKey.trim().toLowerCase()) {
      // Secret key accepted! Unlock gate for this device
      try {
        localStorage.setItem('swiftsats_admin_gate_unlocked', 'true');
      } catch {}
      setIsUnlocked(true);

      // Clean the secret key from the browser address bar so it does not stay in browsing history
      searchParams.delete('key');
      searchParams.delete('secret');
      searchParams.delete('access');
      const cleanSearch = searchParams.toString() ? `?${searchParams.toString()}` : '';
      navigate(`${location.pathname}${cleanSearch}`, { replace: true });
      return;
    }

    // Unauthorized visitor typing /admin without secret key or dedicated link
    setIsUnlocked(false);
  }, [location, navigate, isDedicatedEntry]);

  // Loading briefly while verifying
  if (isUnlocked === null) {
    return null;
  }

  // Cloaked: Show 404 Page Not Found so nobody knows the admin panel exists here
  if (!isUnlocked) {
    return <NotFoundPage />;
  }

  return <>{children}</>;
};
