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
      {/* Precision Geometric SwiftSats Squircle Emblem */}
      <div
        style={{ width: size, height: size }}
        className="relative rounded-[28%] bg-[#07080d] p-[1.5px] border border-[#00e676]/40 shadow-sm shadow-emerald-500/25 shrink-0 group-hover:scale-105 transition-transform duration-200 flex items-center justify-center overflow-hidden"
      >
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-[78%] h-[78%] relative z-10"
        >
          <defs>
            <linearGradient id="ssLogoGrad" x1="12" y1="8" x2="52" y2="56" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#00f59b" />
              <stop offset="50%" stopColor="#00e676" />
              <stop offset="100%" stopColor="#00c853" />
            </linearGradient>
          </defs>

          {/* Top S-arm */}
          <path
            d="M44 14H24C19.58 14 16 17.58 16 22C16 26.42 19.58 30 24 30H36"
            stroke="url(#ssLogoGrad)"
            strokeWidth="5.5"
            strokeLinecap="round"
          />

          {/* Bottom S-arm */}
          <path
            d="M28 34H40C44.42 34 48 37.58 48 42C48 46.42 44.42 50 40 50H20"
            stroke="url(#ssLogoGrad)"
            strokeWidth="5.5"
            strokeLinecap="round"
          />

          {/* Core Lightning Velocity Slice */}
          <polygon points="37,12 26,28 38,28 27,52 40,30 30,30" fill="#ffffff" />
        </svg>
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
