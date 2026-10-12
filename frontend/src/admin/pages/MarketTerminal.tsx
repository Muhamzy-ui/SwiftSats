import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  ColorType,
  IChartApi,
  ISeriesApi,
  createSeriesMarkers,
} from 'lightweight-charts';
import {
  TrendingUp,
  TrendingDown,
  Layers,
  Eye,
  EyeOff,
  Zap,
  Globe,
  Radio,
} from 'lucide-react';
import { adminApi } from '../../shared/api/admin';
import { AdminOrderSummary } from '../../shared/types';

interface MarketPair {
  id: string;
  name: string;
  base: string;
  quote: string;
  basePrice: number;
  decimals: number;
}

const SUPPORTED_PAIRS: MarketPair[] = [
  { id: 'BTCUSDT', name: 'BTC / USDT', base: 'BTC', quote: 'USDT', basePrice: 67840.5, decimals: 2 },
  { id: 'ETHUSDT', name: 'ETH / USDT', base: 'ETH', quote: 'USDT', basePrice: 3540.2, decimals: 2 },
  { id: 'SOLUSDT', name: 'SOL / USDT', base: 'SOL', quote: 'USDT', basePrice: 154.8, decimals: 2 },
  { id: 'TRXUSDT', name: 'TRX / USDT', base: 'TRX', quote: 'USDT', basePrice: 0.1585, decimals: 4 },
  { id: 'USDTNGN', name: 'USDT / NGN', base: 'USDT', quote: 'NGN', basePrice: 1398.99, decimals: 2 },
];

export const MarketTerminal: React.FC = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  const [selectedPair, setSelectedPair] = useState<MarketPair>(SUPPORTED_PAIRS[0]);
  const [timeframe, setTimeframe] = useState<'1m' | '5m' | '15m' | '1h' | '4h' | '1D'>('15m');
  const [colorMode, setColorMode] = useState<'western' | 'chinese'>('western');
  const [showOrderFills, setShowOrderFills] = useState(true);
  const [recentOrders, setRecentOrders] = useState<AdminOrderSummary[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(SUPPORTED_PAIRS[0].basePrice);
  const [priceChange24h, setPriceChange24h] = useState<number>(2.45);
  const [high24h, setHigh24h] = useState<number>(SUPPORTED_PAIRS[0].basePrice * 1.03);
  const [low24h, setLow24h] = useState<number>(SUPPORTED_PAIRS[0].basePrice * 0.97);
  const [volume24h, setVolume24h] = useState<number>(14258900);
  const [lastTickDirection, setLastTickDirection] = useState<'up' | 'down'>('up');

  // Palette configuration based on Western vs Chinese conventions
  // Western: Green Up, Red Down
  // Chinese (国内红涨绿跌): Red Up (Bullish), Green Down (Bearish)
  const isChinese = colorMode === 'chinese';
  const upColor = isChinese ? '#ff334b' : '#00e676';
  const downColor = isChinese ? '#00e676' : '#ff3b5c';

  // Fetch recent completed orders to overlay on the chart
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await adminApi.getOrders({ status: 'COMPLETED', page_size: 20 });
        if (res.results) {
          setRecentOrders(res.results);
        }
      } catch (err) {
        console.warn('Could not load orders for terminal:', err);
      }
    };
    fetchOrders();
  }, []);

  // Initialize and re-render the Lightweight Charts engine
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Remove any previous chart instance
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const container = chartContainerRef.current;
    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight || 520,
      layout: {
        background: { type: ColorType.Solid, color: '#07080d' },
        textColor: '#94a3b8',
        fontSize: 11,
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(30, 41, 59, 0.45)', style: 1 },
        horzLines: { color: 'rgba(30, 41, 59, 0.45)', style: 1 },
      },
      crosshair: {
        vertLine: { color: 'rgba(0, 230, 118, 0.4)', width: 1, style: 2 },
        horzLine: { color: 'rgba(0, 230, 118, 0.4)', width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor: 'rgba(51, 65, 85, 0.4)',
        scaleMargins: {
          top: 0.1,
          bottom: 0.22,
        },
      },
      timeScale: {
        borderColor: 'rgba(51, 65, 85, 0.4)',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // 1. Candlestick Series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: upColor,
      downColor: downColor,
      borderVisible: false,
      wickUpColor: upColor,
      wickDownColor: downColor,
    });
    candleSeriesRef.current = candleSeries;

    // 2. Volume Series at bottom
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: 'rgba(0, 230, 118, 0.35)',
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.82,
        bottom: 0,
      },
    });
    volumeSeriesRef.current = volumeSeries;

    // Generate realistic historical candle data
    const baseP = selectedPair.basePrice;
    const nowSec = Math.floor(Date.now() / 1000);
    const intervalSec = timeframe === '1m' ? 60 : timeframe === '5m' ? 300 : timeframe === '15m' ? 900 : timeframe === '1h' ? 3600 : timeframe === '4h' ? 14400 : 86400;
    const candleCount = 120;

    let p = baseP * 0.98;
    const candleData = [];
    const volumeData = [];

    for (let i = candleCount; i >= 0; i--) {
      const time = (nowSec - i * intervalSec) as any;
      const volatility = baseP * 0.0035;
      const change = (Math.random() - 0.48) * volatility;
      const open = p;
      const close = p + change;
      const high = Math.max(open, close) + Math.random() * (volatility * 0.5);
      const low = Math.min(open, close) - Math.random() * (volatility * 0.5);
      p = close;

      candleData.push({ time, open, high, low, close });

      const isUp = close >= open;
      const barColor = isUp ? (isChinese ? 'rgba(255, 51, 75, 0.35)' : 'rgba(0, 230, 118, 0.35)') : (isChinese ? 'rgba(0, 230, 118, 0.35)' : 'rgba(255, 59, 92, 0.35)');
      volumeData.push({
        time,
        value: Math.floor(Math.random() * 80 + 15),
        color: barColor,
      });
    }

    candleSeries.setData(candleData);
    volumeSeries.setData(volumeData);
    setCurrentPrice(p);
    setHigh24h(baseP * 1.025);
    setLow24h(baseP * 0.975);
    setPriceChange24h(Number((((p - baseP) / baseP) * 100).toFixed(2)));
    setVolume24h(Math.floor(Math.random() * 15000000 + 4000000));

    // Overlay SwiftSats customer order fill markers
    if (showOrderFills && recentOrders.length > 0) {
      const markers = recentOrders.slice(0, 8).map((ord, idx) => {
        const orderTime = (nowSec - (idx * 12 + 4) * intervalSec) as any;
        return {
          time: orderTime,
          position: 'belowBar' as const,
          color: '#00e676',
          shape: 'arrowUp' as const,
          text: `BUY #${ord.order_reference.slice(0, 6)} (${ord.coin})`,
        };
      });
      createSeriesMarkers(candleSeries, markers);
    }

    chart.timeScale().fitContent();

    // Resize Observer for responsive charts on window or mobile resize
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0 || !chartRef.current) return;
      const { width, height } = entries[0].contentRect;
      chartRef.current.applyOptions({ width, height });
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [selectedPair, timeframe, colorMode, showOrderFills, recentOrders]);

  // Live WebSocket/Tick generator simulation (updates the active candle in real-time)
  useEffect(() => {
    const timer = setInterval(() => {
      if (!candleSeriesRef.current || !volumeSeriesRef.current) return;

      setCurrentPrice((prev) => {
        const delta = (Math.random() - 0.49) * (prev * 0.0008);
        const nextPrice = Number((prev + delta).toFixed(selectedPair.decimals));
        setLastTickDirection(delta >= 0 ? 'up' : 'down');

        const nowSec = Math.floor(Date.now() / 1000) as any;
        // Update active candle with new close price
        candleSeriesRef.current?.update({
          time: nowSec,
          open: prev,
          high: Math.max(prev, nextPrice) + Math.random() * (prev * 0.0002),
          low: Math.min(prev, nextPrice) - Math.random() * (prev * 0.0002),
          close: nextPrice,
        });

        const isUp = nextPrice >= prev;
        const barColor = isUp ? (isChinese ? 'rgba(255, 51, 75, 0.45)' : 'rgba(0, 230, 118, 0.45)') : (isChinese ? 'rgba(0, 230, 118, 0.45)' : 'rgba(255, 59, 92, 0.45)');
        volumeSeriesRef.current?.update({
          time: nowSec,
          value: Math.floor(Math.random() * 25 + 5),
          color: barColor,
        });

        return nextPrice;
      });
    }, 1500);

    return () => clearInterval(timer);
  }, [selectedPair, isChinese]);

  // Generated Mock L2 Order Book depth matching the selected pair
  const orderBook = useMemo(() => {
    const p = currentPrice;
    const step = p * 0.0004;
    const asks = [];
    const bids = [];

    for (let i = 5; i >= 1; i--) {
      asks.push({
        price: Number((p + i * step).toFixed(selectedPair.decimals)),
        amount: Number((Math.random() * 3.5 + 0.4).toFixed(3)),
        total: 0,
      });
    }

    for (let i = 1; i <= 5; i--) {
      bids.push({
        price: Number((p - i * step).toFixed(selectedPair.decimals)),
        amount: Number((Math.random() * 4.2 + 0.5).toFixed(3)),
        total: 0,
      });
    }
    return { asks, bids };
  }, [currentPrice, selectedPair]);

  return (
    <div className="space-y-4 max-w-full overflow-x-hidden text-slate-100 select-none">
      {/* Top Header / Asset Stats Bar */}
      <div className="bg-[#0b0f17] border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xl flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        {/* Left: Asset Selection & Live Price */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          {/* Pair Pills */}
          <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            {SUPPORTED_PAIRS.map((pair) => (
              <button
                key={pair.id}
                type="button"
                onClick={() => setSelectedPair(pair)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  selectedPair.id === pair.id
                    ? 'bg-emerald-500/20 text-[#00e676] border border-emerald-500/30 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {pair.name}
              </button>
            ))}
          </div>

          {/* Large Live Ticking Price */}
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl sm:text-3xl font-mono font-black tracking-tight transition-colors duration-150 ${
                lastTickDirection === 'up'
                  ? isChinese ? 'text-[#ff3b5c]' : 'text-[#00e676]'
                  : isChinese ? 'text-[#00e676]' : 'text-[#ff3b5c]'
              }`}
            >
              {selectedPair.quote === 'NGN' ? '₦' : '$'}
              {currentPrice.toLocaleString(undefined, { minimumFractionDigits: selectedPair.decimals })}
            </span>

            <span
              className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                priceChange24h >= 0
                  ? isChinese ? 'bg-rose-500/15 text-[#ff3b5c]' : 'bg-emerald-500/15 text-[#00e676]'
                  : isChinese ? 'bg-emerald-500/15 text-[#00e676]' : 'bg-rose-500/15 text-[#ff3b5c]'
              }`}
            >
              {priceChange24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{priceChange24h >= 0 ? '+' : ''}{priceChange24h}%</span>
            </span>
          </div>

          {/* 24h Stats */}
          <div className="hidden md:flex items-center gap-4 text-xs font-mono border-l border-slate-800 pl-4 text-slate-400">
            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-sans">24h High</span>
              <span className="text-white font-bold">{high24h.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-sans">24h Low</span>
              <span className="text-white font-bold">{low24h.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-sans">24h Vol</span>
              <span className="text-white font-bold">${(volume24h / 1000000).toFixed(2)}M</span>
            </div>
          </div>
        </div>

        {/* Right Controls: Timeframe, Chinese/Western Toggle, Order Marker Overlay */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Timeframe selector */}
          <div className="flex items-center bg-slate-900/90 p-0.5 rounded-xl border border-slate-800 text-xs font-semibold">
            {(['1m', '5m', '15m', '1h', '4h', '1D'] as const).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-1 rounded-lg transition-all ${
                  timeframe === tf
                    ? 'bg-white/10 text-white font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Chinese vs Western Color Mode Toggle */}
          <button
            type="button"
            onClick={() => setColorMode((prev) => (prev === 'western' ? 'chinese' : 'western'))}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all ${
              isChinese
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}
            title={isChinese ? 'Chinese K-Line (红涨绿跌: Red Up, Green Down)' : 'Western K-Line (Green Up, Red Down)'}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{isChinese ? '🇨🇳 红涨绿跌' : '🌐 Western K-Line'}</span>
          </button>

          {/* Customer Order Fills Overlay Toggle */}
          <button
            type="button"
            onClick={() => setShowOrderFills(!showOrderFills)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all ${
              showOrderFills
                ? 'bg-[#00e676]/15 border-[#00e676]/40 text-[#00e676]'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
            title="Plot real SwiftSats customer order fills on candles"
          >
            {showOrderFills ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
            <span>Customer Fills</span>
          </button>

          {/* Live WebSocket badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-bold text-emerald-400">
            <Radio className="w-3 h-3 text-[#00e676] animate-pulse" />
            <span>60 FPS TICKER</span>
          </div>
        </div>
      </div>

      {/* Main Terminal Grid: Chart (Left 75%) + L2 Order Book & Executions (Right 25%) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Candlestick Chart Window (TradingView Lightweight Charts) */}
        <div className="lg:col-span-3 bg-[#07080d] border border-slate-800/90 rounded-2xl p-2 sm:p-3 shadow-2xl relative flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 px-2 border-b border-slate-800/60 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-300">{selectedPair.name}</span>
              <span className="text-[10px] text-slate-500 uppercase">TradingView Engine • Hardware Canvas</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-xs ${isChinese ? 'bg-[#ff3b5c]' : 'bg-[#00e676]'}`} />
                Bullish
              </span>
              <span className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-xs ${isChinese ? 'bg-[#00e676]' : 'bg-[#ff3b5c]'}`} />
                Bearish
              </span>
            </div>
          </div>

          {/* The Actual Canvas Mounting Container */}
          <div ref={chartContainerRef} className="w-full h-[480px] sm:h-[540px] mt-1 rounded-xl overflow-hidden" />
        </div>

        {/* Right Panel: Live Depth Order Book & Recent SwiftSats Customer Executions */}
        <div className="lg:col-span-1 space-y-4">
          {/* L2 Order Book Card */}
          <div className="bg-[#0b0f17] border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-2">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Order Book (L2)</h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500">Spread: 0.04%</span>
            </div>

            {/* Asks (Sell Orders) */}
            <div className="space-y-1 font-mono text-xs">
              <div className="grid grid-cols-2 text-[10px] font-sans text-slate-500 uppercase pb-1">
                <span>Price ({selectedPair.quote})</span>
                <span className="text-right">Size ({selectedPair.base})</span>
              </div>

              {orderBook.asks.map((ask, idx) => (
                <div key={idx} className="grid grid-cols-2 py-0.5 relative">
                  <span className={isChinese ? 'text-[#00e676] font-semibold' : 'text-[#ff3b5c] font-semibold'}>
                    {ask.price.toLocaleString(undefined, { minimumFractionDigits: selectedPair.decimals })}
                  </span>
                  <span className="text-right text-slate-300">{ask.amount}</span>
                  <div
                    className={`absolute top-0 right-0 bottom-0 opacity-15 pointer-events-none rounded-xs ${
                      isChinese ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, ask.amount * 22)}%` }}
                  />
                </div>
              ))}
            </div>

            {/* Current Mid Price Banner */}
            <div className="my-2 py-1.5 px-2 bg-slate-900 rounded-lg border border-slate-800 text-center font-mono">
              <span className="text-sm font-black text-white">
                {currentPrice.toLocaleString(undefined, { minimumFractionDigits: selectedPair.decimals })}
              </span>
              <span className={`text-xs ml-1.5 font-bold ${lastTickDirection === 'up' ? 'text-[#00e676]' : 'text-[#ff3b5c]'}`}>
                {lastTickDirection === 'up' ? '▲' : '▼'}
              </span>
            </div>

            {/* Bids (Buy Orders) */}
            <div className="space-y-1 font-mono text-xs">
              {orderBook.bids.map((bid, idx) => (
                <div key={idx} className="grid grid-cols-2 py-0.5 relative">
                  <span className={isChinese ? 'text-[#ff3b5c] font-semibold' : 'text-[#00e676] font-semibold'}>
                    {bid.price.toLocaleString(undefined, { minimumFractionDigits: selectedPair.decimals })}
                  </span>
                  <span className="text-right text-slate-300">{bid.amount}</span>
                  <div
                    className={`absolute top-0 right-0 bottom-0 opacity-15 pointer-events-none rounded-xs ${
                      isChinese ? 'bg-rose-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, bid.amount * 20)}%` }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* SwiftSats Live Customer Fills Feed */}
          <div className="bg-[#0b0f17] border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-2">
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#00e676]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Customer Executions</h3>
              </div>
              <span className="text-[10px] text-[#00e676] font-bold bg-[#00e676]/10 px-1.5 py-0.5 rounded-full">
                LIVE
              </span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1 text-xs">
              {recentOrders.length === 0 ? (
                <div className="text-center py-4 text-slate-500 text-xs">Awaiting real-time fills...</div>
              ) : (
                recentOrders.slice(0, 6).map((ord) => (
                  <div
                    key={ord.id}
                    className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/60 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span>{ord.coin}</span>
                        <span className="text-[10px] font-mono font-normal text-slate-400">#{ord.order_reference.slice(0, 7)}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        ₦{Number(ord.fiat_amount_ngn).toLocaleString()}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-mono font-bold text-[#00e676] block">
                        +{Number(ord.crypto_amount).toFixed(4)}
                      </span>
                      <span className="text-[9px] text-slate-500 uppercase">Settled</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
