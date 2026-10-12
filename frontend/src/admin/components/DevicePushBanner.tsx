import React, { useState, useEffect } from 'react';
import { Bell, BellRing, Send, X, RefreshCw } from 'lucide-react';
import {
  checkDevicePushStatus,
  subscribeDeviceToPush,
  isWebPushSupported,
  DevicePushStatus,
} from '../../shared/utils/webpush';
import { adminApi } from '../../shared/api/admin';

export const DevicePushBanner: React.FC = () => {
  const [status, setStatus] = useState<DevicePushStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    checkDevicePushStatus().then(setStatus);
  }, []);

  if (dismissed || !isWebPushSupported()) return null;

  const handleEnable = async () => {
    setIsLoading(true);
    setTestResult(null);
    try {
      const res = await subscribeDeviceToPush();
      const nextStatus = await checkDevicePushStatus();
      setStatus(nextStatus);
      if (res.success) {
        setTestResult('🎉 Device notifications are now active! Tap "Test" to verify.');
      } else {
        setTestResult(res.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await adminApi.testWebPush();
      setTestResult(res.success ? '⚡ Test push sent! Check your phone screen.' : (res.error || 'Failed to send test.'));
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-blue-500/10 to-transparent border border-emerald-500/30 dark:border-emerald-500/20 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-[#00e676] flex items-center justify-center shrink-0">
          <BellRing className="w-4 h-4 animate-bounce" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              {status?.isSubscribed ? 'Native Phone Push Alerts: Active ✅' : 'Enable Real-Time Device Notifications'}
            </span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              No Telegram Required
            </span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400">
            {testResult || (status?.isSubscribed
              ? 'Your phone receives lockscreen banners, sound & vibration even when this app is closed.'
              : 'Get instant phone lockscreen alerts with sound & vibration when customers pay.')}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
        {status?.isSubscribed ? (
          <button
            type="button"
            onClick={handleTest}
            disabled={isTesting}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
          >
            <Send className={`w-3.5 h-3.5 ${isTesting ? 'animate-pulse' : ''}`} />
            <span>{isTesting ? 'Sending...' : '⚡ Test My Phone'}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleEnable}
            disabled={isLoading}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer active:scale-95"
          >
            {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
            <span>{isLoading ? 'Activating...' : 'Turn On Notifications'}</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
          title="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
