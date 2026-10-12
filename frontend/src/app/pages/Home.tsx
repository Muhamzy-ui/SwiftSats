import React from 'react';
import { BuyWizard } from './BuyFlow/BuyWizard';
import { ShieldCheck, Zap, Lock, ArrowRight, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Home: React.FC = () => {
  return (
    <div className="space-y-4 sm:space-y-6 pt-4 pb-6 sm:py-6 max-w-xl mx-auto px-3 sm:px-4">

      {/* 1. Sleek, Proportionate Hero Header */}
      <div className="text-center space-y-1.5 max-w-lg mx-auto">
        <h1 className="text-2xl sm:text-3xl lg:text-[38px] font-extrabold tracking-tight text-slate-950 dark:text-white leading-[1.2]">
          Buy crypto in <span className="text-[#00c853] dark:text-[#00e676]">minutes.</span>
          <br className="hidden sm:inline" />
          {' '}No account needed.
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed max-w-sm sm:max-w-md mx-auto">
          Pick a coin, get a live naira quote, and pay with bank transfer. Straight to your wallet.
        </p>
      </div>

      {/* 2. Official SwiftSats Radiant Live Rates Card (Desktop & Mobile) */}
      <div
        id="live-rates"
        className="w-full rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white relative overflow-hidden transition-all duration-300 border border-emerald-500/35 bg-gradient-to-br from-[#060a0f] via-[#081017] to-[#04080d] shadow-xl shadow-emerald-950/30 group"
      >
        {/* Subtle Ambient Emerald Wave Glows */}
        <div className="absolute -top-12 -right-12 w-48 sm:w-64 h-48 sm:h-64 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 right-20 w-40 h-40 bg-emerald-600/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          {/* Left Column: Metrics & Actions */}
          <div className="flex-1 space-y-3.5">
            {/* Top Bar: LIVE RATES & Live Market Active Badge */}
            <div className="flex items-center justify-between sm:justify-start gap-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00e676] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00e676] shadow-[0_0_8px_#00e676]" />
                </span>
                <span className="text-xs sm:text-[13px] font-black text-white tracking-widest uppercase">
                  LIVE RATES
                </span>
              </div>

              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#032014]/90 border border-[#00e676]/40 text-[#00e676] text-[10px] sm:text-[11px] font-bold shadow-xs backdrop-blur-md">
                <Activity className="w-3 h-3 text-[#00e676] animate-pulse" />
                <span>Live Market Active</span>
              </div>
            </div>

            {/* Velocity Numbers */}
            <div className="pt-0.5">
              <span className="text-[11px] sm:text-xs text-slate-300/90 font-medium block">
                Average Blockchain Settlement Velocity
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-3xl sm:text-4xl font-black font-sans tracking-tight text-white drop-shadow-sm">
                  8.4
                </span>
                <span className="text-base sm:text-lg font-black text-[#00e676] font-sans">
                  Seconds
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                Naira bank transfer to wallet broadcast in real-time
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 pt-1">
              <a
                href="#buy-wizard"
                className="flex-1 sm:flex-none py-2.5 px-5 rounded-xl bg-[#00e676] hover:bg-[#00c853] text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 transition-all"
              >
                <Zap className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                <span>Instant Buy</span>
              </a>

              <Link
                to="/track"
                className="flex-1 sm:flex-none py-2.5 px-5 rounded-xl bg-[#0c141c]/90 hover:bg-[#131f2b] text-white border border-slate-700/80 hover:border-slate-500 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 backdrop-blur-md active:scale-95 transition-all"
              >
                <span>Track Order</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>
            </div>
          </div>

          {/* Right Column: Speed S Emblem & BUY • TRADE • GROW Tagline */}
          <div className="flex flex-col items-center justify-center pt-2 sm:pt-0 sm:pl-4 sm:border-l sm:border-emerald-500/15">
            <div className="relative group-hover:scale-105 transition-transform duration-300 flex items-center justify-center">
              {/* Radial ambient glow behind emblem */}
              <div className="absolute inset-0 bg-[#00e676]/20 blur-xl rounded-full" />
              <img
                src="/logo-emblem.png"
                alt="SwiftSats Speed Emblem"
                className="w-24 h-24 sm:w-28 sm:h-28 object-contain relative z-10 drop-shadow-[0_0_15px_rgba(0,230,118,0.4)]"
                loading="eager"
              />
            </div>

            <div className="mt-1 text-center">
              <span className="text-[10px] sm:text-[11px] font-black tracking-[0.25em] text-[#00e676] uppercase select-none">
                BUY <span className="text-white/60">•</span> TRADE <span className="text-white/60">•</span> GROW
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. The Core Buy Flow Wizard */}
      <div id="buy-wizard" className="w-full">
        <BuyWizard />
      </div>

      {/* 4. Trust Badges Footer Row */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center pt-2">
        <div className="p-2 sm:p-3 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.06] shadow-xs">
          <ShieldCheck className="w-4 h-4 mx-auto text-emerald-600 dark:text-[#00e676] mb-1" />
          <span className="text-[10px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 block">Non-Custodial</span>
          <span className="text-[9px] text-slate-500 dark:text-slate-400 hidden sm:block">You control your keys</span>
        </div>

        <div className="p-2 sm:p-3 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.06] shadow-xs">
          <Zap className="w-4 h-4 mx-auto text-amber-500 mb-1" />
          <span className="text-[10px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 block">Instant Automated</span>
          <span className="text-[9px] text-slate-500 dark:text-slate-400 hidden sm:block">No KYC / zero wait</span>
        </div>

        <div className="p-2 sm:p-3 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.06] shadow-xs">
          <Lock className="w-4 h-4 mx-auto text-blue-500 mb-1" />
          <span className="text-[10px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 block">Fixed Rate Lock</span>
          <span className="text-[9px] text-slate-500 dark:text-slate-400 hidden sm:block">No slippage risk</span>
        </div>
      </div>
    </div>
  );
};
