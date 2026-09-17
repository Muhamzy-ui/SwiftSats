import React from 'react';
import { Link } from 'react-router-dom';
import { Sun, Moon, MessageCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { SwiftSatsLogo } from './SwiftSatsLogo';

export const Header: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#07080d]/95 backdrop-blur-md border-b border-slate-200/90 dark:border-white/[0.08] transition-colors duration-200">
      <div className="max-w-5xl mx-auto px-3.5 sm:px-6 h-13 sm:h-15 py-2 flex items-center justify-between">
        {/* Responsive SwiftSats Brand Logo */}
        <Link to="/" className="group flex items-center">
          <SwiftSatsLogo size={32} showText={true} className="sm:hidden" />
          <SwiftSatsLogo size={38} showText={true} className="hidden sm:flex" />
        </Link>

        {/* Right Action Bar */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* WhatsApp Support Pill */}
          <a
            href="https://wa.me/2348000000000"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp Support"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/[0.08] flex items-center justify-center transition-all shadow-xs"
            title="Customer Support"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-[#00e676]" />
          </a>

          {/* • Live Rates Pill Button */}
          <a
            href="#buy-wizard"
            className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/70 dark:hover:bg-emerald-900/80 border border-emerald-300 dark:border-emerald-500/40 text-[11px] sm:text-xs font-bold text-emerald-800 dark:text-[#00e676] transition-all shadow-xs"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#00c853] dark:bg-[#00e676] animate-pulse" />
            <span>Live rates</span>
          </a>

          {/* Theme Toggle (Light / Dark) */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 transition-all shadow-xs"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          >
            {theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
            ) : (
              <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-700" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
