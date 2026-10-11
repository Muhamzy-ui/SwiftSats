import React from 'react';
import { ShieldCheck, Zap, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-200 dark:border-white/[0.06] bg-white/95 dark:bg-[#07080d]/90 py-6 transition-colors duration-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-xs">
            <Zap className="w-3 h-3 fill-slate-950 stroke-slate-950" />
          </div>
          <span className="font-bold text-slate-900 dark:text-white">SwiftSats</span>
          <span className="text-[11px] text-slate-400">© {new Date().getFullYear()}</span>
        </div>

        {/* User Navigation & Support Contact */}
        <div className="flex items-center flex-wrap justify-center gap-4 sm:gap-6 text-xs">
          <Link to="/track" className="hover:text-[#00c853] dark:hover:text-[#00e676] transition-colors font-medium">
            Track Order
          </Link>
          <Link to="/support" className="hover:text-[#00c853] dark:hover:text-[#00e676] transition-colors font-medium">
            Help Center
          </Link>
          <a
            href="https://wa.me/2348072410373?text=Hello%20SwiftSats%20Support%2C%20I%20need%20assistance"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-bold text-emerald-600 dark:text-[#00e676] hover:underline bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-300 dark:border-emerald-500/30"
          >
            <MessageCircle className="w-3.5 h-3.5 fill-current" />
            <span>08072410373</span>
          </a>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
          <ShieldCheck className="w-4 h-4 text-[#00c853] dark:text-[#00e676]" />
          <span>Non-Custodial • Direct Onramp</span>
        </div>
      </div>
    </footer>
  );
};
