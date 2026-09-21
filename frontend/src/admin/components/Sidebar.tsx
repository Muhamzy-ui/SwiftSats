import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Layers,
  Activity,
  Send,
  ShieldAlert,
  BarChart3,
  FileSpreadsheet,
  Settings,
  Users,
  LogOut,
  Sun,
  Moon,
  X,
} from 'lucide-react';
import { SystemHealthCard } from './SystemHealthCard';
import { useAdminAuth } from '../../shared/hooks/useAdminAuth';
import { useTheme } from '../../shared/context/ThemeContext';
import { SwiftSatsLogo } from '../../shared/components/SwiftSatsLogo';

interface SidebarProps {
  isHealthy?: boolean;
  onNavigate?: () => void;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isHealthy = true, onNavigate, onClose }) => {
  const { user, logout } = useAdminAuth();
  const { theme, setTheme } = useTheme();

  const navItems = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { to: '/admin/orders', label: 'Orders Pipeline', icon: Layers },
    { to: '/admin/users', label: 'Users & Customers', icon: Users },
    { to: '/admin/payments', label: 'Payment Monitor', icon: Activity },
    { to: '/admin/payouts', label: 'Payouts Log', icon: Send },
    { to: '/admin/disputes', label: 'Disputes & Queue', icon: ShieldAlert },
    { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/admin/reports', label: 'Report Builder', icon: FileSpreadsheet },
    { to: '/admin/settings', label: 'Settings & Security', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white dark:bg-[#0c1017] border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between h-full select-none transition-colors duration-200 shadow-xs">
      {/* Top Header */}
      <div>
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <SwiftSatsLogo size={32} showText={true} />
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white md:hidden"
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                onClick={() => onNavigate?.()}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-[#00e676] font-bold border-l-2 border-[#00c853] dark:border-[#00e676] shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Health, Theme Switcher & Admin User Profile */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
        {/* Dedicated, High-Contrast Theme Switcher Pill */}
        <div className="p-2 bg-slate-100 dark:bg-slate-900/80 rounded-xl flex items-center justify-between border border-slate-200/80 dark:border-slate-800">
          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 pl-1">Theme</span>
          <div className="flex items-center gap-1 bg-white dark:bg-slate-950 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all ${
                theme === 'light'
                  ? 'bg-[#00c853] text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
              title="Switch to Light mode"
            >
              <Sun className="w-3 h-3" />
              <span>Light</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all ${
                theme === 'dark'
                  ? 'bg-[#00e676] text-slate-950 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
              title="Switch to Dark mode"
            >
              <Moon className="w-3 h-3" />
              <span>Dark</span>
            </button>
          </div>
        </div>

        {/* System Health */}
        <SystemHealthCard isHealthy={isHealthy} />

        {/* User Card & Logout */}
        <div className="flex items-center justify-between pt-1 px-1">
          <div className="min-w-0">
            <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
              {user?.email || 'admin@swiftsats.com'}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-mono">
              {user?.role || 'SUPER_ADMIN'}
            </span>
          </div>

          <button
            type="button"
            onClick={logout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
