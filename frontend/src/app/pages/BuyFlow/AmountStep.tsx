import React, { useState, useMemo } from 'react';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { LiveRate, QuoteCreatedResponse, CoinCode } from '../../../shared/types';
import { ordersApi } from '../../../shared/api/orders';
import { getCoinLogo } from '../../../shared/components/CryptoLogos';
import { formatNaira } from '../../../shared/utils/formatters';

interface AmountStepProps {
  selectedRate: LiveRate;
  onQuoteCreated: (quote: QuoteCreatedResponse) => void;
  onBack: () => void;
}

const PRESET_DOLLAR_VALUES = [5, 10, 20, 50, 100, 200, 250, 500, 750, 1000, 2000];

export const AmountStep: React.FC<AmountStepProps> = ({
  selectedRate,
  onQuoteCreated,
  onBack,
}) => {
  const [currencyMode, setCurrencyMode] = useState<'USD' | 'CRYPTO'>('USD');
  const [dollarInput, setDollarInput] = useState<string>('5');
  const [cryptoInput, setCryptoInput] = useState<string>('');
  const [isLocking, setIsLocking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [symbol] = selectedRate.coin.split('_');
  const coinPriceUsd = parseFloat(selectedRate.price_usd || '1.00');
  const ratePerDollar = parseFloat(selectedRate.usd_to_ngn_rate || '1410.65');
  const serviceFeeNgn = 1310.0;

  // Active numeric dollar value
  const dollarAmount = useMemo(() => {
    if (currencyMode === 'USD') {
      return parseFloat(dollarInput) || 0;
    } else {
      const cryptoVal = parseFloat(cryptoInput) || 0;
      return cryptoVal * coinPriceUsd;
    }
  }, [currencyMode, dollarInput, cryptoInput, coinPriceUsd]);

  // Live calculated amounts
  const calculations = useMemo(() => {
    if (dollarAmount <= 0) return null;

    const cryptoReceived = (dollarAmount / coinPriceUsd).toFixed(8);
    const cryptoValueNgn = dollarAmount * ratePerDollar;
    const totalNgnToPay = cryptoValueNgn + serviceFeeNgn;

    return {
      cryptoReceived,
      cryptoValueNgn,
      totalNgnToPay,
    };
  }, [dollarAmount, coinPriceUsd, ratePerDollar, serviceFeeNgn]);

  const handleDollarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9.]/g, '');
    setDollarInput(val);
    setErrorMsg(null);
  };

  const handleCryptoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9.]/g, '');
    setCryptoInput(val);
    setErrorMsg(null);
  };

  const handlePresetSelect = (val: number) => {
    setCurrencyMode('USD');
    setDollarInput(val.toString());
    setErrorMsg(null);
  };

  const handleProceed = async () => {
    if (dollarAmount < 5) {
      setErrorMsg('Minimum deposit is $5.00 USD');
      return;
    }
    if (dollarAmount > 5000) {
      setErrorMsg('Maximum single order is $5,000.00 USD');
      return;
    }

    if (!calculations) return;

    setIsLocking(true);
    setErrorMsg(null);

    try {
      const nairaAmount = Math.round(calculations.totalNgnToPay);
      const quote = await ordersApi.createQuote(selectedRate.coin as CoinCode, nairaAmount);
      onQuoteCreated(quote);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to lock rate with exchange.');
    } finally {
      setIsLocking(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Top Bar: Back Left + Asset Badge Right */}
      <div className="flex items-center justify-between pb-1">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xs">
          {getCoinLogo(selectedRate.coin, 18)}
          <span className="text-xs font-bold text-slate-900 dark:text-white tracking-tight">
            {selectedRate.name}
          </span>
        </div>
      </div>

      {/* Main Heading & Subtitle */}
      <div className="text-center space-y-1">
        <h1 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white tracking-tight">
          How much do you want?
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Enter the dollar value of {symbol} you want to buy.
        </p>
      </div>

      {/* Currency Switcher Pill ([ USD ] [ BTC ]) */}
      <div className="flex justify-center pt-0.5">
        <div className="inline-flex p-0.5 rounded-full bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-inner">
          <button
            type="button"
            onClick={() => setCurrencyMode('USD')}
            className={`px-5 sm:px-6 py-1 sm:py-1.5 rounded-full text-xs font-bold transition-all ${
              currencyMode === 'USD'
                ? 'bg-[#00c853] dark:bg-[#00e676] text-white dark:text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            USD
          </button>
          <button
            type="button"
            onClick={() => setCurrencyMode('CRYPTO')}
            className={`px-5 sm:px-6 py-1 sm:py-1.5 rounded-full text-xs font-bold transition-all ${
              currencyMode === 'CRYPTO'
                ? 'bg-[#00c853] dark:bg-[#00e676] text-white dark:text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {symbol}
          </button>
        </div>
      </div>

      {/* Input Box with Clean Emerald Focus */}
      <div className="relative rounded-xl bg-slate-50 dark:bg-slate-950/80 border-2 border-emerald-500/70 focus-within:border-[#00c853] dark:focus-within:border-[#00e676] focus-within:ring-2 focus-within:ring-emerald-500/20 p-3 sm:p-4 transition-all shadow-xs">
        <div className="flex items-center">
          <span className="text-xl sm:text-2xl font-black text-slate-400 dark:text-slate-500 font-mono mr-2 select-none">
            {currencyMode === 'USD' ? '$' : ''}
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={currencyMode === 'USD' ? dollarInput : cryptoInput}
            onChange={currencyMode === 'USD' ? handleDollarChange : handleCryptoChange}
            placeholder={currencyMode === 'USD' ? '0.00' : '0.00000000'}
            className="w-full bg-transparent text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none tracking-tight"
            autoFocus
          />
        </div>
      </div>

      {/* Quick Select Dollar Value Pills */}
      <div className="flex flex-wrap gap-1.5 pt-0.5">
        {PRESET_DOLLAR_VALUES.map((val) => {
          const isSelected = currencyMode === 'USD' && dollarAmount === val;
          return (
            <button
              key={val}
              type="button"
              onClick={() => handlePresetSelect(val)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                isSelected
                  ? 'bg-emerald-100 dark:bg-emerald-950/90 text-emerald-900 dark:text-[#00e676] border border-emerald-500 shadow-xs'
                  : 'bg-white dark:bg-slate-900/90 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
              }`}
            >
              ${val}
            </button>
          );
        })}
      </div>

      {/* Live Quote Breakdown Card - Exactly as requested */}
      {calculations && dollarAmount >= 5 ? (
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0e131d] border border-slate-200/90 dark:border-white/[0.08] shadow-sm space-y-2.5 text-xs font-medium animate-in fade-in-50 duration-150">
          {/* 1. You receive */}
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-white/[0.06]">
            <span className="text-slate-600 dark:text-slate-300 font-semibold text-sm">You receive</span>
            <span className="text-base sm:text-lg font-black font-mono text-slate-950 dark:text-white">
              {calculations.cryptoReceived} {symbol}
            </span>
          </div>

          {/* 2. BTC/Coin price */}
          <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 font-mono text-xs">
            <span>{symbol} price</span>
            <span className="text-slate-800 dark:text-slate-200 font-semibold">
              ${coinPriceUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
            </span>
          </div>

          {/* 3. Dollar value */}
          <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 font-mono text-xs">
            <span>Dollar value</span>
            <span className="text-slate-800 dark:text-slate-200 font-semibold">
              ${dollarAmount.toFixed(2)}
            </span>
          </div>

          {/* 4. Exchange rate */}
          <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 font-mono text-xs">
            <span>Exchange rate</span>
            <span className="text-slate-800 dark:text-slate-200 font-semibold">
              ₦{ratePerDollar.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / $1
            </span>
          </div>

          {/* 5. Crypto value */}
          <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 font-mono text-xs">
            <span>Crypto value</span>
            <span className="text-slate-800 dark:text-slate-200 font-semibold">
              {formatNaira(calculations.cryptoValueNgn)}
            </span>
          </div>

          {/* 6. Service fee */}
          <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 font-mono text-xs">
            <span>Service fee</span>
            <span className="text-emerald-600 dark:text-[#00e676] font-semibold">
              {formatNaira(serviceFeeNgn)}
            </span>
          </div>

          {/* 7. Total to pay */}
          <div className="pt-2.5 border-t border-slate-200 dark:border-white/[0.08] flex justify-between items-center">
            <span className="font-bold text-slate-900 dark:text-white text-sm">Total to pay</span>
            <span className="text-xl sm:text-2xl font-black font-mono text-[#00c853] dark:text-[#00e676]">
              {formatNaira(calculations.totalNgnToPay)}
            </span>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0e131d] border border-slate-200/80 dark:border-white/[0.06] text-center">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {dollarAmount > 0 && dollarAmount < 5
              ? 'Minimum order amount is $5.00 USD'
              : 'Enter an amount above to see your live breakdown.'}
          </span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Primary Continue Button */}
      <button
        type="button"
        onClick={handleProceed}
        disabled={isLocking || dollarAmount < 5}
        className="w-full py-3.5 rounded-xl bg-[#00c853] hover:bg-[#00b046] dark:bg-[#00e676] dark:hover:bg-[#00c853] active:scale-[0.99] disabled:opacity-40 text-white dark:text-slate-950 font-black text-sm shadow-md transition-all flex items-center justify-center gap-2"
      >
        <span>{isLocking ? 'Generating Quote...' : 'Continue'}</span>
      </button>
    </div>
  );
};
