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
      {/* Custom SwiftSats Vector Icon: Dynamic Lightning + Sat Ring Emblem */}
      <div
        style={{ width: size, height: size }}
        className="relative rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#00e676] via-[#00c853] to-[#0091ea] p-[1.5px] sm:p-[2px] shadow-sm shadow-emerald-500/25 shrink-0 group-hover:scale-105 transition-transform duration-200"
      >
        <div className="w-full h-full rounded-[9px] sm:rounded-[14px] bg-[#07080d] flex items-center justify-center relative overflow-hidden">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/30 to-cyan-500/20" />

          {/* Stylized Double Lightning & 'S' Emblem SVG */}
          <svg
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 relative z-10"
          >
            <defs>
              <linearGradient id="ssLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00e676" />
                <stop offset="50%" stopColor="#00f59b" />
                <stop offset="100%" stopColor="#00e5ff" />
              </linearGradient>
              <filter id="ssGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Top Bolt Segment forming S-curve */}
            <path
              d="M18.5 3L8 15.5H16L13.5 29L24 16.5H16L18.5 3Z"
              fill="url(#ssLogoGrad)"
              filter="url(#ssGlow)"
            />
            {/* Satoshi Ring Arc */}
            <circle
              cx="16"
              cy="16"
              r="13.5"
              stroke="url(#ssLogoGrad)"
              strokeWidth="1.8"
              strokeDasharray="4 3"
              strokeOpacity="0.4"
            />
          </svg>
        </div>
      </div>

      {/* Brand Wordmark Typography - Balanced and Proportional on Mobile */}
      {showText && (
        <div className="flex flex-col">
          <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white leading-none">
            Swift<span className="text-[#00e676]">Sats</span>
          </span>
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase leading-tight mt-0.5">
            Instant Onramp
          </span>
        </div>
      )}
    </div>
  );
};
