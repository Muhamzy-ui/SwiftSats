import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { CoinStep } from './CoinStep';
import { AmountStep } from './AmountStep';
import { WalletStep } from './WalletStep';
import { PayStep } from './PayStep';
import { LiveRate, CoinCode, QuoteCreatedResponse, OrderLockedResponse } from '../../../shared/types';
import { ordersApi } from '../../../shared/api/orders';
import { storeRecentOrder, updateStoredOrderStatus, getOpenOrder } from '../../../shared/utils/orderStorage';

export type Step = 'COIN' | 'AMOUNT' | 'WALLET' | 'PAY';

// Instant default catalog matching ₦1,410.65 / $1 exchange rate
const INITIAL_DEFAULT_RATES: LiveRate[] = [
  {
    coin: 'BTC',
    name: 'Bitcoin',
    symbol: 'BTC',
    network: 'BITCOIN',
    price_usd: '77590.78',
    usd_to_ngn_rate: '1372.20',
    rate_ngn: '109500000.00',
    is_featured: true,
    speed_category: 'Standard',
    estimated_delivery_time: 'Instant (~10 min)',
    min_amount_usd: '1.00',
    min_amount_ngn: '1500.00',
    max_amount_ngn: '5000000.00',
    network_fee_crypto: '0.00005',
  },
  {
    coin: 'USDC',
    name: 'USDC',
    symbol: 'USDC',
    network: 'BASE',
    price_usd: '0.996',
    usd_to_ngn_rate: '1372.20',
    rate_ngn: '1405.85',
    is_featured: true,
    speed_category: 'Fastest',
    estimated_delivery_time: 'Instant (~15 sec)',
    min_amount_usd: '1.00',
    min_amount_ngn: '1500.00',
    max_amount_ngn: '5000000.00',
    network_fee_crypto: '0.5',
  },
  {
    coin: 'BNB',
    name: 'BNB',
    symbol: 'BNB',
    network: 'BEP20',
    price_usd: '684.61',
    usd_to_ngn_rate: '1372.20',
    rate_ngn: '966166.00',
    is_featured: true,
    speed_category: 'Fastest',
    estimated_delivery_time: 'Instant (~20 sec)',
    min_amount_usd: '1.00',
    min_amount_ngn: '1500.00',
    max_amount_ngn: '5000000.00',
    network_fee_crypto: '0.001',
  },
  {
    coin: 'USDT_ERC20',
    name: 'ERC20',
    symbol: 'USDT',
    network: 'ERC20',
    price_usd: '0.999',
    usd_to_ngn_rate: '1372.20',
    rate_ngn: '1409.84',
    is_featured: true,
    speed_category: 'Standard',
    estimated_delivery_time: 'Instant (~1 min)',
    min_amount_usd: '1.00',
    min_amount_ngn: '1500.00',
    max_amount_ngn: '5000000.00',
    network_fee_crypto: '2.0',
  },
  {
    coin: 'USDT_TRC20',
    name: 'TRC20',
    symbol: 'USDT',
    network: 'TRC20',
    price_usd: '0.999',
    usd_to_ngn_rate: '1372.20',
    rate_ngn: '1409.84',
    is_featured: true,
    speed_category: 'Fastest',
    estimated_delivery_time: 'Instant (~30 sec)',
    min_amount_usd: '1.00',
    min_amount_ngn: '1500.00',
    max_amount_ngn: '5000000.00',
    network_fee_crypto: '1.0',
  },
  {
    coin: 'SOL',
    name: 'SOL',
    symbol: 'SOL',
    network: 'SOLANA',
    price_usd: '101.76',
    usd_to_ngn_rate: '1372.20',
    rate_ngn: '143614.00',
    is_featured: true,
    speed_category: 'Fastest',
    estimated_delivery_time: 'Instant (~15 sec)',
    min_amount_usd: '1.00',
    min_amount_ngn: '1500.00',
    max_amount_ngn: '5000000.00',
    network_fee_crypto: '0.005',
  },
  {
    coin: 'USDT_BEP20',
    name: 'BEP20',
    symbol: 'USDT',
    network: 'BEP20',
    price_usd: '0.999',
    usd_to_ngn_rate: '1372.20',
    rate_ngn: '1409.84',
    is_featured: true,
    speed_category: 'Fastest',
    estimated_delivery_time: 'Instant (~20 sec)',
    min_amount_usd: '1.00',
    min_amount_ngn: '1500.00',
    max_amount_ngn: '5000000.00',
    network_fee_crypto: '0.5',
  },
  {
    coin: 'ETH',
    name: 'ETH',
    symbol: 'ETH',
    network: 'ERC20',
    price_usd: '2442.52',
    usd_to_ngn_rate: '1372.20',
    rate_ngn: '3447006.00',
    is_featured: true,
    speed_category: 'Fastest',
    estimated_delivery_time: 'Instant (~1 min)',
    min_amount_usd: '1.00',
    min_amount_ngn: '1500.00',
    max_amount_ngn: '5000000.00',
    network_fee_crypto: '0.0005',
  },
  {
    coin: 'BCH',
    name: 'BCH',
    symbol: 'BCH',
    network: 'BCH',
    price_usd: '245.54',
    usd_to_ngn_rate: '1372.20',
    rate_ngn: '346528.00',
    is_featured: false,
    speed_category: 'Standard',
    estimated_delivery_time: 'Instant (~5 min)',
    min_amount_usd: '1.00',
    min_amount_ngn: '1500.00',
    max_amount_ngn: '5000000.00',
    network_fee_crypto: '0.001',
  },
  {
    coin: 'TRX',
    name: 'Tron',
    symbol: 'TRX',
    network: 'TRC20',
    price_usd: '0.329',
    usd_to_ngn_rate: '1372.20',
    rate_ngn: '465.43',
    is_featured: false,
    speed_category: 'Fastest',
    estimated_delivery_time: 'Instant (~30 sec)',
    min_amount_usd: '1.00',
    min_amount_ngn: '1500.00',
    max_amount_ngn: '5000000.00',
    network_fee_crypto: '1.0',
  },
  {
    coin: 'DOGE',
    name: 'Dogecoin',
    symbol: 'DOGE',
    network: 'DOGE',
    price_usd: '0.082',
    usd_to_ngn_rate: '1372.20',
    rate_ngn: '116.09',
    is_featured: false,
    speed_category: 'Fastest',
    estimated_delivery_time: 'Instant (~1 min)',
    min_amount_usd: '1.00',
    min_amount_ngn: '1500.00',
    max_amount_ngn: '5000000.00',
    network_fee_crypto: '2.0',
  },
  {
    coin: 'POL',
    name: 'Polygon',
    symbol: 'POL',
    network: 'POLYGON',
    price_usd: '0.091',
    usd_to_ngn_rate: '1372.20',
    rate_ngn: '128.86',
    is_featured: false,
    speed_category: 'Fastest',
    estimated_delivery_time: 'Instant (~15 sec)',
    min_amount_usd: '1.00',
    min_amount_ngn: '1500.00',
    max_amount_ngn: '5000000.00',
    network_fee_crypto: '0.1',
  },
  {
    coin: 'SHIB',
    name: 'Shiba Inu',
    symbol: 'SHIB',
    network: 'ERC20',
    price_usd: '0.00000508',
    usd_to_ngn_rate: '1372.20',
    rate_ngn: '0.00717',
    is_featured: false,
    speed_category: 'Standard',
    estimated_delivery_time: 'Instant (~1 min)',
    min_amount_usd: '1.00',
    min_amount_ngn: '1500.00',
    max_amount_ngn: '5000000.00',
    network_fee_crypto: '100000.0',
  },
  {
    coin: 'XLM',
    name: 'Stellar',
    symbol: 'XLM',
    network: 'STELLAR',
    price_usd: '0.175',
    usd_to_ngn_rate: '1372.20',
    rate_ngn: '247.72',
    is_featured: false,
    speed_category: 'Fastest',
    estimated_delivery_time: 'Instant (~5 sec)',
    min_amount_usd: '1.00',
    min_amount_ngn: '1500.00',
    max_amount_ngn: '5000000.00',
    network_fee_crypto: '0.1',
  },
];

export const BuyWizard: React.FC = () => {
  const [step, setStep] = useState<Step>('COIN');
  const [rates, setRates] = useState<LiveRate[]>(INITIAL_DEFAULT_RATES);
  const [selectedCoin, setSelectedCoin] = useState<CoinCode>('BTC');
  const [quote, setQuote] = useState<QuoteCreatedResponse | null>(null);
  const [orderLocked, setOrderLocked] = useState<OrderLockedResponse | null>(null);

  // Partner Deep-Link onramp state
  const [partnerSource, setPartnerSource] = useState<string | null>(null);
  const [partnerOrderId, setPartnerOrderId] = useState<string | null>(null);
  const [returnUrl, setReturnUrl] = useState<string | null>(null);
  const [initialWallet, setInitialWallet] = useState<string>('');
  const [initialAmount, setInitialAmount] = useState<string>('');
  const [initialEmail, setInitialEmail] = useState<string>('');
  const [isAutoLocking, setIsAutoLocking] = useState<boolean>(false);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const res = await ordersApi.getLiveRates();
        if (res.success && res.rates && res.rates.length > 0) {
          setRates(res.rates);
        }
      } catch (err) {
        console.warn('Live rates background notice:', err);
      }
    };
    fetchRates();

    // 1. Check for incoming URL Deep-Link parameters (from Axiom Wallet or partner websites)
    const params = new URLSearchParams(window.location.search);
    const orderIdParam = params.get('order_id') || params.get('orderId');
    let sourceParam = params.get('source') || params.get('partner') || params.get('ref');
    if (!sourceParam && orderIdParam?.toUpperCase().startsWith('AXM')) {
      sourceParam = 'axiom';
    }
    const coinParam = params.get('coin') || params.get('crypto') || params.get('asset');
    const walletParam = params.get('wallet') || params.get('address') || params.get('dest');
    const amountParam = params.get('amount') || params.get('ngn') || params.get('usd');
    const emailParam = params.get('email');
    const returnUrlParam = params.get('return_url') || params.get('returnUrl') || params.get('redirect_url');

    if (sourceParam) setPartnerSource(sourceParam.trim().toLowerCase());
    if (orderIdParam) setPartnerOrderId(orderIdParam.trim());
    if (returnUrlParam) setReturnUrl(returnUrlParam.trim());
    if (walletParam) setInitialWallet(walletParam.trim());
    if (amountParam) setInitialAmount(amountParam.trim());
    if (emailParam) setInitialEmail(emailParam.trim());

    let targetCoin: CoinCode = 'USDT_BEP20';
    if (coinParam) {
      const clean = coinParam.trim().toUpperCase();
      if (clean === 'USDT' || clean === 'USDT_BEP20' || clean === 'BSC' || clean === 'BEP20') {
        targetCoin = 'USDT_BEP20';
      } else if (clean === 'USDT_TRC20' || clean === 'TRC20') {
        targetCoin = 'USDT_TRC20';
      } else if (clean === 'BTC' || clean === 'BITCOIN') {
        targetCoin = 'BTC';
      } else if (clean === 'ETH' || clean === 'ETHEREUM') {
        targetCoin = 'ETH';
      } else if (clean === 'SOL' || clean === 'SOLANA') {
        targetCoin = 'SOL';
      } else if (clean === 'USDC') {
        targetCoin = 'USDC';
      } else if (clean === 'BNB') {
        targetCoin = 'BNB';
      }
      setSelectedCoin(targetCoin);
    }

    // AUTO-JUMP DIRECTLY TO PAGE 4 (PAYSTEP):
    // If incoming request has both wallet AND amount (from Axiom Wallet),
    // automatically generate the quote, lock the order, and land right on Nomba payment instructions!
    if (walletParam && amountParam) {
      const rawAmt = parseFloat(amountParam.trim());
      const isUsd = params.get('currency')?.toUpperCase() === 'USD' || (rawAmt > 0 && rawAmt <= 1000 && !params.get('currency'));
      const targetNgn = isUsd ? Math.round(rawAmt * 1372.20) : Math.round(rawAmt);

      setIsAutoLocking(true);
      (async () => {
        try {
          const q = await ordersApi.createQuote(targetCoin, targetNgn, sourceParam || 'axiom');
          storeRecentOrder({
            order_reference: q.order_reference,
            coin: q.coin,
            amount_ngn: q.fiat_amount_ngn,
            crypto_amount: q.crypto_amount,
            status: 'QUOTE_LOCKED',
            timestamp: Date.now(),
          });
          setQuote(q);

          const ord = await ordersApi.lockAndCreateOrder(
            q.order_reference,
            walletParam.trim(),
            emailParam?.trim() || `axiom_${orderIdParam || Date.now()}@axiomwallets.io`,
            sourceParam || 'axiom'
          );
          storeRecentOrder({
            order_reference: ord.order.order_reference,
            coin: ord.order.coin,
            amount_ngn: ord.order.fiat_amount_expected || ord.order.fiat_amount_ngn,
            crypto_amount: ord.order.crypto_amount,
            status: ord.order.status || 'AWAITING_PAYMENT',
            timestamp: Date.now(),
          });
          setOrderLocked(ord);
          setStep('PAY'); // <--- LAND DIRECTLY ON PAGE 4 (PAY)!
        } catch (err: any) {
          console.warn('Auto on-ramp lock error, falling back to Amount step:', err);
          setStep('AMOUNT');
        } finally {
          setIsAutoLocking(false);
        }
      })();
      return;
    }

    // If user has an open order awaiting payment, auto-resume directly on Step 4 (PAY)
    const openOrder = getOpenOrder();
    if (openOrder && (openOrder.status === 'AWAITING_PAYMENT' || openOrder.status === 'QUOTE_LOCKED')) {
      ordersApi.lookupOrder(openOrder.order_reference).then((res) => {
        if (res.success && res.order && res.order.status === 'AWAITING_PAYMENT') {
          setOrderLocked({
            success: true,
            order: res.order,
            payment_instructions: {
              bank_name: res.order.virtual_bank_name || 'Nomba Microfinance Bank',
              account_number: res.order.virtual_account_number || '1623796514',
              account_name: res.order.virtual_account_name || 'Mbovibe Systems/swiftsats',
              amount_ngn: String(res.order.fiat_amount_expected || res.order.fiat_amount_ngn),
              salt_kobo: res.order.salt_kobo_value,
              order_reference: res.order.order_reference,
              expires_at: res.order.quote_expires_at,
            },
          });
          setStep('PAY');
        }
      }).catch(() => {});
    } else if (coinParam || sourceParam) {
      // Deep linked directly from external website without all params: Skip coin selection & jump straight to Amount!
      setStep('AMOUNT');
    }
  }, []);

  const selectedRate = rates.find((r) => r.coin === selectedCoin) || rates[0];

  if (isAutoLocking) {
    return (
      <div className="w-full max-w-lg mx-auto bg-white dark:bg-[#0c1017] border border-slate-200/90 dark:border-white/[0.08] rounded-2xl p-8 text-center space-y-4 shadow-xl animate-in fade-in duration-200">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[#00c853] dark:text-[#00e676] flex items-center justify-center mx-auto">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Securing Payment Instructions...
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Locking exchange rate and generating your bank transfer details.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto bg-white dark:bg-[#0c1017] border border-slate-200/90 dark:border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-4 shadow-[0_8px_20px_rgba(0,0,0,0.04)] dark:shadow-2xl transition-all duration-200 relative">
      {/* Reference Screenshot Circular Step Navigation */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {[
            { key: 'COIN', num: '1', label: 'Coin' },
            { key: 'AMOUNT', num: '2', label: 'Amount' },
            { key: 'WALLET', num: '3', label: 'Wallet' },
            { key: 'PAY', num: '4', label: 'Pay' },
          ].map((s, idx, arr) => {
            const isCurrent = step === s.key;
            const isPassed =
              (s.key === 'COIN' && (step === 'AMOUNT' || step === 'WALLET' || step === 'PAY')) ||
              (s.key === 'AMOUNT' && (step === 'WALLET' || step === 'PAY')) ||
              (s.key === 'WALLET' && step === 'PAY');

            return (
              <React.Fragment key={s.key}>
                <div className="flex flex-col items-center gap-0.5 sm:gap-1">
                  <div
                    className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-black transition-all ${
                      isCurrent
                        ? 'border-2 border-[#00c853] dark:border-[#00e676] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-[#00e676]'
                        : isPassed
                        ? 'bg-[#00c853] dark:bg-[#00e676] text-white dark:text-slate-950 font-black'
                        : 'border border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600'
                    }`}
                  >
                    {isPassed ? '✓' : s.num}
                  </div>
                  <span
                    className={`text-[9px] sm:text-[10px] font-bold ${
                      isCurrent
                        ? 'text-slate-950 dark:text-white'
                        : isPassed
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {idx < arr.length - 1 && (
                  <div
                    className={`h-[1.5px] w-2 sm:w-4 rounded-full mb-3 ${
                      isPassed ? 'bg-[#00c853] dark:bg-[#00e676]' : 'bg-slate-200 dark:bg-slate-800'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Small Rounded Live Rates Pill */}
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-[#00e676] border border-emerald-300 dark:border-emerald-500/40 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00c853] dark:bg-[#00e676] animate-pulse" />
          <span>Live Rates</span>
        </span>
      </div>

      {/* Dynamic Step Views */}
      {step === 'COIN' && (
        <CoinStep
          rates={rates}
          selectedCoin={selectedCoin}
          onSelectCoin={(c) => setSelectedCoin(c)}
          onNext={() => setStep('AMOUNT')}
        />
      )}

      {step === 'AMOUNT' && selectedRate && (
        <AmountStep
          selectedRate={selectedRate}
          initialAmount={initialAmount}
          partnerCode={partnerSource || undefined}
          onQuoteCreated={(q) => {
            storeRecentOrder({
              order_reference: q.order_reference,
              coin: q.coin,
              amount_ngn: q.fiat_amount_ngn,
              crypto_amount: q.crypto_amount,
              status: 'QUOTE_LOCKED',
              timestamp: Date.now(),
            });
            setQuote(q);
            setStep('WALLET');
          }}
          onBack={() => setStep('COIN')}
        />
      )}

      {step === 'WALLET' && quote && (
        <WalletStep
          quote={quote}
          initialWalletAddress={initialWallet}
          initialEmail={initialEmail}
          partnerCode={partnerSource || undefined}
          onOrderLocked={(ord) => {
            storeRecentOrder({
              order_reference: ord.order.order_reference,
              coin: ord.order.coin,
              amount_ngn: ord.order.fiat_amount_expected || ord.order.fiat_amount_ngn,
              crypto_amount: ord.order.crypto_amount,
              status: ord.order.status || 'AWAITING_PAYMENT',
              timestamp: Date.now(),
            });
            setOrderLocked(ord);
            setStep('PAY');
          }}
          onBack={() => setStep('AMOUNT')}
        />
      )}

      {step === 'PAY' && orderLocked && (
        <PayStep
          orderData={orderLocked}
          returnUrl={returnUrl || undefined}
          partnerOrderId={partnerOrderId || undefined}
          partnerSource={partnerSource || undefined}
          onSuccess={(comp) => {
            updateStoredOrderStatus(
              comp.order_reference,
              'COMPLETED',
              comp.tx_hash || undefined,
              comp.explorer_url || undefined
            );
          }}
          onCancel={() => {
            setOrderLocked(null);
            setStep('COIN');
          }}
        />
      )}
    </div>
  );
};
