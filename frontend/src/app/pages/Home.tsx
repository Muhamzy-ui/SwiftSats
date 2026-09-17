import React from 'react';
import { BuyWizard } from './BuyFlow/BuyWizard';
import { ShieldCheck, Zap, Lock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Home: React.FC = () => {
  return (
    <div className="space-y-4 sm:space-y-6 py-2 sm:py-6 max-w-xl mx-auto px-3 sm:px-4">

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

      {/* 2. Shiny Obsidian Black & Neon Green Gloss Card (Matching Image 1 & 4) */}
      <div id="live-rates" className="w-full glossy-black-card rounded-2xl sm:rounded-[24px] p-4 sm:p-5 text-white relative transition-all duration-300 hover:shadow-emerald-500/20">
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00e676] animate-ping" />
            <span className="text-xs font-black text-white tracking-wider uppercase">
              Live Rates
            </span>
          </div>
          <span className="text-[10px] sm:text-xs font-mono font-bold bg-[#00e676]/15 text-[#00e676] border border-[#00e676]/35 px-2.5 py-0.5 rounded-full backdrop-blur-md shadow-xs">
            Live Market Active
          </span>
        </div>

        <div className="py-2.5 relative z-10">
          <span className="text-[11px] sm:text-xs text-slate-400 font-medium block">
            Average Blockchain Settlement Velocity
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white drop-shadow-sm">
              8.4
            </span>
            <span className="text-sm sm:text-base font-bold text-[#00e676] font-mono">
              Seconds
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Naira bank transfer to wallet broadcast in real-time
          </p>
        </div>

        {/* Action Buttons (Deposit & Transfer style from Image 1 & 4) */}
        <div className="grid grid-cols-2 gap-2 pt-1 relative z-10">
          <a
            href="#buy-wizard"
            className="py-2.5 px-3 rounded-xl bg-[#00e676] hover:bg-[#00c853] text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
          >
            <Zap className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
            <span>Instant Buy</span>
          </a>

          <Link
            to="/track"
            className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center justify-center gap-1.5 backdrop-blur-md border border-white/15 active:scale-95 transition-all"
          >
            <span>Track Order</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
          </Link>
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
