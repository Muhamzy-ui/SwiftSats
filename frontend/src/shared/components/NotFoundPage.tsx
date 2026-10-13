import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { SwiftSatsLogo } from './SwiftSatsLogo';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#07080d] text-slate-100 px-4 select-none">
      <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-slate-800 text-center shadow-2xl backdrop-blur-md">
        <div className="flex justify-center mb-6">
          <SwiftSatsLogo size={48} showText={false} />
        </div>

        <span className="text-6xl font-black font-mono text-[#00e676] block mb-2 tracking-tight">
          404
        </span>

        <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">
          Page Not Found
        </h1>

        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          The requested address does not exist, has been removed, or is private.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#00e676] hover:bg-[#00c853] text-slate-950 font-bold text-sm transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            <Home className="w-4 h-4" />
            <span>Return to Home</span>
          </Link>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition-all border border-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>
        </div>
      </div>
    </div>
  );
};
