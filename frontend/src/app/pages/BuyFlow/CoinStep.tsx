import React from 'react';
import { LiveRate, CoinCode } from '../../../shared/types';
import { getCoinLogo, GoldCheckmark } from '../../../shared/components/CryptoLogos';

interface CoinStepProps {
  rates: LiveRate[];
  selectedCoin: CoinCode;
  onSelectCoin: (coin: CoinCode) => void;
  onNext: () => void;
}

const COMING_SOON_OPTIONS = [
  {
    coin: 'ALIPAY' as CoinCode,
    name: 'Alipay',
    symbol: 'ALIPAY',
    isComingSoon: true,
  },
  {
    coin: 'VENMO' as CoinCode,
    name: 'Venmo',
    symbol: 'VENMO',
    isComingSoon: true,
  },
  {
    coin: 'CASHAPP' as CoinCode,
    name: 'Cash App',
    symbol: 'CASHAPP',
    isComingSoon: true,
  },
];

export const CoinStep: React.FC<CoinStepProps> = ({
  rates,
  selectedCoin,
  onSelectCoin,
  onNext,
}) => {
  const handleSelect = (coin: CoinCode, isComingSoon?: boolean) => {
    if (isComingSoon) return;
    onSelectCoin(coin);
    onNext();
  };

  return (
    <div className="space-y-2.5 sm:space-y-3">
      {/* Subheader hint matching bitshop reference */}
      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium pb-0.5">
        Live market prices. Pick the crypto you want to buy.
      </p>

      {/* Single-Column Stack of Wide Cards (Matching Image 2 & Image 3) */}
      <div className="flex flex-col gap-2.5">
        {rates.map((r) => {
          const isSelected = selectedCoin === r.coin;
          const displayPrice = r.price_usd ? `$${r.price_usd}` : '$1.00';
          const exchangeRate = r.usd_to_ngn_rate ? `₦${r.usd_to_ngn_rate} / $1` : '₦1,410.65 / $1';

          return (
            <div
              key={r.coin}
              onClick={() => handleSelect(r.coin)}
              className={`w-full p-3 sm:p-3.5 rounded-2xl flex items-center gap-3.5 cursor-pointer transition-all duration-150 select-none ${
                isSelected
                  ? 'bg-emerald-50/90 dark:bg-emerald-950/30 border-2 border-[#00c853] dark:border-[#00e676] shadow-sm'
                  : 'bg-white dark:bg-[#0e131d] border border-slate-200/90 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/20 shadow-xs'
              }`}
            >
              {/* Rounded Dark Icon Container */}
              <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center shrink-0 shadow-inner">
                {getCoinLogo(r.coin, 28)}
              </div>

              {/* Middle Coin Details */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white tracking-tight truncate">
                    {r.name}
                  </span>
                  <GoldCheckmark className="w-3.5 h-3.5 shrink-0" />
                </div>

                <div className="font-bold font-mono text-xs sm:text-sm text-[#00c853] dark:text-[#00e676] mt-0.5 tracking-tight leading-none">
                  {displayPrice}
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tracking-tight mt-1 leading-none">
                  {exchangeRate}
                </div>
              </div>
            </div>
          );
        })}

        {/* Coming Soon Options (Alipay, Venmo, Cash App - Matching Image 3) */}
        {COMING_SOON_OPTIONS.map((item) => (
          <div
            key={item.coin}
            className="w-full p-3 sm:p-3.5 rounded-2xl flex items-center gap-3.5 bg-slate-50/70 dark:bg-[#0e131d]/60 border border-dashed border-slate-200 dark:border-white/[0.06] opacity-75 cursor-not-allowed select-none"
          >
            <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center shrink-0">
              {getCoinLogo(item.coin, 28)}
            </div>

            <div className="min-w-0 flex-1">
              <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white tracking-tight truncate block">
                {item.name}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/25 mt-1">
                Coming soon
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info Matching Image 3 */}
      <div className="pt-3 text-center space-y-1 text-slate-400 dark:text-slate-500 text-[11px] font-medium border-t border-slate-100 dark:border-white/[0.06]">
        <p>Contact center <strong>0802 777 7877</strong></p>
        <p className="text-[10px] text-slate-400 dark:text-slate-600">
          Rates are refreshed in real time and confirmed at checkout.
        </p>
      </div>
    </div>
  );
};
