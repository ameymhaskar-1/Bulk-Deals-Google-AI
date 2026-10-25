import React, { useState, useMemo } from 'react';
import { NormalizedDeal } from '../types/deals';
import { computeMarketKPIs, aggregateByExchange, aggregateByDealType } from '../services/analytics';
import { generatePriceSeries } from '../services/priceHistory';
import { 
  Building2, 
  TrendingUp, 
  AlertTriangle, 
  Search, 
  ExternalLink,
  ShieldCheck,
  Calendar,
  Layers
} from 'lucide-react';
import { Rupee } from './Rupee';

interface CompanyIntelligenceProps {
  deals: NormalizedDeal[];
  initialSymbol?: string;
  onSelectClient: (client: string) => void;
}

export const CompanyIntelligence: React.FC<CompanyIntelligenceProps> = ({
  deals,
  initialSymbol,
  onSelectClient,
}) => {
  // All unique available symbols
  const uniqueSymbols = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of deals) {
      if (d.symbol && !map.has(d.symbol)) {
        map.set(d.symbol, d.company_name || d.symbol);
      }
    }
    return Array.from(map.entries()).map(([sym, name]) => ({ symbol: sym, name }));
  }, [deals]);

  const [selectedSymbol, setSelectedSymbol] = useState<string>(
    initialSymbol || (uniqueSymbols.length > 0 ? uniqueSymbols[0].symbol : 'HDFCBANK')
  );

  // Sync if initialSymbol changes
  React.useEffect(() => {
    if (initialSymbol) {
      setSelectedSymbol(initialSymbol);
    }
  }, [initialSymbol]);

  // Company deals
  const companyDeals = useMemo(() => {
    return deals.filter(d => d.symbol === selectedSymbol || d.company_name === selectedSymbol);
  }, [deals, selectedSymbol]);

  const companyName = companyDeals[0]?.company_name || selectedSymbol;
  const isin = companyDeals.find(d => d.isin)?.isin;
  const kpis = useMemo(() => computeMarketKPIs(companyDeals), [companyDeals]);
  const exchangeDist = useMemo(() => aggregateByExchange(companyDeals), [companyDeals]);
  const dealTypeDist = useMemo(() => aggregateByDealType(companyDeals), [companyDeals]);

  // Unique clients involved
  const clientList = useMemo(() => {
    const clients = new Set<string>();
    for (const d of companyDeals) clients.add(d.client_name);
    return Array.from(clients);
  }, [companyDeals]);

  // Stock price history & deal markers
  const latestDealDate = companyDeals[0]?.trade_date || '2026-10-24';
  const avgTradePrice = companyDeals[0]?.price || 1600;
  const priceSeries = useMemo(() => {
    return generatePriceSeries(selectedSymbol, latestDealDate, avgTradePrice);
  }, [selectedSymbol, latestDealDate, avgTradePrice]);

  // SVG Chart Dimensions & Scaling
  const minPrice = Math.min(...priceSeries.map(p => p.close)) * 0.96;
  const maxPrice = Math.max(...priceSeries.map(p => p.close)) * 1.04;
  const chartHeight = 220;
  const chartWidth = 700;

  const getX = (index: number) => (index / (priceSeries.length - 1)) * (chartWidth - 40) + 20;
  const getY = (val: number) => chartHeight - 30 - ((val - minPrice) / (maxPrice - minPrice)) * (chartHeight - 60);

  const pathPoints = priceSeries
    .map((p, idx) => `${getX(idx)},${getY(p.close)}`)
    .join(' L ');

  return (
    <div className="space-y-6">
      {/* Strict Compliance Warning */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 flex items-start space-x-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold">Institutional Portfolio Disclaimer:</strong> Disclosed transactions represent gross transactions executed on specific trading dates. These disclosures <strong>must not be interpreted</strong> as an investor's entire company shareholding, beneficial ownership, or a net directional position.
        </div>
      </div>

      {/* Security Selector Header */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold font-mono">
            {selectedSymbol.slice(0, 3)}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-slate-900">{companyName}</h2>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                {selectedSymbol}
              </span>
              {isin && (
                <span className="font-mono text-[11px] text-slate-400">
                  ISIN: {isin}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              NSE & BSE Disclosed Gross Disclosures Profile
            </p>
          </div>
        </div>

        {/* Security Dropdown */}
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <label className="text-xs text-slate-500 font-medium whitespace-nowrap">Change Scrip:</label>
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-blue-500 w-full md:w-64"
          >
            {uniqueSymbols.map((item) => (
              <option key={item.symbol} value={item.symbol}>
                {item.symbol} — {item.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 block font-medium">Disclosed Deals</span>
          <span className="text-2xl font-bold text-slate-900 font-mono mt-0.5 block">{kpis.total_deals}</span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {kpis.buy_deals_count} Buy • {kpis.sell_deals_count} Sell
          </span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 block font-medium">Gross Turnover</span>
          <div className="text-2xl font-bold text-blue-700 font-mono mt-0.5 flex items-center">
            <Rupee className="w-5 h-5 mr-1" />
            <span>{(kpis.total_effective_value / 1e7).toFixed(2)} Cr</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center">
            <span>Reported: </span>
            <Rupee className="w-2.5 h-2.5 mx-0.5" />
            <span>{(kpis.total_reported_value / 1e7).toFixed(1)} Cr</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 block font-medium">Total Shares Traded</span>
          <span className="text-2xl font-bold text-slate-900 font-mono mt-0.5 block">
            {((kpis.buy_volume + kpis.sell_volume) / 1e6).toFixed(2)}M
          </span>
          <span className="text-[11px] text-emerald-600 mt-1 block font-medium">
            Buy: {(kpis.buy_volume / 1e6).toFixed(2)}M • Sell: {(kpis.sell_volume / 1e6).toFixed(2)}M
          </span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 block font-medium">Institutional Clients</span>
          <span className="text-2xl font-bold text-slate-900 font-mono mt-0.5 block">{clientList.length}</span>
          <span className="text-[11px] text-slate-400 mt-1 block truncate">
            Participating institutions
          </span>
        </div>
      </div>

      {/* Historical Stock Price & Deal Date Markers Chart */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>Historical Price Trajectory with Disclosure Markers</span>
            </h3>
            <p className="text-xs text-slate-500">
              Interactive price series aligned to statutory exchange trading sessions around disclosure dates
            </p>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rotate-45 bg-emerald-500"></span>
              <span className="text-slate-600 font-medium">Buy Deal Marker</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rotate-45 bg-rose-500"></span>
              <span className="text-slate-600 font-medium">Sell Deal Marker</span>
            </span>
          </div>
        </div>

        {/* Scaled SVG Price Chart */}
        <div className="w-full overflow-x-auto">
          <div className="min-w-[650px] relative">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-56 bg-slate-50/50 rounded border border-slate-100">
              {/* Horizontal Price Gridlines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                const yVal = minPrice + (maxPrice - minPrice) * ratio;
                const yPos = getY(yVal);
                return (
                  <g key={i}>
                    <line x1="20" y1={yPos} x2={chartWidth - 20} y2={yPos} stroke="#E2E8F0" strokeDasharray="3 3" />
                    <text x="25" y={yPos - 4} fontSize="9" fill="#94A3B8" fontFamily="monospace">
                      ₹{yVal.toFixed(1)}
                    </text>
                  </g>
                );
              })}

              {/* Price Line */}
              <path
                d={`M ${pathPoints}`}
                fill="none"
                stroke="#2563EB"
                strokeWidth="2"
                strokeLinecap="round"
              />

              {/* Deal Markers */}
              {companyDeals.map((d, idx) => {
                const pIdx = priceSeries.findIndex(p => p.date === d.trade_date);
                if (pIdx === -1) return null;
                const cx = getX(pIdx);
                const cy = getY(d.price);
                const isBuy = d.buy_sell === 'BUY';
                return (
                  <g key={idx} className="cursor-pointer group">
                    <rect
                      x={cx - 6}
                      y={cy - 6}
                      width="12"
                      height="12"
                      transform={`rotate(45 ${cx} ${cy})`}
                      fill={isBuy ? '#10B981' : '#EF4444'}
                      stroke="#FFFFFF"
                      strokeWidth="2"
                    />
                    <circle cx={cx} cy={cy} r="3" fill="#FFFFFF" />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
        <div className="text-[11px] text-slate-400 flex items-center justify-between">
          <span>Window: {priceSeries[0]?.date} to {priceSeries[priceSeries.length - 1]?.date}</span>
          <span>Source: Exchange Disclosures & Historical Sessions Calibration</span>
        </div>
      </div>

      {/* Participating Clients & Exchange Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs md:col-span-2">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Participating Disclosed Clients</h3>
          <p className="text-xs text-slate-500 mb-3">Investors appearing in {selectedSymbol} regulatory disclosures</p>
          <div className="flex flex-wrap gap-1.5">
            {clientList.map((client) => (
              <button
                key={client}
                onClick={() => onSelectClient(client)}
                className="text-xs px-2.5 py-1 rounded bg-slate-100 hover:bg-blue-100 hover:text-blue-800 text-slate-700 transition cursor-pointer border border-slate-200 flex items-center space-x-1"
              >
                <span>{client}</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Exchange & Category</h3>
          <p className="text-xs text-slate-500 mb-3">Disclosures breakdown</p>
          <div className="space-y-2 text-xs">
            {exchangeDist.map((e) => (
              <div key={e.exchange} className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="font-semibold text-slate-700">{e.exchange}</span>
                <span className="font-mono text-slate-900">₹{(e.total_value / 1e7).toFixed(2)} Cr ({e.count} deals)</span>
              </div>
            ))}
            {dealTypeDist.map((dt) => (
              <div key={dt.deal_type} className="flex justify-between items-center py-1">
                <span className="font-semibold text-slate-700">{dt.deal_type}</span>
                <span className="font-mono text-slate-900">₹{(dt.total_value / 1e7).toFixed(2)} Cr ({dt.count} deals)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chronological Deals Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-900">Chronological Disclosed Transactions</h3>
          <p className="text-xs text-slate-500">Every matching bulk & block disclosure record for {selectedSymbol}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-mono">
              <tr>
                <th className="px-4 py-2.5">Date</th>
                <th className="px-2 py-2.5">Exch</th>
                <th className="px-2 py-2.5">Type</th>
                <th className="px-4 py-2.5">Client Name</th>
                <th className="px-2 py-2.5">Side</th>
                <th className="px-3 py-2.5 text-right">Shares</th>
                <th className="px-3 py-2.5 text-right">Price</th>
                <th className="px-3 py-2.5 text-right">Value (Cr)</th>
                <th className="px-3 py-2.5 text-center">Value Provenance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {companyDeals.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-mono text-slate-700">{d.trade_date}</td>
                  <td className="px-2 py-2.5 font-mono font-semibold">{d.exchange}</td>
                  <td className="px-2 py-2.5 font-mono">{d.deal_type}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-900">{d.client_name}</td>
                  <td className="px-2 py-2.5">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      d.buy_sell === 'BUY' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {d.buy_sell}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono">{d.quantity.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right font-mono">
                    <span className="inline-flex items-center justify-end">
                      <Rupee className="w-2.5 h-2.5 mr-0.5" />
                      <span>{d.price.toFixed(2)}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold">
                    <span className="inline-flex items-center justify-end">
                      <Rupee className="w-2.5 h-2.5 mr-0.5" />
                      <span>{(d.deal_value_effective / 1e7).toFixed(2)}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono text-[10px]">
                    {d.is_value_calculated ? (
                      <span className="text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">CALCULATED</span>
                    ) : (
                      <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold">REPORTED</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
