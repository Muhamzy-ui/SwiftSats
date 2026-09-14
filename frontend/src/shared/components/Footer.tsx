import React from 'react';
import { ShieldCheck, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-200 dark:border-white/[0.06] bg-white/90 dark:bg-[#07080d]/80 py-10 transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white">
            <Zap className="w-3.5 h-3.5 fill-white stroke-[2.5]" />
          </div>
          <span className="font-bold text-slate-900 dark:text-white">SwiftSats Direct Onramp</span>
          <span>© {new Date().getFullYear()}</span>
        </div>

        <div className="flex items-center gap-6">
          <Link to="/pin" className="hover:text-slate-900 dark:hover:text-white transition-colors font-medium">
            PIN Login
          </Link>
          <Link to="/track" className="hover:text-slate-900 dark:hover:text-white transition-colors font-medium">
            Track Order
          </Link>
          <Link to="/admin/login" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium">
            Operator Console
          </Link>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
          <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Quidax SEC Regulated Engine • 100% Non-Custodial</span>
        </div>
      </div>
    </footer>
  );
};
