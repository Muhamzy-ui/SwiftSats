import React, { useState } from 'react';
import { Bell, ExternalLink, X, Volume2, Sparkles } from 'lucide-react';
import { useAdminNotifications, AdminAlert } from '../context/AdminNotificationContext';
import { useNavigate } from 'react-router-dom';

export const AdminNotificationBell: React.FC = () => {
  const { unreadCount, alerts, markAllAsRead, enableBrowserNotifications, notificationsEnabled } = useAdminNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleOpenAlert = (alert: AdminAlert) => {
    setIsOpen(false);
    if (alert.type === 'NEW_USER') {
      navigate('/admin/users');
    } else {
      navigate(`/admin/orders?search=${alert.orderReference}`);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen && unreadCount > 0) {
            markAllAsRead();
          }
        }}
        className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
        title="Real-Time Alerts"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] flex items-center justify-center animate-pulse shadow-md">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-[#0c1017] border border-slate-200 dark:border-white/[0.08] shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-3.5 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#00c853] dark:text-[#00e676]" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Real-Time Notifications
                </span>
              </div>
              {!notificationsEnabled && (
                <button
                  type="button"
                  onClick={enableBrowserNotifications}
                  className="text-[10px] font-bold text-[#00c853] dark:text-[#00e676] bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg hover:underline"
                >
                  Enable OS Push
                </button>
              )}
            </div>

            {/* Alerts List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-white/[0.04]">
              {alerts.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No alerts yet. Real-time engine is listening for incoming transfers...
                </div>
              ) : (
                alerts.map((al) => (
                  <div
                    key={al.id}
                    onClick={() => handleOpenAlert(al)}
                    className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {al.title}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {new Date(al.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                      {al.message}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export const AdminFloatingToast: React.FC = () => {
  const { activeToast, dismissToast } = useAdminNotifications();
  const navigate = useNavigate();

  if (!activeToast) return null;

  const isPayment = activeToast.type === 'PAYMENT_RECEIVED' || activeToast.type === 'MANUAL_APPROVAL';

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full animate-in slide-in-from-top-4 fade-in duration-200">
      <div
        className={`p-4 rounded-2xl shadow-2xl border backdrop-blur-md flex items-start gap-3 relative ${
          isPayment
            ? 'bg-emerald-950/95 border-emerald-500/50 text-white shadow-emerald-500/20'
            : 'bg-slate-900/95 border-white/[0.1] text-white shadow-xl'
        }`}
      >
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            isPayment ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-[#00e676]'
          }`}
        >
          {isPayment ? <Sparkles className="w-5 h-5" /> : <Volume2 className="w-5 h-5 animate-pulse" />}
        </div>

        <div className="flex-1 space-y-1 pr-4">
          <div className="flex items-center gap-1.5">
            <h4 className="text-xs font-black tracking-tight">{activeToast.title}</h4>
            <span className="w-1.5 h-1.5 rounded-full bg-[#00e676] animate-ping" />
          </div>
          <p className="text-[11px] text-slate-300 font-mono leading-tight">{activeToast.message}</p>
          <div className="pt-1.5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                dismissToast();
                if (activeToast.type === 'NEW_USER') {
                  navigate('/admin/users');
                } else {
                  navigate(`/admin/orders?search=${activeToast.orderReference}`);
                }
              }}
              className="px-3 py-1 rounded-lg bg-[#00c853] dark:bg-[#00e676] text-slate-950 font-black text-[10px] hover:opacity-90 active:scale-95 transition-all shadow-xs flex items-center gap-1"
            >
              <span>{activeToast.type === 'NEW_USER' ? 'View User' : 'View Order'}</span>
              <ExternalLink className="w-3 h-3" />
            </button>
            <span className="text-[10px] font-mono text-slate-400">{activeToast.orderReference}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={dismissToast}
          className="absolute top-3 right-3 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
