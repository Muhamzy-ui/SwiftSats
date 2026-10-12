import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAdminAuth } from '../../shared/hooks/useAdminAuth';
import { Menu, Sun, Moon, Smartphone, Globe } from 'lucide-react';
import { SwiftSatsLogo } from '../../shared/components/SwiftSatsLogo';
import { useTheme } from '../../shared/context/ThemeContext';
import { AdminNotificationProvider } from '../context/AdminNotificationContext';
import { AdminNotificationBell, AdminFloatingToast } from './AdminNotificationUI';
import { InstallAdminModal } from './InstallAdminModal';

export const AdminLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAdminAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);

  useEffect(() => {
    try {
      const manifestLink = document.querySelector('link[rel="manifest"]');
      if (manifestLink) {
        manifestLink.setAttribute('href', '/admin-manifest.json');
      }
      document.title = 'SwiftSats Operator Console';
    } catch {}
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">Verifying session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return (
    <AdminNotificationProvider>
      <div className="min-h-screen bg-[#f8fafc] dark:bg-[#07080d] text-slate-900 dark:text-slate-100 transition-colors duration-200 flex flex-col md:flex-row">
        {/* Floating Real-Time Sound & Alert Toast */}
        <AdminFloatingToast />

        {/* Mobile Top Header (Visible on screens < md) */}
        <header
          className="md:hidden sticky top-0 z-30 bg-white/95 dark:bg-[#0c1017]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between shadow-xs transition-colors duration-200"
          style={{
            paddingTop: 'env(safe-area-inset-top, 0px)',
            height: 'calc(3.5rem + env(safe-area-inset-top, 0px))',
          }}
        >
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Open mobile menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <SwiftSatsLogo size={26} showText={true} />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowInstallModal(true)}
              className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
              title="Add SwiftAdmin to Home Screen"
            >
              <Smartphone className="w-3 h-3" />
              <span>Install</span>
            </button>
            <AdminNotificationBell />
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>
          </div>
        </header>

        {/* Mobile Drawer Backdrop & Slide-out Sidebar */}
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileDrawerOpen(false)}
            />

            {/* Drawer Sidebar */}
            <div
              className="relative w-72 max-w-[80vw] h-full bg-white dark:bg-[#0c1017] shadow-2xl z-10 flex flex-col animate-in slide-in-from-left duration-200"
              style={{
                paddingTop: 'env(safe-area-inset-top, 0px)',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              }}
            >
              <Sidebar
                isHealthy={true}
                onNavigate={() => setMobileDrawerOpen(false)}
                onClose={() => setMobileDrawerOpen(false)}
                onOpenInstallModal={() => {
                  setMobileDrawerOpen(false);
                  setShowInstallModal(true);
                }}
              />
            </div>
          </div>
        )}

        {/* Desktop Sidebar (Hidden on mobile) */}
        <div className="hidden md:flex shrink-0 sticky top-0 h-screen">
          <Sidebar
            isHealthy={true}
            onOpenInstallModal={() => setShowInstallModal(true)}
          />
        </div>

        {/* Main Content Area: Fully fluid and mobile-responsive */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Desktop Top Bar */}
          <div className="hidden md:flex items-center justify-between px-8 py-2.5 border-b border-slate-200/60 dark:border-white/[0.04] bg-white/50 dark:bg-slate-900/20 backdrop-blur-xs gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowInstallModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Add to Home Screen</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    sessionStorage.setItem('swiftsats_view_customer_site', 'true');
                  } catch (e) {}
                  window.location.href = '/';
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5 text-blue-500" />
                <span>Customer Website</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <AdminNotificationBell />
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                title="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
              </button>
            </div>
          </div>

          <main className="flex-1 p-3.5 sm:p-5 lg:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
            <Outlet />
          </main>
        </div>

        {/* Home Screen Install Modal */}
        <InstallAdminModal
          isOpen={showInstallModal}
          onClose={() => setShowInstallModal(false)}
        />
      </div>
    </AdminNotificationProvider>
  );
};
