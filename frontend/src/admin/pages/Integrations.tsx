import React, { useState, useEffect } from 'react';
import {
  Link2,
  Copy,
  Check,
  TrendingUp,
  DollarSign,
  Layers,
  Power,
  Plus,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { adminApi, AdminPartner, AdminPartnersResponse } from '../../shared/api/admin';
import { formatNaira } from '../../shared/utils/formatters';

export const IntegrationsPage: React.FC = () => {
  const [data, setData] = useState<AdminPartnersResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isTogglingCode, setIsTogglingCode] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New Integration Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deep Link Generator State
  const [selectedPartnerCode, setSelectedPartnerCode] = useState<string>('axiom');
  const [customCoin, setCustomCoin] = useState<string>('USDT_BEP20');
  const [customWallet, setCustomWallet] = useState<string>('');
  const [customAmount, setCustomAmount] = useState<string>('20000');

  const fetchIntegrations = async () => {
    setIsLoading(true);
    try {
      const res = await adminApi.getPartners();
      if (res.success) {
        setData(res);
        if (res.partners.length > 0 && !selectedPartnerCode) {
          setSelectedPartnerCode(res.partners[0].code);
        }
      }
    } catch (err: unknown) {
      console.error('Failed to fetch integrations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const handleToggle = async (code: string) => {
    setIsTogglingCode(code);
    setStatusMessage(null);
    try {
      const res = await adminApi.togglePartner(code);
      setStatusMessage({ type: 'success', text: res.message });
      fetchIntegrations();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Toggle failed';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setIsTogglingCode(null);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleCreatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const res = await adminApi.createPartner({
        name: newName.trim(),
        code: newCode.trim() || undefined,
        website_url: newUrl.trim() || undefined,
      });
      setStatusMessage({ type: 'success', text: res.message });
      setNewName('');
      setNewCode('');
      setNewUrl('');
      setShowAddModal(false);
      fetchIntegrations();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create partner';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Build generated deep link
  const origin = window.location.origin;
  const generatedLink = `${origin}/?source=${selectedPartnerCode}&coin=${customCoin}${
    customAmount ? `&amount=${customAmount}` : ''
  }${customWallet.trim() ? `&wallet=${customWallet.trim()}` : ''}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Linked Websites & On-Ramp Integrations
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700">
              Live
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track traffic, volume, and revenue from external wallets and partner websites (e.g. Axiom Wallet)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchIntegrations}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Link New Website</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-3 rounded-xl text-xs font-medium border flex items-center justify-between animate-in fade-in ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-slate-600">
            ×
          </button>
        </div>
      )}

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-subtle">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Partner Volume</span>
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white mt-2">
            {formatNaira(data?.summary.total_volume_ngn || 0)}
          </p>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
            From {data?.summary.total_orders || 0} external orders
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-subtle">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Your Profit Earned</span>
            <DollarSign className="w-4 h-4" />
          </div>
          <p className="text-xl sm:text-2xl font-black font-mono text-emerald-700 dark:text-emerald-300 mt-2">
            {formatNaira(data?.summary.total_profit_ngn || 0)}
          </p>
          <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-1 block font-medium">
            100% Platform Fee Revenue
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-subtle">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Integrations</span>
            <Power className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white mt-2">
            {data?.summary.active_partners || 0}{' '}
            <span className="text-xs font-normal text-slate-400">/ {data?.summary.total_partners || 0}</span>
          </p>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">Live links accepting payments</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-subtle">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Linked Conversion</span>
            <Layers className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white mt-2">
            {data?.summary.total_orders
              ? `${Math.round(
                  ((data?.partners.reduce((acc: number, p: AdminPartner) => acc + p.completed_orders, 0) || 0) /
                    data.summary.total_orders) *
                    100
                )}%`
              : '100%'}
          </p>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">Checkout completion rate</span>
        </div>
      </div>

      {/* Linked Websites List & Status Control */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-subtle">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Active Integrations & Controls</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Toggle any link Active or Inactive at any time to control incoming redirects
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {data?.partners.map((partner: AdminPartner) => (
            <div key={partner.id} className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-md">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white text-sm">{partner.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                      partner.is_active
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-700'
                    }`}
                  >
                    {partner.is_active ? 'Active' : 'Deactivated'}
                  </span>
                  <span className="text-xs font-mono px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    source={partner.code}
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {partner.notes || `Direct crypto on-ramp integration for ${partner.name}`}
                </p>

                {/* Performance pill */}
                <div className="flex flex-wrap items-center gap-3 pt-1 text-xs font-mono text-slate-600 dark:text-slate-300">
                  <span>
                    Volume: <strong className="text-slate-900 dark:text-white">{formatNaira(partner.total_volume_ngn)}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Profit:{' '}
                    <strong className="text-emerald-700 dark:text-emerald-400">
                      {formatNaira(partner.total_profit_ngn)}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    Orders: <strong>{partner.completed_orders}</strong> / {partner.total_orders}
                  </span>
                </div>
              </div>

              {/* Actions & Links */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(partner.deep_link_usdt, `usdt-${partner.code}`)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors shadow-2xs"
                  title="Copy direct USDT On-Ramp Link"
                >
                  {copiedCode === `usdt-${partner.code}` ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span>Copy USDT Link</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopy(partner.deep_link_base, `base-${partner.code}`)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors shadow-2xs"
                  title="Copy Base Redirect Link"
                >
                  {copiedCode === `base-${partner.code}` ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Link2 className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span>Copy Base Link</span>
                </button>

                {/* 1-Tap Activate / Deactivate Toggle Button */}
                <button
                  type="button"
                  disabled={isTogglingCode === partner.code}
                  onClick={() => handleToggle(partner.code)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs ${
                    partner.is_active
                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:hover:bg-rose-900 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  <Power className={`w-3.5 h-3.5 ${isTogglingCode === partner.code ? 'animate-spin' : ''}`} />
                  <span>{partner.is_active ? 'Deactivate Link' : 'Activate Link'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Deep-Link Generator & Tester Widget */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-subtle space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Link Generator for Your Other Website / Axiom Wallet
          </h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Use this generator to create the exact URL to paste into your other website or wallet. When users click it, they will
          be redirected with everything pre-configured!
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div>
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">Source Website</label>
            <select
              value={selectedPartnerCode}
              onChange={(e) => setSelectedPartnerCode(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-slate-800 dark:text-white focus:outline-hidden"
            >
              {data?.partners.map((p: AdminPartner) => (
                <option key={p.code} value={p.code}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">Selected Crypto</label>
            <select
              value={customCoin}
              onChange={(e) => setCustomCoin(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-slate-800 dark:text-white focus:outline-hidden"
            >
              <option value="USDT_BEP20">USDT (BNB Smart Chain / BEP-20) - Low Fee</option>
              <option value="USDT_TRC20">USDT (TRON / TRC-20)</option>
              <option value="BTC">Bitcoin (BTC)</option>
              <option value="ETH">Ethereum (ETH)</option>
              <option value="SOL">Solana (SOL)</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
              Default Naira Amount (Optional)
            </label>
            <input
              type="number"
              placeholder="e.g. 25000"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-slate-800 dark:text-white focus:outline-hidden"
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
            Customer Wallet Address Variable (Optional)
          </label>
          <input
            type="text"
            placeholder="0x... or leave dynamic: e.g. 0x36b25000587762425F2682d721A57eD7d74671F0"
            value={customWallet}
            onChange={(e) => setCustomWallet(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-slate-800 dark:text-white focus:outline-hidden"
          />
        </div>

        {/* Generated Result Box */}
        <div className="pt-2">
          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
            Your Generated Redirect URL:
          </label>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-100 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-xs">
            <span className="flex-1 text-emerald-800 dark:text-emerald-400 break-all select-all font-semibold">
              {generatedLink}
            </span>
            <button
              type="button"
              onClick={() => handleCopy(generatedLink, 'generator')}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-1.5 shrink-0 transition-colors shadow-xs"
            >
              {copiedCode === 'generator' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedCode === 'generator' ? 'Copied URL!' : 'Copy URL'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Add New Integration Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Link New Website or App</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreatePartner} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Website / App Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Axiom Wallet, TrustSwap, My Crypto App"
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    if (!newCode) setNewCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_'));
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Unique Code / Slug (Used in URL)
                </label>
                <input
                  type="text"
                  placeholder="e.g. axiom, axiom_wallet, mysite"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Will create: ?source={newCode || 'slug'}
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Website URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://example.com"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newName.trim()}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50"
                >
                  {isSubmitting ? 'Linking...' : 'Save & Activate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
