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
      {/* High-Impact SwiftSats Radiant Emerald Emblem */}
      <div
        style={{ width: size, height: size }}
        className="relative rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#00f59b] via-[#00e676] to-[#00c853] p-[2px] shadow-md shadow-emerald-500/25 shrink-0 group-hover:scale-105 transition-transform duration-200 flex items-center justify-center overflow-hidden"
      >
        <div className="w-full h-full rounded-[9px] sm:rounded-[12px] bg-[#07080d] flex items-center justify-center relative overflow-hidden">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute inset-0 bg-emerald-500/20" />

          {/* Bold, Razor-Sharp High-Velocity Lightning Emblem */}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-[74%] h-[74%] relative z-10 drop-shadow-[0_0_8px_rgba(0,230,118,0.75)]"
          >
            {/* Primary Solid Emerald Bolt */}
            <path
              d="M14.5 1.5L3.5 12.5H11.5L8.5 22.5L20.5 10.5H12.5L15 1.5H14.5Z"
              fill="#00e676"
            />
            {/* High-Contrast Crisp Pure White Velocity Core */}
            <path
              d="M14.5 1.5L8.5 12.5H12L8.5 22.5L11.5 12.5H7.5L14.5 1.5Z"
              fill="#ffffff"
              opacity="0.95"
            />
          </svg>
        </div>
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
