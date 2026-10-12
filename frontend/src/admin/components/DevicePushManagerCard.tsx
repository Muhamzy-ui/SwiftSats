import React, { useState, useEffect } from 'react';
import { Bell, BellOff, BellRing, Smartphone, Check, Send, AlertCircle, RefreshCw } from 'lucide-react';
import {
  checkDevicePushStatus,
  subscribeDeviceToPush,
  unsubscribeDeviceFromPush,
  isWebPushSupported,
  DevicePushStatus,
} from '../../shared/utils/webpush';
import { adminApi } from '../../shared/api/admin';

export const DevicePushManagerCard: React.FC = () => {
  const [status, setStatus] = useState<DevicePushStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const refreshStatus = async () => {
    const s = await checkDevicePushStatus();
    setStatus(s);
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  const handleTogglePush = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      if (status?.isSubscribed) {
        const res = await unsubscribeDeviceFromPush();
        await refreshStatus();
        setMessage({ type: 'info', text: res.message });
      } else {
        const res = await subscribeDeviceToPush();
        await refreshStatus();
        if (res.success) {
          setMessage({
            type: 'success',
            text: '🎉 Native device notifications are now ACTIVE! Your phone will ring and vibrate when payments arrive—even when this app is closed.',
          });
        } else {
          setMessage({ type: 'error', text: res.message });
        }
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Action failed.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestPush = async () => {
    setIsTesting(true);
    setMessage(null);
    try {
      const res = await adminApi.testWebPush();
      if (res.success) {
        setMessage({
          type: 'success',
          text: `⚡ Test push delivered to ${res.delivered_to} device(s)! Check your screen for the alert.`,
        });
      } else {
        setMessage({
          type: 'error',
          text: res.error || 'Failed to send test push alert.',
        });
      }
    } catch (e: any) {
      setMessage({
        type: 'error',
        text: e.message || 'Error sending test push alert.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const supported = isWebPushSupported();

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-5 sm:p-6 border border-emerald-500/30 dark:border-emerald-500/20 shadow-subtle space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-[#00e676]">
            <BellRing className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Native Real-Time Device Notifications
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Zero Bot Needed
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Receive native lockscreen alerts with sound & vibration directly on this device, even when the app is closed.
            </p>
          </div>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2">
          {status?.isSubscribed ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Active on this Device</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span>Not Activated Yet</span>
            </span>
          )}
        </div>
      </div>

      {/* Status Feedback Message */}
      {message && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold leading-relaxed flex items-start gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : message.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
              : 'bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200'
          }`}
        >
          {message.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Feature Information Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
          <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
            <span>Lockscreen Delivery</span>
          </span>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Wakes up your locked phone when a customer transfers Naira.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
          <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Bell className="w-3.5 h-3.5 text-blue-500" />
            <span>Sound & Vibration</span>
          </span>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Plays chime and vibrates device so you never miss an order.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
          <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-amber-500" />
            <span>1-Tap Action</span>
          </span>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Tapping the notification opens the exact order for release.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
        <div className="text-[11px] text-slate-400 dark:text-slate-500">
          💡 Powered by native Apple APNs & Google FCM Web Push protocols.
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleTogglePush}
            disabled={isLoading || !supported}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer ${
              status?.isSubscribed
                ? 'bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-300'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20 shadow-md active:scale-95'
            }`}
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Configuring...</span>
              </>
            ) : status?.isSubscribed ? (
              <>
                <BellOff className="w-4 h-4" />
                <span>Disable on This Device</span>
              </>
            ) : (
              <>
                <Bell className="w-4 h-4" />
                <span>Turn On Device Notifications</span>
              </>
            )}
          </button>

          {status?.isSubscribed && (
            <button
              type="button"
              onClick={handleTestPush}
              disabled={isTesting}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
            >
              <Send className={`w-3.5 h-3.5 ${isTesting ? 'animate-pulse' : ''}`} />
              <span>{isTesting ? 'Sending...' : '⚡ Test My Phone Now'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
