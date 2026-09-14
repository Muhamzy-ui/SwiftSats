import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { AdminLayout } from './components/AdminLayout';
import { AdminLoginPage } from './pages/Login';
import { DashboardPage } from './pages/Dashboard';
import { OrdersPage } from './pages/Orders';
import { PaymentMonitorPage } from './pages/PaymentMonitor';
import { PayoutsPage } from './pages/Payouts';
import { DisputesPage } from './pages/Disputes';
import { AnalyticsPage } from './pages/Analytics';
import { ReportsPage } from './pages/Reports';
import { SettingsPage } from './pages/Settings';

export const AdminRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="login" element={<AdminLoginPage />} />
      <Route element={<AdminLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="payments" element={<PaymentMonitorPage />} />
        <Route path="payouts" element={<PayoutsPage />} />
        <Route path="disputes" element={<DisputesPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
};
