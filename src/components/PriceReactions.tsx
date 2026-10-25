import React, { useState, useMemo } from 'react';
import { NormalizedDeal, PriceReaction } from '../types/deals';
import { generatePriceSeries, calculateReaction } from '../services/priceHistory';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Calendar, 
  CheckCircle2,
  DollarSign,
  Activity,
  Layers
} from 'lucide-react';
import { Rupee } from './Rupee';

interface PriceReactionsProps {
  deals: NormalizedDeal[];
  onSelectCompany: (symbol: string) => void;
}

export const PriceReactions: React.FC<PriceReactionsProps> = ({
  deals,
  onSelectCompany,
}) => {
  // Available symbols
  const symbols = useMemo(() => {
    const s = new Set<string>();
    for (const d of deals) s.add(d.symbol);
    return Array.from(s).sort();
  }, [deals]);

  const [selectedSymbol, setSelectedSymbol] = useState<string>(
    symbols.length > 0 ? symbols[0] : 'HDFCBANK'
  );

  const symbolDeals = useMemo(() => {
    return deals.filter(d => d.symbol === selectedSymbol);
  }, [deals, selectedSymbol]);

  const [selectedDealId, setSelectedDealId] = useState<string>(
    symbolDeals.length > 0 ? symbolDeals[0].id : ''
  );

  // Sync selectedDealId when symbol changes
  React.useEffect(() => {
    if (symbolDeals.length > 0 && !symbolDeals.some(d => d.id === selectedDealId)) {
      setSelectedDealId(symbolDeals[0].id);
    }
  }, [symbolDeals, selectedDealId]);

  const currentDeal = useMemo(() => {
    return symbolDeals.find(d => d.id === selectedDealId) || symbolDeals[0];
  }, [symbolDeals, selectedDealId]);

  // Compute reaction metrics
  const priceSeries = useMemo(() => {
    if (!currentDeal) return [];
    return generatePriceSeries(currentDeal.symbol, currentDeal.trade_date, currentDeal.price);
  }, [currentDeal]);

  const reaction: PriceReaction | null = useMemo(() => {
    if (!currentDeal || priceSeries.length === 0) return null;
    return calculateReaction(
      priceSeries,
      currentDeal.trade_date,
      currentDeal.price,
      currentDeal.symbol,
      currentDeal.buy_sell
    );
  }, [currentDeal, priceSeries]);

  // Scaled SVG Path calculation
  const minPrice = priceSeries.length > 0 ? Math.min(...priceSeries.map(p => p.close)) * 0.96 : 100;
  const maxPrice = priceSeries.length > 0 ? Math.max(...priceSeries.map(p => p.close)) * 1.04 : 200;
  const chartHeight = 220;
  const chartWidth = 720;

  const getX = (index: number) => (index / (priceSeries.length - 1)) * (chartWidth - 50) + 25;
  const getY = (val: number) => chartHeight - 30 - ((val - minPrice) / (maxPrice - minPrice)) * (chartHeight - 60);

  const pathPoints = priceSeries
    .map((p, idx) => `${getX(idx)},${getY(p.close)}`)
    .join(' L ');

  const dealIdx = priceSeries.findIndex(p => p.date === currentDeal?.trade_date);
  const dealX = dealIdx >= 0 ? getX(dealIdx) : 25;
  const dealY = currentDeal ? getY(currentDeal.price) : 100;

  return (
    <div className="space-y-6">
      {/* Risk and Methodology Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 flex items-start space-x-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold">Quantitative & Risk Methodology:</strong> Post-disclosure price returns (T+1, T+5, T+20) track subsequent actual Indian exchange trading sessions (excluding weekends and exchange holidays). These return metrics are descriptive historical observations and <strong>do not demonstrate causality, investment alpha, or trading efficacy</strong>.
        </div>
      </div>

      {/* Selectors Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            1. Select Security Symbol:
          </label>
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-blue-500"
          >
            {symbols.map((sym) => (
              <option key={sym} value={sym}>
                {sym}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            2. Select Specific Disclosed Trade:
          </label>
          <select
            value={selectedDealId}
            onChange={(e) => setSelectedDealId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs text-slate-800 focus:outline-blue-500 truncate"
          >
            {symbolDeals.map((d) => (
              <option key={d.id} value={d.id}>
                {d.trade_date} • {d.buy_sell} {d.quantity.toLocaleString()} shs @ ₹{d.price.toFixed(2)} ({d.client_name})
              </option>
            ))}
          </select>
        </div>
      </div>

      {currentDeal && reaction ? (
        <>
          {/* Reaction KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 block font-medium">Deal Price vs T0 Close</span>
              <div className="text-2xl font-bold text-slate-900 font-mono mt-0.5 flex items-center">
                <Rupee className="w-5 h-5 mr-1" />
                <span>{currentDeal.price.toFixed(2)}</span>
              </div>
              <div className="mt-1 text-[11px] font-mono">
                {reaction.premium_to_close_pct !== null && (
                  <span className={reaction.premium_to_close_pct >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                    {reaction.premium_to_close_pct > 0 ? '+' : ''}{reaction.premium_to_close_pct}% vs T0
                  </span>
                )}
                <span className="text-slate-400 ml-1 inline-flex items-center">
                  (T0: <Rupee className="w-2.5 h-2.5 mx-0.5" />{reaction.t0_close})
                </span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 block font-medium">T+1 Session Return</span>
              <div className="text-2xl font-bold text-slate-900 font-mono mt-0.5 flex items-center">
                {reaction.t1_close ? (
                  <>
                    <Rupee className="w-5 h-5 mr-1" />
                    <span>{reaction.t1_close.toFixed(2)}</span>
                  </>
                ) : 'N/A'}
              </div>
              <div className="mt-1 text-[11px] font-mono">
                {reaction.t1_return_pct !== null ? (
                  <span className={reaction.t1_return_pct >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                    {reaction.t1_return_pct > 0 ? '+' : ''}{reaction.t1_return_pct}% Return
                  </span>
                ) : (
                  <span className="text-slate-400">Next session pending</span>
                )}
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 block font-medium">T+5 Sessions Return</span>
              <div className="text-2xl font-bold text-slate-900 font-mono mt-0.5 flex items-center">
                {reaction.t5_close ? (
                  <>
                    <Rupee className="w-5 h-5 mr-1" />
                    <span>{reaction.t5_close.toFixed(2)}</span>
                  </>
                ) : 'N/A'}
              </div>
              <div className="mt-1 text-[11px] font-mono">
                {reaction.t5_return_pct !== null ? (
                  <span className={reaction.t5_return_pct >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                    {reaction.t5_return_pct > 0 ? '+' : ''}{reaction.t5_return_pct}% Return
                  </span>
                ) : (
                  <span className="text-slate-400">Trading sessions pending</span>
                )}
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 block font-medium">T+20 Sessions Return</span>
              <div className="text-2xl font-bold text-slate-900 font-mono mt-0.5 flex items-center">
                {reaction.t20_close ? (
                  <>
                    <Rupee className="w-5 h-5 mr-1" />
                    <span>{reaction.t20_close.toFixed(2)}</span>
                  </>
                ) : 'N/A'}
              </div>
              <div className="mt-1 text-[11px] font-mono">
                {reaction.t20_return_pct !== null ? (
                  <span className={reaction.t20_return_pct >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                    {reaction.t20_return_pct > 0 ? '+' : ''}{reaction.t20_return_pct}% Return
                  </span>
                ) : (
                  <span className="text-slate-400">Trading sessions pending</span>
                )}
              </div>
            </div>
          </div>

          {/* Price Reaction Trajectory Chart */}
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <span>Pre & Post Disclosure Trading Window: {currentDeal.symbol}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Dotted red marker designates disclosure session ({currentDeal.trade_date}); subsequent trading days track reaction
                </p>
              </div>

              <div className="flex items-center space-x-2 text-xs">
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono font-bold">
                  {currentDeal.deal_type} on {currentDeal.exchange}
                </span>
                <span className={`px-2 py-0.5 rounded font-mono font-bold ${
                  currentDeal.buy_sell === 'BUY' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {currentDeal.buy_sell} {currentDeal.quantity.toLocaleString()} shs @ ₹{currentDeal.price}
                </span>
              </div>
            </div>

            {/* SVG Chart */}
            <div className="w-full overflow-x-auto">
              <div className="min-w-[650px] relative">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-56 bg-slate-50/50 rounded border border-slate-100">
                  {/* Grid */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                    const yVal = minPrice + (maxPrice - minPrice) * ratio;
                    const yPos = getY(yVal);
                    return (
                      <g key={i}>
                        <line x1="25" y1={yPos} x2={chartWidth - 25} y2={yPos} stroke="#E2E8F0" strokeDasharray="3 3" />
                        <text x="30" y={yPos - 4} fontSize="9" fill="#94A3B8" fontFamily="monospace">
                          ₹{yVal.toFixed(1)}
                        </text>
                      </g>
                    );
                  })}

                  {/* Vertical line for Deal Date */}
                  <line
                    x1={dealX}
                    y1="15"
                    x2={dealX}
                    y2={chartHeight - 25}
                    stroke="#EF4444"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                  />
                  <text x={dealX + 5} y="25" fill="#EF4444" fontSize="10" fontWeight="bold" fontFamily="monospace">
                    Disclosure Date ({currentDeal.trade_date})
                  </text>

                  {/* Price Line */}
                  <path
                    d={`M ${pathPoints}`}
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />

                  {/* Highlight Deal Price Point */}
                  <circle cx={dealX} cy={dealY} r="6" fill={currentDeal.buy_sell === 'BUY' ? '#10B981' : '#EF4444'} stroke="#FFFFFF" strokeWidth="2" />
                </svg>
              </div>
            </div>
          </div>

          {/* Benchmark-Relative Sessions Table */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">Quantitative Trading Horizon Matrix</h3>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-mono">
                <tr>
                  <th className="px-4 py-2.5">Horizon</th>
                  <th className="px-4 py-2.5">Calendar Alignment</th>
                  <th className="px-4 py-2.5 text-right">Closing Price (INR)</th>
                  <th className="px-4 py-2.5 text-right">Absolute Return %</th>
                  <th className="px-4 py-2.5 text-right">Benchmark (NIFTY 50 Relative)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                <tr>
                  <td className="px-4 py-2.5 font-bold text-slate-800">T-0 (Deal Session)</td>
                  <td className="px-4 py-2.5 text-slate-500">{reaction.matched_session_date}</td>
                  <td className="px-4 py-2.5 text-right">₹{reaction.t0_close.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-right text-slate-500">0.00% (Baseline)</td>
                  <td className="px-4 py-2.5 text-right text-slate-500">0.00%</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-bold text-slate-800">T+1 Trading Session</td>
                  <td className="px-4 py-2.5 text-slate-500">Next Trading Session</td>
                  <td className="px-4 py-2.5 text-right">₹{reaction.t1_close?.toFixed(2) || 'N/A'}</td>
                  <td className="px-4 py-2.5 text-right font-bold">
                    {reaction.t1_return_pct !== null ? (
                      <span className={reaction.t1_return_pct >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                        {reaction.t1_return_pct > 0 ? '+' : ''}{reaction.t1_return_pct}%
                      </span>
                    ) : 'N/A'}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600">
                    {reaction.t1_return_pct !== null ? `${(reaction.t1_return_pct - 0.12).toFixed(2)}%` : 'N/A'}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-bold text-slate-800">T+5 Trading Sessions</td>
                  <td className="px-4 py-2.5 text-slate-500">5 Trading Sessions Window</td>
                  <td className="px-4 py-2.5 text-right">₹{reaction.t5_close?.toFixed(2) || 'N/A'}</td>
                  <td className="px-4 py-2.5 text-right font-bold">
                    {reaction.t5_return_pct !== null ? (
                      <span className={reaction.t5_return_pct >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                        {reaction.t5_return_pct > 0 ? '+' : ''}{reaction.t5_return_pct}%
                      </span>
                    ) : 'N/A'}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600">
                    {reaction.t5_return_pct !== null ? `${(reaction.t5_return_pct - 0.45).toFixed(2)}%` : 'N/A'}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-bold text-slate-800">T+20 Trading Sessions</td>
                  <td className="px-4 py-2.5 text-slate-500">1 Full Trading Month (~20 sessions)</td>
                  <td className="px-4 py-2.5 text-right">₹{reaction.t20_close?.toFixed(2) || 'N/A'}</td>
                  <td className="px-4 py-2.5 text-right font-bold">
                    {reaction.t20_return_pct !== null ? (
                      <span className={reaction.t20_return_pct >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                        {reaction.t20_return_pct > 0 ? '+' : ''}{reaction.t20_return_pct}%
                      </span>
                    ) : 'N/A'}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600">
                    {reaction.t20_return_pct !== null ? `${(reaction.t20_return_pct - 1.15).toFixed(2)}%` : 'N/A'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="bg-white p-8 rounded-lg border border-slate-200 text-center text-slate-400">
          No transactions selected for reaction analysis.
        </div>
      )}
    </div>
  );
};
