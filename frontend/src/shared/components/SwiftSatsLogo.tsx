import React from 'react';

interface LogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export const SwiftSatsLogo: React.FC<LogoProps> = ({
  size = 32,
  showText = true,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-2 sm:gap-2.5 select-none ${className}`}>
      {/* 4K SwiftSats Radiant Emblem */}
      <div
        style={{ width: size, height: size }}
        className="relative rounded-xl sm:rounded-2xl p-[1px] shadow-md shadow-emerald-500/30 shrink-0 group-hover:scale-105 transition-transform duration-200 flex items-center justify-center overflow-hidden bg-slate-900 ring-1 ring-emerald-500/30"
      >
        <img
          src="/logo-emblem.png"
          alt="SwiftSats"
          className="w-full h-full object-cover rounded-xl sm:rounded-2xl"
          loading="eager"
        />
      </div>

      {/* Brand Wordmark Typography - Balanced and Proportional on Mobile */}
      {showText && (
        <div className="flex flex-col">
          <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white leading-none">
            Swift<span className="text-[#00c853] dark:text-[#00e676]">Sats</span>
          </span>
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase leading-tight mt-0.5">
            Instant Onramp
          </span>
        </div>
      )}
    </div>
  );
};
