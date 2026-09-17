import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  User,
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
} from 'lucide-react';
import { useTheme } from '../../shared/context/ThemeContext';
import { getStoredRecentOrders, LocalTrackedOrder } from '../../shared/utils/orderStorage';
import { getCoinLogo } from '../../shared/components/CryptoLogos';
import { formatNaira } from '../../shared/utils/formatters';
import { StatusBadge } from '../../shared/components/StatusBadge';

export const ProfilePage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [localOrders, setLocalOrders] = useState<LocalTrackedOrder[]>([]);
  const [clearedNotice, setClearedNotice] = useState(false);

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

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6 px-4 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="text-center space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-[#00c853] dark:text-[#00e676] bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-500/30 font-mono shadow-xs">
          <Shield className="w-3.5 h-3.5" />
          <span>Non-Custodial Account</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Profile & Settings
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Manage your local device preferences, security protocols, and active transaction history.
        </p>
      </div>

      {/* Hero Profile Identity Card (iOS 27 Glassmorphic Aesthetic) */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-white/[0.08] shadow-xl space-y-5 relative overflow-hidden">
        <div className="flex items-center gap-4">
          {/* Avatar Squircle with Glowing Emerald Accent */}
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#00c853] to-[#00f59b] p-0.5 shadow-lg shadow-emerald-500/25 flex items-center justify-center">
              <div className="w-full h-full rounded-[14px] bg-[#07080d] flex items-center justify-center text-white">
                <User className="w-8 h-8 text-[#00e676]" />
              </div>
            </div>
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#00c853] border-2 border-white dark:border-[#07080d] flex items-center justify-center text-slate-950">
              <CheckCircle2 className="w-3 h-3 stroke-[3]" />
            </span>
          </div>

          <div className="space-y-1">
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              SwiftSats Buyer Session
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-bold text-[#00c853] dark:text-[#00e676]">
                Non-Custodial
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                {localOrders.length} device order{localOrders.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Trust Pillars Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1 text-center">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-white/[0.04]">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Custody</span>
            <span className="text-xs font-black text-slate-900 dark:text-white">0% Held</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-white/[0.04]">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">BVN Required</span>
            <span className="text-xs font-black text-emerald-600 dark:text-[#00e676]">Zero (0)</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-white/[0.04] col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Delivery Engine</span>
            <span className="text-xs font-black text-slate-900 dark:text-white">SEC Quidax</span>
          </div>
        </div>
      </div>

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
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold transition-all text-xs"
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
                <span className="font-bold text-slate-900 dark:text-white block">Order Recovery</span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Find all orders via 6-digit Email OTP
                </span>
              </div>
            </div>

            <Link
              to="/track"
              className="px-3.5 py-1.5 rounded-xl bg-[#00c853] hover:bg-[#00b048] dark:bg-[#00e676] dark:hover:bg-[#00c853] text-slate-950 font-bold transition-all text-xs flex items-center gap-1 shadow-xs"
            >
              <span>Recover</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Saved Orders on This Device */}
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
              className="text-[11px] font-semibold text-rose-500 hover:text-rose-400 flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear History</span>
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
