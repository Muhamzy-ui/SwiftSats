import React, { useState, useEffect } from 'react';
import { ShieldCheck, Server, AlertTriangle, RefreshCw, Send, Smartphone, Save, Wallet, Coins } from 'lucide-react';
import { adminApi } from '../../shared/api/admin';
import { SystemHealthData } from '../../shared/types';
import { DevicePushManagerCard } from '../components/DevicePushManagerCard';

const SUPPORTED_COINS = [
  { id: 'USDT_BEP20', label: 'USDT (BEP-20)', network: 'BNB Smart Chain', symbol: 'USDT' },
  { id: 'BNB', label: 'BNB (BEP-20)', network: 'BNB Smart Chain', symbol: 'BNB' },
  { id: 'USDT_TRC20', label: 'USDT (TRC-20)', network: 'Tron Network', symbol: 'USDT' },
  { id: 'SOL', label: 'Solana (SOL)', network: 'Solana Network', symbol: 'SOL' },
  { id: 'BTC', label: 'Bitcoin (BTC)', network: 'Bitcoin Network', symbol: 'BTC' },
];

export const SettingsPage: React.FC = () => {
  const [healthData, setHealthData] = useState<SystemHealthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dangerConfirm, setDangerConfirm] = useState(false);
  const [dangerNotice, setDangerNotice] = useState<string | null>(null);
  const [isPurging, setIsPurging] = useState(false);

  // Platform Hot Wallet & On-Chain Float
  const [selectedCoin, setSelectedCoin] = useState('USDT_BEP20');
  const [hotWalletAddress, setHotWalletAddress] = useState('');
  const [payoutMode, setPayoutMode] = useState<'AUTOMATED' | 'MANUAL'>('MANUAL');
  const [isTogglingPayoutMode, setIsTogglingPayoutMode] = useState(false);
  const [isSavingWallet, setIsSavingWallet] = useState(false);
  const [walletStatusMsg, setWalletStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [walletBalance, setWalletBalance] = useState<{
    token_balance: string;
    gas_balance: string;
    gas_symbol: string;
    has_gas: boolean;
    has_private_key: boolean;
    wallet_address: string;
    network: string;
  } | null>(null);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);

  // Telegram 24/7 Mobile Lockscreen Alerts
  const [telegramEnabled, setTelegramEnabled] = useState(true);
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [isSavingTelegram, setIsSavingTelegram] = useState(false);
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  const [telegramStatusMsg, setTelegramStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchHealth = async () => {
    setIsLoading(true);
    try {
      const res = await adminApi.getSystemHealth();
      setHealthData(res);
    } catch (err) {
      console.error('Failed to fetch system health', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWalletBalance = async (coinId?: string, customAddr?: string) => {
    setIsCheckingBalance(true);
    const activeCoin = coinId || selectedCoin;
    try {
      const res = await adminApi.getHotWalletBalance(activeCoin, customAddr);
      setWalletBalance(res);
      if (res.wallet_address) {
        setHotWalletAddress(res.wallet_address);
      }
    } catch (err) {
      console.error('Failed to query hot wallet balance', err);
    } finally {
      setIsCheckingBalance(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const s = await adminApi.getPlatformSettings();
      if (s) {
        if (s.payout_mode) {
          setPayoutMode(s.payout_mode);
        }
        setTelegramEnabled(s.telegram_alerts_enabled);
        setBotToken(s.telegram_bot_token || '');
        setChatId(s.telegram_admin_chat_id || '');
        const targetAddr = s.hot_wallet_address || '';
        if (targetAddr && selectedCoin.includes('BEP20')) {
          setHotWalletAddress(targetAddr);
        }
        fetchWalletBalance(selectedCoin);
      }
    } catch (e) {
      console.warn('Could not load platform settings', e);
      fetchWalletBalance(selectedCoin);
    }
  };

  const handleSaveWallet = async () => {
    setIsSavingWallet(true);
    setWalletStatusMsg(null);
    try {
      await adminApi.updatePlatformSettings({
        hot_wallet_address: hotWalletAddress.trim(),
      });
      setWalletStatusMsg({ type: 'success', text: 'Platform hot wallet address updated successfully!' });
      fetchWalletBalance(selectedCoin, hotWalletAddress.trim());
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to update hot wallet address.';
      setWalletStatusMsg({ type: 'error', text: msg });
    } finally {
      setIsSavingWallet(false);
    }
  };

  const handleTogglePayoutMode = async () => {
    const nextMode = payoutMode === 'AUTOMATED' ? 'MANUAL' : 'AUTOMATED';
    setIsTogglingPayoutMode(true);
    setWalletStatusMsg(null);
    try {
      const res = await adminApi.updatePayoutMode({ payout_mode: nextMode });
      if (res.success) {
        const updated = (res.payout_mode || nextMode) as 'AUTOMATED' | 'MANUAL';
        setPayoutMode(updated);
        setWalletStatusMsg({
          type: 'success',
          text: `Platform Payout Mode changed to ${updated === 'AUTOMATED' ? '24/7 Autopilot' : 'Manual 1-Tap Approval'}.`,
        });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to switch payout mode.';
      setWalletStatusMsg({ type: 'error', text: msg });
    } finally {
      setIsTogglingPayoutMode(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    fetchSettings();
  }, []);

  const handleSaveTelegram = async () => {
    setIsSavingTelegram(true);
    setTelegramStatusMsg(null);
    try {
      await adminApi.updatePlatformSettings({
        telegram_alerts_enabled: telegramEnabled,
        telegram_bot_token: botToken.trim(),
        telegram_admin_chat_id: chatId.trim(),
      });
      setTelegramStatusMsg({ type: 'success', text: 'Telegram notification settings saved successfully!' });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to save settings.';
      setTelegramStatusMsg({ type: 'error', text: msg });
    } finally {
      setIsSavingTelegram(false);
    }
  };

  const handleTestTelegram = async () => {
    setIsTestingTelegram(true);
    setTelegramStatusMsg(null);
    try {
      const res = await adminApi.testTelegramAlert({
        bot_token: botToken.trim(),
        chat_id: chatId.trim(),
        save: true,
      });
      if (res.success) {
        setTelegramStatusMsg({ type: 'success', text: res.message || '⚡ Test alert delivered! Check your phone lockscreen.' });
      } else {
        setTelegramStatusMsg({ type: 'error', text: res.error || 'Failed to send test alert.' });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error delivering test alert to phone.';
      setTelegramStatusMsg({ type: 'error', text: msg });
    } finally {
      setIsTestingTelegram(false);
    }
  };

  const handlePurgeAllOrders = async () => {
    if (!dangerConfirm) {
      setDangerNotice('Please click the confirmation checkbox first.');
      return;
    }
    setIsPurging(true);
    setDangerNotice(null);
    try {
      const res = await adminApi.purgeTestOrders();
      setDangerNotice(res.message || 'All test orders purged successfully.');
      setDangerConfirm(false);
      fetchHealth();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to purge orders.';
      setDangerNotice(`Error: ${msg}`);
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">System Configuration & Security</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Gateway credentials telemetry, 2FA policies, and system safeguards</p>
      </div>

      {/* Gateway & Infrastructure Health */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-subtle space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">API Connection & Engine Health</h2>
          </div>
          <button
            onClick={fetchHealth}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
            <span>Test Endpoints</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {healthData?.services.map((svc) => (
            <div key={svc.name} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900 dark:text-white">{svc.name}</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Operational
                </span>
              </div>
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-mono pt-1">
                <span>Mode: {svc.mode}</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">{svc.latency_ms}ms</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Native Browser & Device Real-Time Push Alerts (Zero Telegram Needed) */}
      <DevicePushManagerCard />

      {/* 24/7 Mobile Lockscreen & Telegram Push Alerts Hub (Optional Alternative) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-subtle space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-[#00e676]">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                24/7 Phone Lockscreen Alerts (Telegram Push)
              </h2>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Wakes up your locked phone with instant chime/vibration when payments & orders arrive
              </span>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer self-start sm:self-auto">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {telegramEnabled ? 'Alerts Active' : 'Alerts Paused'}
            </span>
            <input
              type="checkbox"
              checked={telegramEnabled}
              onChange={(e) => setTelegramEnabled(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
          </label>
        </div>

        {telegramStatusMsg && (
          <div className={`p-3 rounded-lg border text-xs font-semibold ${
            telegramStatusMsg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
          }`}>
            {telegramStatusMsg.text}
          </div>
        )}

        {/* 60-Second Setup Guide */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2.5">
          <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs uppercase tracking-wider">
            ⚡ Quick 60-Second Setup (Receive Phone Alerts When Admin is Closed):
          </span>
          <div className="space-y-2 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
            <div className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
              <p>
                Open <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline">@BotFather</a> on Telegram, send <code className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[10px]">/newbot</code>, give it a name (e.g. <em>SwiftAdminAlertsBot</em>), and copy the <strong>HTTP API Token</strong>.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
              <p>
                Open <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline">@userinfobot</a> on Telegram, send <code className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[10px]">/start</code>, and copy your numeric <strong>Id</strong> (e.g. 583920194).
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
              <p className="font-semibold text-amber-700 dark:text-amber-300">
                CRITICAL: Search for your new bot on Telegram and tap <u>&quot;START&quot;</u> so Telegram permits it to message your phone!
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">4</span>
              <p>
                Paste the Token and Chat ID below and tap <strong>&quot;⚡ Test Alert to My Phone&quot;</strong>. Your phone will immediately ring!
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Telegram Bot Token
            </label>
            <input
              type="text"
              autoComplete="off"
              placeholder="e.g. 7123456789:AAFxz98kLk09..."
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
              Created via <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">@BotFather</a>.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Admin Telegram Chat ID
            </label>
            <input
              type="text"
              autoComplete="off"
              placeholder="e.g. 583920194"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
              Found via <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">@userinfobot</a>.
            </p>
          </div>
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
          <div className="text-[11px] text-slate-400 dark:text-slate-500">
            💡 Guaranteed delivery 24/7 even when phone screen is locked or app is closed.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveTelegram}
              disabled={isSavingTelegram}
              className="px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5"
            >
              <Save className={`w-3.5 h-3.5 ${isSavingTelegram ? 'animate-spin' : ''}`} />
              <span>{isSavingTelegram ? 'Saving...' : 'Save Credentials'}</span>
            </button>

            <button
              type="button"
              onClick={handleTestTelegram}
              disabled={isTestingTelegram || !botToken || !chatId}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-bold text-white shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Send className={`w-3.5 h-3.5 ${isTestingTelegram ? 'animate-pulse' : ''}`} />
              <span>{isTestingTelegram ? 'Sending Test...' : '⚡ Test Alert to My Phone'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Self-Custody Platform Hot Wallet & On-Chain Float */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-subtle space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Platform Hot Wallet & Blockchain Float
              </h2>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Self-custodial on-chain wallet for customer payouts (Zero third-party Quidax dependency)
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => fetchWalletBalance(selectedCoin)}
            disabled={isCheckingBalance}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 self-start sm:self-auto cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCheckingBalance ? 'animate-spin text-blue-500' : ''}`} />
            <span>Check Live Balance</span>
          </button>
        </div>

        {walletStatusMsg && (
          <div className={`p-3 rounded-lg border text-xs font-semibold ${
            walletStatusMsg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
          }`}>
            {walletStatusMsg.text}
          </div>
        )}

        {/* Coin Selector Pills */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Select Cryptocurrency & Network to Inspect:
          </label>
          <div className="flex flex-wrap gap-2">
            {SUPPORTED_COINS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setSelectedCoin(c.id);
                  fetchWalletBalance(c.id);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedCoin === c.id
                    ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-500/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Live Balance Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-emerald-500" />
                <span>{SUPPORTED_COINS.find(c => c.id === selectedCoin)?.label || 'Crypto'} Balance</span>
              </span>
              <span className="text-[10px] uppercase font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                {SUPPORTED_COINS.find(c => c.id === selectedCoin)?.network || 'On-Chain'}
              </span>
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
              {walletBalance
                ? `${parseFloat(walletBalance.token_balance).toFixed(selectedCoin.includes('BTC') ? 6 : selectedCoin.includes('SOL') ? 4 : 2)} ${SUPPORTED_COINS.find(c => c.id === selectedCoin)?.symbol || ''}`
                : '—'}
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              {walletBalance && parseFloat(walletBalance.token_balance) > 0
                ? '✅ Float available for payouts'
                : '⚠️ Empty float. Deposit crypto before releasing orders'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Server className="w-3.5 h-3.5 text-amber-500" />
                <span>Network Gas ({walletBalance?.gas_symbol || 'Fee'})</span>
              </span>
              <span className="text-[10px] uppercase font-mono text-amber-600 dark:text-amber-400 font-bold">Gas Fee</span>
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
              {walletBalance ? `${parseFloat(walletBalance.gas_balance).toFixed(4)} ${walletBalance.gas_symbol}` : '—'}
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              {walletBalance?.has_gas
                ? `✅ Gas available for blockchain transfers`
                : `⚠️ Need min ${walletBalance?.gas_symbol === 'TRX' ? '15 TRX' : walletBalance?.gas_symbol === 'SOL' ? '0.005 SOL' : '0.0005 BNB'} for gas`}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                <span>Payout Mode</span>
              </span>
              <span className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full ${
                payoutMode === 'AUTOMATED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
              }`}>
                {payoutMode === 'AUTOMATED' ? '24/7 Autopilot' : '1-Tap Approval'}
              </span>
            </div>
            <div className="text-sm font-bold font-mono text-slate-900 dark:text-white">
              {payoutMode === 'AUTOMATED' ? '⚡ 24/7 Automated' : '🔒 Manual Approval'}
            </div>
            <button
              type="button"
              onClick={handleTogglePayoutMode}
              disabled={isTogglingPayoutMode}
              className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                payoutMode === 'AUTOMATED'
                  ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
              }`}
            >
              <RefreshCw className={`w-3 h-3 ${isTogglingPayoutMode ? 'animate-spin' : ''}`} />
              <span>
                {isTogglingPayoutMode
                  ? 'Switching...'
                  : payoutMode === 'AUTOMATED'
                  ? 'Switch to Manual Approval'
                  : 'Activate 24/7 Autopilot'}
              </span>
            </button>
          </div>
        </div>

        {/* Address Config */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Platform Hot Wallet Address for {SUPPORTED_COINS.find(c => c.id === selectedCoin)?.label || selectedCoin}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={
                selectedCoin === 'SOL'
                  ? 'e.g. DGsJivNtz6TomAgb9tYzJpicbnM2CC67JyEoA27WPgkA'
                  : selectedCoin === 'BTC'
                  ? 'e.g. bc1qmypt2kwx3gfjcdjxfjmw0a5ccq4pq0eep0jhhm'
                  : 'e.g. 0xe99E64B6BeFDC68341775d5508FA51DE4e7309e2'
              }
              value={hotWalletAddress}
              onChange={(e) => setHotWalletAddress(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={handleSaveWallet}
              disabled={isSavingWallet}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition-colors flex items-center gap-1.5 shadow-sm whitespace-nowrap cursor-pointer"
            >
              <Save className={`w-3.5 h-3.5 ${isSavingWallet ? 'animate-spin' : ''}`} />
              <span>{isSavingWallet ? 'Saving...' : 'Save Address'}</span>
            </button>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
            The platform will monitor this address on-chain in real-time. If there is no money in this wallet, releasing orders will be strictly blocked with an &quot;Insufficient Funds&quot; error.
          </p>
        </div>
      </div>

      {/* Security Policies */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-subtle space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Security & 2FA Enforcement Rules</span>
        </h2>

        <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="font-bold block text-slate-900 dark:text-white">Mandatory 2FA Authentication</span>
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">Enforces TOTP 6-digit codes for all administrative logins</span>
            </div>
            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800">
              Active (Enforced)
            </span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="font-bold block text-slate-900 dark:text-white">Session Expiration Window</span>
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">JWT httpOnly cookie validity duration before re-authentication is required</span>
            </div>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">60 Minutes</span>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <span className="font-bold block text-slate-900 dark:text-white">Webhook Cryptographic Signing</span>
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">HMAC SHA512 signature verification on all incoming Paystack webhooks</span>
            </div>
            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800">
              Enabled
            </span>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-rose-200 dark:border-rose-800/80 shadow-subtle space-y-4">
        <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
          <AlertTriangle className="w-4 h-4" />
          <h2 className="text-xs font-bold uppercase tracking-wider">Danger Zone</h2>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Critical operations requiring operator confirmation. These actions immediately affect active order locking caches.
        </p>

        {dangerNotice && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            {dangerNotice}
          </div>
        )}

        <div className="p-4 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900 space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="confirmDanger"
              checked={dangerConfirm}
              onChange={(e) => setDangerConfirm(e.target.checked)}
              className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4 bg-white dark:bg-slate-950"
            />
            <label htmlFor="confirmDanger" className="text-xs font-semibold text-rose-900 dark:text-rose-300 cursor-pointer">
              I understand this action will permanently delete all mock, demo, and test orders from database (Admin user will remain intact).
            </label>
          </div>

          <button
            type="button"
            onClick={handlePurgeAllOrders}
            disabled={!dangerConfirm || isPurging}
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:opacity-40 text-white font-bold text-xs shadow-sm transition-colors flex items-center gap-1.5"
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${isPurging ? 'animate-spin' : ''}`} />
            <span>{isPurging ? 'Purging Orders...' : 'Purge All Test & Mock Orders'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
