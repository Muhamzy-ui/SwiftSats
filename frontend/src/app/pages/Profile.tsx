import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield,
  Moon,
  Sun,
  Clock,
  ArrowUpRight,
  Trash2,
  Headphones,
  Lock,
  CheckCircle2,
  Layers,
  LogOut,
  LogIn,
  UserPlus,
  Mail,
  Calendar,
  Sparkles,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../../shared/context/AuthContext';
import { useTheme } from '../../shared/context/ThemeContext';
import { getStoredRecentOrders, LocalTrackedOrder } from '../../shared/utils/orderStorage';
import { getCoinLogo } from '../../shared/components/CryptoLogos';
import { formatNaira, formatDate } from '../../shared/utils/formatters';
import { StatusBadge } from '../../shared/components/StatusBadge';

export const ProfilePage: React.FC = () => {
  const { user, orders: userOrders, metrics, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [localOrders, setLocalOrders] = useState<LocalTrackedOrder[]>([]);
  const [clearedNotice, setClearedNotice] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    setLocalOrders(getStoredRecentOrders());
  }, []);

  const handleClearDeviceData = () => {
    if (window.confirm('Clear all locally saved order history from this browser?')) {
      localStorage.removeItem('swiftsats_tracked_orders');
      setLocalOrders([]);
      setClearedNotice(true);
      setTimeout(() => setClearedNotice(false), 3000);
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to sign out of your SwiftSats account?')) {
      setIsLoggingOut(true);
      try {
        await logout();
        navigate('/login');
      } finally {
        setIsLoggingOut(false);
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6 px-4 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="text-center space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-[#00c853] dark:text-[#00e676] bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-500/30 font-mono shadow-xs">
          <Shield className="w-3.5 h-3.5" />
          <span>{isAuthenticated ? 'Verified Customer Account' : 'Guest Buyer Session'}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          {isAuthenticated ? 'My Account' : 'Profile & Preferences'}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          {isAuthenticated
            ? 'Manage your personal account, security credentials, and view your purchase history.'
            : 'Sign in or register to permanently link and track all your crypto orders across any device.'}
        </p>
      </div>

      {/* Main Profile Card: Authenticated vs Guest */}
      {isAuthenticated && user ? (
        /* Authenticated Customer Card */
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-white/[0.08] shadow-xl space-y-5 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#00c853] to-[#00f59b] p-0.5 shadow-lg shadow-emerald-500/25 flex items-center justify-center">
                  <div className="w-full h-full rounded-[14px] bg-[#07080d] flex items-center justify-center text-white font-black text-xl">
                    {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                  </div>
                </div>
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#00c853] border-2 border-white dark:border-[#07080d] flex items-center justify-center text-slate-950">
                  <CheckCircle2 className="w-3 h-3 stroke-[3]" />
                </span>
              </div>

              <div className="space-y-1">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  {user.full_name || 'SwiftSats Member'}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-600 dark:text-slate-300 font-mono flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-400" />
                    {user.email}
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px] flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Joined {formatDate(user.created_at)}
                  </span>
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="self-start sm:self-center px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-700 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 font-bold text-xs transition-all flex items-center gap-1.5 border border-slate-200 dark:border-white/[0.06] cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>
            </button>
          </div>

          {/* Account Metrics Bar */}
          <div className="grid grid-cols-3 gap-2.5 pt-2 text-center">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-white/[0.04]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center justify-center gap-1">
                <ShoppingBag className="w-3 h-3 text-[#00c853] dark:text-[#00e676]" />
                Orders
              </span>
              <span className="text-sm font-black text-slate-900 dark:text-white mt-0.5 block">
                {metrics?.total_orders ?? userOrders.length}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-white/[0.04]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                Delivered
              </span>
              <span className="text-sm font-black text-emerald-600 dark:text-[#00e676] mt-0.5 block">
                {metrics?.completed_orders ?? 0}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-white/[0.04]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center justify-center gap-1">
                <TrendingUp className="w-3 h-3 text-teal-500" />
                Total Volume
              </span>
              <span className="text-xs font-black text-slate-900 dark:text-white mt-1 block truncate">
                {metrics ? formatNaira(metrics.total_spent_ngn) : '₦0.00'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Guest Callout Card */
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-white/[0.08] shadow-xl space-y-4 relative overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-500/30 flex items-center justify-center text-[#00c853] dark:text-[#00e676]">
              <UserPlus className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Create Account or Sign In
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Never lose an order reference. Protect your purchases with password access.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Link
              to="/login"
              className="py-2.5 px-4 rounded-2xl bg-[#00c853] hover:bg-[#00b048] dark:bg-[#00e676] dark:hover:bg-[#00c853] text-slate-950 font-black text-xs transition-all shadow-md shadow-emerald-500/20 text-center flex items-center justify-center gap-1.5"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </Link>
            <Link
              to="/signup"
              className="py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold text-xs transition-all text-center flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-[#00c853] dark:text-[#00e676]" />
              <span>Sign Up</span>
            </Link>
          </div>
        </div>
      )}

      {/* Authenticated User's Orders */}
      {isAuthenticated && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#00c853] dark:text-[#00e676]" />
              <span>Your Orders ({userOrders.length})</span>
            </h3>
            <Link
              to="/#buy-wizard"
              className="text-[11px] font-bold text-[#00c853] dark:text-[#00e676] hover:underline"
            >
              + New Order
            </Link>
          </div>

          {userOrders.length === 0 ? (
            <div className="p-8 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.06] text-center space-y-2">
              <Layers className="w-8 h-8 text-slate-400 mx-auto opacity-60" />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                You haven't placed any orders with this account yet.
              </p>
              <Link
                to="/"
                className="inline-block text-xs font-bold text-[#00c853] dark:text-[#00e676] hover:underline"
              >
                Start an instant purchase →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {userOrders.map((ord) => {
                const isOpen = ord.status === 'AWAITING_PAYMENT' || ord.status === 'QUOTE_LOCKED';
                return (
                  <Link
                    key={ord.order_reference}
                    to={isOpen ? `/pay/${ord.order_reference}` : `/track/${ord.order_reference}`}
                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/[0.08] hover:border-[#00c853] dark:hover:border-[#00e676] transition-all flex items-center justify-between group shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      {getCoinLogo(ord.coin, 22)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                            {ord.order_reference}
                          </span>
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {ord.coin.split('_')[0]}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          {formatNaira(ord.fiat_amount_ngn)} • {ord.crypto_amount} {ord.coin.split('_')[0]}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusBadge status={ord.status} showDot={false} className="text-[10px] py-0.5 px-2" />
                      <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#00c853] dark:group-hover:text-[#00e676] transition-colors" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Display & App Settings Card */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-white/[0.08] shadow-sm space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
          Preferences & Interface
        </h3>

        <div className="space-y-3 divide-y divide-slate-100 dark:divide-white/[0.06] text-xs">
          {/* Theme Switcher */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {theme === 'dark' ? <Moon className="w-4 h-4 text-[#00e676]" /> : <Sun className="w-4 h-4 text-amber-500" />}
              </div>
              <div>
                <span className="font-bold text-slate-900 dark:text-white block">Theme Mode</span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Currently using {theme === 'dark' ? 'Dark' : 'Light'} appearance
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold transition-all text-xs cursor-pointer"
            >
              Switch to {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
          </div>

          {/* Currency Display */}
          <div className="flex items-center justify-between pt-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                <span className="text-xs font-black font-mono">₦</span>
              </div>
              <div>
                <span className="font-bold text-slate-900 dark:text-white block">Fiat Currency</span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Nigerian Naira (NGN)
                </span>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-[#00e676] bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-300 dark:border-emerald-500/30">
              NGN Default
            </span>
          </div>

          {/* Email Recovery Shortcut */}
          <div className="flex items-center justify-between pt-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                <Lock className="w-4 h-4 text-[#00c853] dark:text-[#00e676]" />
              </div>
              <div>
                <span className="font-bold text-slate-900 dark:text-white block">Order Lookup</span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Find any order via 6-digit Email OTP or reference
                </span>
              </div>
            </div>

            <Link
              to="/track"
              className="px-3.5 py-1.5 rounded-xl bg-[#00c853] hover:bg-[#00b048] dark:bg-[#00e676] dark:hover:bg-[#00c853] text-slate-950 font-bold transition-all text-xs flex items-center gap-1 shadow-xs"
            >
              <span>Search</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Guest: Saved Orders on This Device */}
      {!isAuthenticated && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#00c853] dark:text-[#00e676]" />
              <span>Orders on This Device ({localOrders.length})</span>
            </h3>

            {localOrders.length > 0 && (
              <button
                type="button"
                onClick={handleClearDeviceData}
                className="text-[11px] font-semibold text-rose-500 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {clearedNotice && (
            <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 text-xs text-center text-slate-600 dark:text-slate-400 animate-in fade-in">
              Device order history cleared.
            </div>
          )}

          {localOrders.length === 0 ? (
            <div className="p-8 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.06] text-center space-y-2">
              <Layers className="w-8 h-8 text-slate-400 mx-auto opacity-60" />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No orders stored on this browser yet.
              </p>
              <Link
                to="/"
                className="inline-block text-xs font-bold text-[#00c853] dark:text-[#00e676] hover:underline"
              >
                Start an instant purchase →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {localOrders.map((ord) => {
                const isOpen = ord.status === 'AWAITING_PAYMENT' || ord.status === 'QUOTE_LOCKED';
                return (
                  <Link
                    key={ord.order_reference}
                    to={isOpen ? `/pay/${ord.order_reference}` : `/track/${ord.order_reference}`}
                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/[0.08] hover:border-[#00c853] dark:hover:border-[#00e676] transition-all flex items-center justify-between group shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      {getCoinLogo(ord.coin, 20)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                            {ord.order_reference}
                          </span>
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {ord.coin.split('_')[0]}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          {formatNaira(ord.amount_ngn)} • {ord.crypto_amount} {ord.coin.split('_')[0]}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusBadge status={ord.status} showDot={false} className="text-[10px] py-0.5 px-2" />
                      <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#00c853] dark:group-hover:text-[#00e676] transition-colors" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Support Card */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-white/[0.08] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Headphones className="w-4 h-4 text-[#00c853] dark:text-[#00e676]" />
          <span className="text-xs font-bold text-slate-900 dark:text-white">
            Need Help with a Transfer?
          </span>
        </div>
        <Link
          to="/support"
          className="text-xs font-bold text-[#00c853] dark:text-[#00e676] hover:underline flex items-center gap-1"
        >
          <span>Support Desk</span>
          <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
};
