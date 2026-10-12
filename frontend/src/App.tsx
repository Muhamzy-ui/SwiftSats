import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AppRoutes } from './app/routes';
import { AdminRoutes } from './admin/routes';
import { ThemeProvider } from './shared/context/ThemeContext';
import { AuthProvider } from './shared/context/AuthContext';

const AdminSessionRouter: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const hasAdminToken = typeof localStorage !== 'undefined' && !!localStorage.getItem('swiftsats_admin_token');
    const isCustomerView = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('swiftsats_view_customer_site') === 'true';

    // If an admin token is stored on this phone/browser,
    // and the user opens the root URL ('/') without having explicitly chosen "Customer View",
    // automatically open /admin directly so they never get dropped back to the customer page!
    if (hasAdminToken && !isCustomerView && location.pathname === '/') {
      navigate('/admin', { replace: true });
    }
  }, [location.pathname, navigate]);

  return (
    <Routes>
      {/* Admin Section (Protected) */}
      <Route path="/admin/*" element={<AdminRoutes />} />

      {/* Public Buy Flow & Track Order */}
      <Route path="/*" element={<AppRoutes />} />
    </Routes>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AdminSessionRouter />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};
