import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const BitcoinLogo: React.FC<LogoProps> = ({ className = 'w-9 h-9', size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <circle cx="16" cy="16" r="16" fill="#F7931A" />
    <path
      d="M22.5 13.5C22.1 11.2 20.3 10.3 18 10V7.5H16.2V9.9C15.7 9.8 15.2 9.7 14.7 9.6V7.5H12.9V9.5C12.5 9.4 12.1 9.4 11.7 9.3L11.7 9.3L9.2 8.7L8.7 10.7C8.7 10.7 10 11 10 11C10.7 11.2 10.8 11.6 10.8 12V20.1C10.8 20.4 10.6 20.7 10 20.9C10 20.9 8.7 21.2 8.7 21.2L8.2 23.3L10.7 23.9C11.1 24 11.5 24.1 11.9 24.2V26.5H13.7V24.3C14.2 24.4 14.7 24.5 15.2 24.6V26.5H17V24.5C21.1 24.3 23.3 22.8 23.2 19.5C23.1 16.9 21.7 15.6 19.6 15C21.1 14.6 22.3 13.6 22.5 13.5ZM19.2 19.8C18.8 21.6 15.7 21.3 14.3 21.3V17.8C15.7 17.8 19.6 17.5 19.2 19.8ZM18.7 14.2C18.3 15.7 15.8 15.4 14.5 15.4V12.4C15.8 12.4 19 12.1 18.7 14.2Z"
      fill="white"
    />
  </svg>
);

export const USDCLogo: React.FC<LogoProps> = ({ className = 'w-9 h-9', size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <circle cx="16" cy="16" r="16" fill="#2775CA" />
    <circle cx="16" cy="16" r="13" fill="#2775CA" stroke="white" strokeWidth="1.5" strokeOpacity="0.4" />
    <path
      d="M16 8.5V10.5M16 21.5V23.5M19.5 12.8C19 11.7 17.7 11.2 16.2 11.2C14 11.2 12.8 12.4 12.8 13.8C12.8 17.2 19.8 15.6 19.8 19C19.8 20.6 18.4 21.8 16.2 21.8C14.2 21.8 13 21 12.5 19.5"
      stroke="white"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
  </svg>
);

export const BNBLogo: React.FC<LogoProps> = ({ className = 'w-9 h-9', size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <circle cx="16" cy="16" r="16" fill="#F3BA2F" />
    <path
      d="M16 8L19.5 11.5L16 15L12.5 11.5L16 8ZM11 13.5L14.5 17L11 20.5L7.5 17L11 13.5ZM21 13.5L24.5 17L21 20.5L17.5 17L21 13.5ZM16 19L19.5 22.5L16 26L12.5 22.5L16 19ZM16 16.2L17.2 17.4L16 18.6L14.8 17.4L16 16.2Z"
      fill="white"
    />
  </svg>
);

export const TetherLogo: React.FC<LogoProps & { network?: string }> = ({ className = 'w-9 h-9', size = 36, network }) => (
  <div className="relative inline-block">
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <circle cx="16" cy="16" r="16" fill="#26A17B" />
      <path
        d="M17.8 15.5V11H22V8H10V11H14.2V15.5C10.5 15.8 7.8 16.9 7.8 18.2C7.8 19.7 11.5 20.8 16 20.8C20.5 20.8 24.2 19.7 24.2 18.2C24.2 16.9 21.5 15.8 17.8 15.5ZM16 19.6C12.3 19.6 9.4 18.8 9.4 18.2C9.4 17.6 12.3 16.8 16 16.8C19.7 16.8 22.6 17.6 22.6 18.2C22.6 18.8 19.7 19.6 16 19.6Z"
        fill="white"
      />
    </svg>
    {network && (
      <span className="absolute -bottom-1 -right-1 text-[8px] font-black uppercase px-1 bg-slate-900 text-emerald-400 rounded-full border border-emerald-500/50">
        {network}
      </span>
    )}
  </div>
);

export const SolanaLogo: React.FC<LogoProps> = ({ className = 'w-9 h-9', size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <circle cx="16" cy="16" r="16" fill="#13141F" />
    <path
      d="M9 20.8L12.2 17.6H23L19.8 20.8H9ZM9 14.4L12.2 11.2H23L19.8 14.4H9ZM19.8 8L23 11.2H12.2L9 8H19.8Z"
      fill="url(#sol_grad)"
    />
    <defs>
      <linearGradient id="sol_grad" x1="9" y1="8" x2="23" y2="21" gradientUnits="userSpaceOnUse">
        <stop stopColor="#00FFA3" />
        <stop offset="1" stopColor="#DC1FFF" />
      </linearGradient>
    </defs>
  </svg>
);

export const EthereumLogo: React.FC<LogoProps> = ({ className = 'w-9 h-9', size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <circle cx="16" cy="16" r="16" fill="#627EEA" />
    <path d="M16 6L15.8 6.6V19.7L16 19.9L22 16.3L16 6Z" fill="white" fillOpacity="0.8" />
    <path d="M16 6L10 16.3L16 19.9V13.5V6Z" fill="white" />
    <path d="M16 21.1L15.9 21.3V26L16 26.3L22 17.5L16 21.1Z" fill="white" fillOpacity="0.8" />
    <path d="M16 26.3V21.1L10 17.5L16 26.3Z" fill="white" />
    <path d="M16 19.9L22 16.3L16 13.5V19.9Z" fill="white" fillOpacity="0.4" />
    <path d="M10 16.3L16 19.9V13.5L10 16.3Z" fill="white" fillOpacity="0.6" />
  </svg>
);

export const BitcoinCashLogo: React.FC<LogoProps> = ({ className = 'w-9 h-9', size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <circle cx="16" cy="16" r="16" fill="#0AC18E" />
    <path
      d="M21.5 13.2C21.1 11.2 19.5 10.4 17.5 10.2V8H15.9V10.1C15.5 10 15.1 9.9 14.6 9.8V8H13V10C12.6 9.9 12.3 9.9 11.9 9.8L9.7 9.3L9.3 11.1C9.3 11.1 10.4 11.4 10.4 11.4C11 11.6 11.1 11.9 11.1 12.3V19.2C11.1 19.5 10.9 19.7 10.4 19.9C10.4 19.9 9.3 20.2 9.3 20.2L8.9 22L11.1 22.5C11.5 22.6 11.8 22.7 12.2 22.8V25H13.8V23.1C14.2 23.2 14.6 23.3 15.1 23.4V25H16.7V23.3C20.3 23.1 22.2 21.8 22.1 18.9C22 16.6 20.8 15.4 19 14.9C20.3 14.5 21.3 13.6 21.5 13.2ZM18.6 19.2C18.3 20.8 15.6 20.5 14.4 20.5V17.5C15.6 17.5 19 17.2 18.6 19.2ZM18.2 14.4C17.9 15.7 15.7 15.4 14.6 15.4V12.8C15.7 12.8 18.5 12.5 18.2 14.4Z"
      fill="white"
    />
  </svg>
);

export const TronLogo: React.FC<LogoProps> = ({ className = 'w-9 h-9', size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <circle cx="16" cy="16" r="16" fill="#FF0013" />
    <path
      d="M8.5 9.5L23.5 8L18.5 24L8.5 9.5ZM18.2 10.5L10.8 11.3L16.2 20.2L18.2 10.5ZM19.8 10.3L18.5 17.8L21.8 10.1L19.8 10.3Z"
      fill="white"
    />
  </svg>
);

export const DogeLogo: React.FC<LogoProps> = ({ className = 'w-9 h-9', size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <circle cx="16" cy="16" r="16" fill="#C2A633" />
    <path
      d="M12 9H16.5C19.5 9 21.5 11 21.5 16C21.5 21 19.5 23 16.5 23H12V9ZM15 15H17.5V13.5H15V11H16.5C18.2 11 19.2 12.2 19.2 16C19.2 19.8 18.2 21 16.5 21H15V18.5H17.5V17H15V15Z"
      fill="white"
    />
  </svg>
);

export const PolygonLogo: React.FC<LogoProps> = ({ className = 'w-9 h-9', size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <circle cx="16" cy="16" r="16" fill="#8247E5" />
    <path
      d="M20.5 13.5L17.5 11.8V8.3L23.5 11.8V18.8L20.5 17V13.5ZM11.5 18.5L14.5 20.2V23.7L8.5 20.2V13.2L11.5 15V18.5ZM14.5 16.2L17.5 14.5L20.5 16.2L17.5 17.9L14.5 16.2ZM17.5 11.8L20.5 13.5L17.5 15.2L14.5 13.5L17.5 11.8ZM14.5 18.9L17.5 17.2L14.5 15.5L11.5 17.2L14.5 18.9Z"
      fill="white"
    />
  </svg>
);

export const ShibaLogo: React.FC<LogoProps> = ({ className = 'w-9 h-9', size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <circle cx="16" cy="16" r="16" fill="#FFA409" />
    <path
      d="M9 11L12 8L14 13L16 10L18 13L20 8L23 11L21 21L16 25L11 21L9 11ZM13 16C13 17 14 18 16 18C18 18 19 17 19 16H13Z"
      fill="#1A1A1A"
    />
    <circle cx="13.5" cy="14" r="1.5" fill="white" />
    <circle cx="18.5" cy="14" r="1.5" fill="white" />
  </svg>
);

export const StellarLogo: React.FC<LogoProps> = ({ className = 'w-9 h-9', size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <circle cx="16" cy="16" r="16" fill="#14B6EC" />
    <path
      d="M24 10.5C22.2 8.3 19.3 7 16 7C11.5 7 7.7 9.7 6.3 13.5L22.5 10.2C23 10.3 23.5 10.4 24 10.5ZM8 21.5C9.8 23.7 12.7 25 16 25C20.5 25 24.3 22.3 25.7 18.5L9.5 21.8C9 21.7 8.5 21.6 8 21.5ZM6.5 17.5L25.5 13.7C25.8 14.4 26 15.2 26 16C26 16.8 25.8 17.6 25.5 18.3L6.5 22.1C6.2 21.4 6 20.6 6 19.8C6 19 6.2 18.2 6.5 17.5Z"
      fill="white"
    />
  </svg>
);

export const AlipayLogo: React.FC<LogoProps> = ({ className = 'w-9 h-9', size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <rect width="32" height="32" rx="8" fill="#1677FF" />
    <path
      d="M23 14H18.5V11.5H22V10H18.5V8H16.5V10H10V11.5H16.5V14H11V15.5H19C18.2 19 15.8 21.5 12 23C13.8 23.8 15.8 24 17.5 23.5C21 22.2 23 18.5 23 14Z"
      fill="white"
    />
  </svg>
);

export const VenmoLogo: React.FC<LogoProps> = ({ className = 'w-9 h-9', size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <rect width="32" height="32" rx="8" fill="#008CFF" />
    <path
      d="M21 9C21.8 10.3 22.2 11.8 22.2 13.5C22.2 18.8 17.8 24.5 13.8 24.5C11.5 24.5 10 23.2 10 21.2C10 19.2 11.2 15.8 12.2 13.2L14.2 9H18.8L16.5 16.5C17.5 14.8 18.8 12.2 18.8 10.5C18.8 9.8 18.5 9.4 18.2 9H21Z"
      fill="white"
    />
  </svg>
);

export const CashAppLogo: React.FC<LogoProps> = ({ className = 'w-9 h-9', size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <rect width="32" height="32" rx="8" fill="#00D632" />
    <path
      d="M16.8 9V10.5C19.5 11 21 12.5 21 14.5C21 17.5 18 18.2 15.8 18.8C14 19.3 13.2 19.8 13.2 20.8C13.2 22 14.2 22.8 16 22.8C17.8 22.8 19.2 22 20 21L21.2 22.8C20 24.2 18.2 24.8 16.8 25V26.5H14.8V25C12.2 24.5 10.8 23 10.8 21C10.8 18 13.8 17.3 16 16.7C17.8 16.2 18.6 15.7 18.6 14.7C18.6 13.7 17.6 12.8 16 12.8C14.5 12.8 13.2 13.5 12.5 14.5L11.2 12.8C12.2 11.5 13.8 10.8 14.8 10.5V9H16.8Z"
      fill="white"
    />
  </svg>
);

export const GoldCheckmark: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 16 16" fill="none" className={className}>
    <circle cx="8" cy="8" r="7" fill="#EAB308" />
    <path d="M5 8L7 10L11 6" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const getCoinLogo = (coin: string, size = 36): React.ReactNode => {
  const upper = coin.toUpperCase();
  if (upper.includes('BTC') || upper.includes('BITCOIN')) return <BitcoinLogo size={size} />;
  if (upper.includes('USDC')) return <USDCLogo size={size} />;
  if (upper.includes('BNB')) return <BNBLogo size={size} />;
  if (upper.includes('ERC20')) return <TetherLogo size={size} network="ERC20" />;
  if (upper.includes('TRC20') || upper.includes('USDT_TRC20')) return <TetherLogo size={size} network="TRC20" />;
  if (upper.includes('BEP20')) return <TetherLogo size={size} network="BEP20" />;
  if (upper.includes('SOL')) return <SolanaLogo size={size} />;
  if (upper.includes('ETH')) return <EthereumLogo size={size} />;
  if (upper.includes('BCH')) return <BitcoinCashLogo size={size} />;
  if (upper.includes('TRX') || upper.includes('TRON')) return <TronLogo size={size} />;
  if (upper.includes('DOGE')) return <DogeLogo size={size} />;
  if (upper.includes('POL') || upper.includes('MATIC')) return <PolygonLogo size={size} />;
  if (upper.includes('SHIB')) return <ShibaLogo size={size} />;
  if (upper.includes('XLM')) return <StellarLogo size={size} />;
  if (upper.includes('ALIPAY')) return <AlipayLogo size={size} />;
  if (upper.includes('VENMO')) return <VenmoLogo size={size} />;
  if (upper.includes('CASHAPP')) return <CashAppLogo size={size} />;
  return <BitcoinLogo size={size} />;
};
