import React, { useState } from 'react';
import { NormalizedDeal } from '../types/deals';
import { 
  computeMarketKPIs, 
  aggregateByDate, 
  aggregateByDealType, 
  aggregateByExchange, 
  getTopCompanies, 
  getTopClients 
} from '../services/analytics';
import { 
  TrendingUp, 
  Building2, 
  Users, 
  Layers, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight, 
  ShieldCheck, 
  Info,
  DollarSign
} from 'lucide-react';
import { Rupee } from './Rupee';

interface MarketOverviewProps {
  deals: NormalizedDeal[];
  onSelectCompany: (symbol: string) => void;
  onSelectClient: (client: string) => void;
}

export const MarketOverview: React.FC<MarketOverviewProps> = ({
  deals,
  onSelectCompany,
  onSelectClient,
}) => {
  const [horizon, setHorizon] = useState<'ALL' | '7D' | '30D'>('ALL');

  // Filter deals based on selected horizon
  const filteredDeals = React.useMemo(() => {
    if (horizon === 'ALL') return deals;
    const now = new Date('2026-10-25T00:00:00Z');
    const cutoff = new Date(now);
    if (horizon === '7D') {
      cutoff.setDate(cutoff.getDate() - 10); // approximate 7 trading sessions window
    } else {
      cutoff.setDate(cutoff.getDate() - 30);
    }
    const cutoffIso = cutoff.toISOString().slice(0, 10);
    return deals.filter(d => d.trade_date >= cutoffIso);
  }, [deals, horizon]);

  const kpis = React.useMemo(() => computeMarketKPIs(filteredDeals), [filteredDeals]);
  const dailyData = React.useMemo(() => aggregateByDate(filteredDeals), [filteredDeals]);
  const dealTypeData = React.useMemo(() => aggregateByDealType(filteredDeals), [filteredDeals]);
  const exchangeData = React.useMemo(() => aggregateByExchange(filteredDeals), [filteredDeals]);
  const topCompanies = React.useMemo(() => getTopCompanies(filteredDeals, 8), [filteredDeals]);
  const topClients = React.useMemo(() => getTopClients(filteredDeals, 8), [filteredDeals]);

  const maxDailyVal = Math.max(...dailyData.map(d => d.total_value), 1);

  return (
    <div className="space-y-6">
      {/* Disclaimer Banner */}
      <div className="bg-blue-50/80 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 flex items-start space-x-2.5">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold">Research & Surveillance Disclosure:</strong> Bulk and block deal disclosures represent single-session gross traded volumes exceeding SEBI disclosure thresholds (0.5% share capital for bulk; <span className="inline-flex items-center font-semibold"><Rupee className="w-3 h-3 mr-0.5" />10 Cr</span> or 500k shares for block). These records describe historical trading activity and do not indicate beneficial ownership, net accumulated positions, or future directional intent.
        </div>
      </div>

      {/* Horizon Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Market Overview & Surveillance</h2>
          <p className="text-xs text-slate-500">Aggregate disclosures across National Stock Exchange (NSE) & BSE Ltd</p>
        </div>

        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-md text-xs font-medium">
          <button
            onClick={() => setHorizon('ALL')}
            className={`px-3 py-1.5 rounded transition cursor-pointer ${
              horizon === 'ALL' ? 'bg-white text-blue-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Disclosures ({deals.length})
          </button>
          <button
            onClick={() => setHorizon('7D')}
            className={`px-3 py-1.5 rounded transition cursor-pointer ${
              horizon === '7D' ? 'bg-white text-blue-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Last 7 Trading Days
          </button>
          <button
            onClick={() => setHorizon('30D')}
            className={`px-3 py-1.5 rounded transition cursor-pointer ${
              horizon === '30D' ? 'bg-white text-blue-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Last 30 Calendar Days
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Total Disclosed Deals</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono">
            {kpis.total_deals.toLocaleString()}
          </div>
          <div className="mt-1 flex items-center text-[11px] text-slate-500 space-x-1">
            <span className="text-emerald-600 font-semibold">{kpis.buy_deals_count} Buy</span>
            <span>•</span>
            <span className="text-rose-600 font-semibold">{kpis.sell_deals_count} Sell</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Total Disclosed Turnover</span>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-lg sm:text-2xl font-bold text-blue-700 font-mono flex items-center">
            <Rupee className="w-4 h-4 sm:w-5 sm:h-5 mr-0.5 sm:mr-1 shrink-0" />
            <span className="truncate">{(kpis.total_effective_value / 1e7).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Cr</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 truncate flex items-center">
            <Rupee className="w-2.5 h-2.5 mr-0.5" />
            <span>{(kpis.total_effective_value).toLocaleString()} INR</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Unique Equities</span>
            <Building2 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono">
            {kpis.unique_companies.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Across Large, Mid & Small Cap
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Disclosed Institutional Clients</span>
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {kpis.unique_clients.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 truncate">
            FIIs, DIIs, Mutual Funds, Promoters
          </div>
        </div>
      </div>

      {/* Secondary KPI Row: Reported vs Calculated Values */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block font-medium">Source-Reported Deal Value</span>
            <span className="text-base font-bold text-slate-800 font-mono flex items-center">
              <Rupee className="w-3.5 h-3.5 mr-0.5" />
              <span>{(kpis.total_reported_value / 1e7).toFixed(2)} Cr</span>
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">{kpis.reported_value_deals_count} transactions with direct exchange value</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block font-medium">Derived Value (Qty × Price)</span>
            <span className="text-base font-bold text-slate-800 font-mono flex items-center">
              <Rupee className="w-3.5 h-3.5 mr-0.5" />
              <span>{(kpis.total_calculated_value / 1e7).toFixed(2)} Cr</span>
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">{kpis.calculated_value_deals_count} transactions with verified price calculation</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
            <span className="font-mono text-xs font-bold text-blue-600">fx</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block font-medium">Total Traded Shares</span>
            <span className="text-base font-bold text-slate-800 font-mono">
              {((kpis.buy_volume + kpis.sell_volume) / 1e6).toFixed(2)} M Shares
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Buy: {(kpis.buy_volume / 1e6).toFixed(1)}M • Sell: {(kpis.sell_volume / 1e6).toFixed(1)}M
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
            <DollarSign className="w-4 h-4 text-indigo-600" />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Turnover Bar Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Disclosed Deal Activity by Trading Date</h3>
              <p className="text-xs text-slate-500">Daily gross turnover segregated into Buy and Sell transactions</p>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>
                <span className="text-slate-600">Buy Side</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500"></span>
                <span className="text-slate-600">Sell Side</span>
              </span>
            </div>
          </div>

          {dailyData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-xs text-slate-400">
              No transactions found in this time horizon.
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              {dailyData.map((d) => {
                const buyPct = (d.buy_value / maxDailyVal) * 100;
                const sellPct = (d.sell_value / maxDailyVal) * 100;
                return (
                  <div key={d.date} className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="font-semibold text-slate-700">{d.date}</span>
                      <span className="text-slate-500 flex items-center">
                        <Rupee className="w-2.5 h-2.5 mr-0.5" />
                        <span>{(d.total_value / 1e7).toFixed(2)} Cr ({d.count} deals)</span>
                      </span>
                    </div>
                    <div className="h-5 w-full bg-slate-100 rounded flex overflow-hidden">
                      <div 
                        style={{ width: `${Math.min(buyPct, 100)}%` }} 
                        className="bg-emerald-500 h-full transition-all duration-300"
                        title={`Buy: ₹${(d.buy_value / 1e7).toFixed(2)} Cr`}
                      />
                      <div 
                        style={{ width: `${Math.min(sellPct, 100)}%` }} 
                        className="bg-rose-500 h-full transition-all duration-300"
                        title={`Sell: ₹${(d.sell_value / 1e7).toFixed(2)} Cr`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Category & Exchange Breakdown Mix */}
        <div className="space-y-6">
          {/* Exchange Mix */}
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Exchange Share</h3>
            <p className="text-xs text-slate-500 mb-3">Turnover distribution between NSE and BSE</p>
            <div className="space-y-3">
              {exchangeData.map((ex) => {
                const total = kpis.total_effective_value || 1;
                const pct = Math.round((ex.total_value / total) * 100);
                const isNse = ex.exchange === 'NSE';
                return (
                  <div key={ex.exchange} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-slate-800">{ex.exchange}</span>
                      <span className="font-mono text-slate-600 flex items-center">
                        <Rupee className="w-2.5 h-2.5 mr-0.5" />
                        <span>{(ex.total_value / 1e7).toFixed(2)} Cr ({pct}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${isNse ? 'bg-blue-600' : 'bg-amber-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Deal Type Mix */}
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Bulk vs Block Deal Window</h3>
            <p className="text-xs text-slate-500 mb-3">Regulatory deal category volume</p>
            <div className="space-y-3">
              {dealTypeData.map((dt) => {
                const total = kpis.total_effective_value || 1;
                const pct = Math.round((dt.total_value / total) * 100);
                const isBlock = dt.deal_type === 'BLOCK';
                return (
                  <div key={dt.deal_type} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-slate-800">{dt.deal_type} DEALS</span>
                      <span className="font-mono text-slate-600 flex items-center">
                        <Rupee className="w-2.5 h-2.5 mr-0.5" />
                        <span>{(dt.total_value / 1e7).toFixed(2)} Cr ({pct}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${isBlock ? 'bg-indigo-600' : 'bg-sky-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Top Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Companies Table */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Top Equities by Disclosed Deal Value</h3>
              <p className="text-xs text-slate-500">Click any symbol to view chronological depth</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-mono">
                <tr>
                  <th className="px-4 py-2.5">Security</th>
                  <th className="px-3 py-2.5 text-right">Trades</th>
                  <th className="px-3 py-2.5 text-right">Total (₹ Cr)</th>
                  <th className="px-3 py-2.5 text-right">Buy / Sell (Cr)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topCompanies.map((c) => (
                  <tr 
                    key={c.symbol}
                    onClick={() => onSelectCompany(c.symbol)}
                    className="hover:bg-blue-50/50 cursor-pointer transition"
                  >
                    <td className="px-4 py-2.5">
                      <div className="font-bold text-blue-700">{c.symbol}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[180px]">{c.company_name}</div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-700">
                      {c.deal_count}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">
                      <span className="inline-flex items-center justify-end">
                        <Rupee className="w-2.5 h-2.5 mr-0.5" />
                        <span>{(c.total_value / 1e7).toFixed(2)}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-[11px]">
                      <span className="text-emerald-600 inline-flex items-center">
                        <Rupee className="w-2 h-2 mr-0.5" />{(c.buy_value / 1e7).toFixed(1)}
                      </span>
                      <span className="text-slate-400 mx-1">/</span>
                      <span className="text-rose-600 inline-flex items-center">
                        <Rupee className="w-2 h-2 mr-0.5" />{(c.sell_value / 1e7).toFixed(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Clients Table */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Most Active Disclosed Clients</h3>
              <p className="text-xs text-slate-500">Click any client to inspect portfolio activity</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-mono">
                <tr>
                  <th className="px-4 py-2.5">Client / Investor</th>
                  <th className="px-3 py-2.5 text-right">Deals</th>
                  <th className="px-3 py-2.5 text-right">Stocks</th>
                  <th className="px-3 py-2.5 text-right">Total (Cr)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topClients.map((cl) => (
                  <tr 
                    key={cl.client_name}
                    onClick={() => onSelectClient(cl.client_name)}
                    className="hover:bg-blue-50/50 cursor-pointer transition"
                  >
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-slate-900 truncate max-w-[220px]" title={cl.client_name}>
                        {cl.client_name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {cl.buy_count} Buys • {cl.sell_count} Sells
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-700">
                      {cl.deal_count}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-700">
                      {cl.unique_companies_count}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">
                      <span className="inline-flex items-center justify-end">
                        <Rupee className="w-2.5 h-2.5 mr-0.5" />
                        <span>{(cl.total_value / 1e7).toFixed(2)}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
