import React, { useState, useMemo } from 'react';
import { NormalizedDeal } from '../types/deals';
import { computeMarketKPIs, aggregateByExchange, aggregateByDealType } from '../services/analytics';
import { 
  Users, 
  Building2, 
  ShieldAlert, 
  ExternalLink,
  Search,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { Rupee } from './Rupee';

interface ClientIntelligenceProps {
  deals: NormalizedDeal[];
  initialClient?: string;
  onSelectCompany: (symbol: string) => void;
}

export const ClientIntelligence: React.FC<ClientIntelligenceProps> = ({
  deals,
  initialClient,
  onSelectCompany,
}) => {
  // All unique clients list
  const uniqueClients = useMemo(() => {
    const clients = new Set<string>();
    for (const d of deals) {
      if (d.client_name) clients.add(d.client_name);
    }
    return Array.from(clients).sort();
  }, [deals]);

  const [selectedClient, setSelectedClient] = useState<string>(
    initialClient || (uniqueClients.length > 0 ? uniqueClients[0] : 'GOVERNMENT PENSION FUND GLOBAL')
  );

  React.useEffect(() => {
    if (initialClient) {
      setSelectedClient(initialClient);
    }
  }, [initialClient]);

  // Client deals (conservative match)
  const clientDeals = useMemo(() => {
    const q = selectedClient.trim().toUpperCase();
    return deals.filter(d => (d.client_name || '').toUpperCase().includes(q));
  }, [deals, selectedClient]);

  const kpis = useMemo(() => computeMarketKPIs(clientDeals), [clientDeals]);
  const exchangeDist = useMemo(() => aggregateByExchange(clientDeals), [clientDeals]);
  const dealTypeDist = useMemo(() => aggregateByDealType(clientDeals), [clientDeals]);

  // Traded equities breakdown
  const tradedEquities = useMemo(() => {
    const map = new Map<string, { symbol: string; name: string; count: number; value: number; buyCount: number; sellCount: number }>();
    for (const d of clientDeals) {
      let entry = map.get(d.symbol);
      if (!entry) {
        entry = { symbol: d.symbol, name: d.company_name, count: 0, value: 0, buyCount: 0, sellCount: 0 };
        map.set(d.symbol, entry);
      }
      entry.count++;
      entry.value += d.deal_value_effective;
      if (d.buy_sell === 'BUY') entry.buyCount++;
      else entry.sellCount++;
    }
    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [clientDeals]);

  return (
    <div className="space-y-6">
      {/* Compliance / Investor Analysis Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 flex items-start space-x-2.5">
        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold">Investor Surveillance Notice:</strong> Transactions shown are gross disclosures reported by exchange brokers on trade date. Similar names are kept conservative and not automatically combined. These records <strong>do not reflect overall portfolio holdings</strong>, total asset under management (AUM), or directional intent.
        </div>
      </div>

      {/* Client Selector Header */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold font-mono">
            <Users className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">{selectedClient}</h2>
            <p className="text-xs text-slate-500">
              Institutional Investor Disclosures Profile Across NSE & BSE
            </p>
          </div>
        </div>

        {/* Client Selector Dropdown */}
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <label className="text-xs text-slate-500 font-medium whitespace-nowrap">Select Investor:</label>
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-blue-500 w-full md:w-80"
          >
            {uniqueClients.map((client) => (
              <option key={client} value={client}>
                {client}
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
            {kpis.buy_deals_count} Buys • {kpis.sell_deals_count} Sells
          </span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 block font-medium">Total Traded Value</span>
          <div className="text-2xl font-bold text-blue-700 font-mono mt-0.5 flex items-center">
            <Rupee className="w-5 h-5 mr-1" />
            <span>{(kpis.total_effective_value / 1e7).toFixed(2)} Cr</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center">
            <span>Buy: </span>
            <Rupee className="w-2.5 h-2.5 mx-0.5" />
            <span>{(kpis.buy_value / 1e7).toFixed(1)} Cr • Sell: </span>
            <Rupee className="w-2.5 h-2.5 mx-0.5" />
            <span>{(kpis.sell_value / 1e7).toFixed(1)} Cr</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 block font-medium">Equities Traded</span>
          <span className="text-2xl font-bold text-slate-900 font-mono mt-0.5 block">
            {tradedEquities.length}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Distinct companies disclosed
          </span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 block font-medium">Total Shares Volume</span>
          <span className="text-2xl font-bold text-slate-900 font-mono mt-0.5 block">
            {((kpis.buy_volume + kpis.sell_volume) / 1e6).toFixed(2)}M
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Gross transacted volume
          </span>
        </div>
      </div>

      {/* Traded Equities Grid & Exchange Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs md:col-span-2">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Disclosed Equities Traded</h3>
          <p className="text-xs text-slate-500 mb-3">Companies where {selectedClient} conducted bulk or block transactions</p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-mono">
                <tr>
                  <th className="px-3 py-2">Symbol</th>
                  <th className="px-3 py-2">Company Name</th>
                  <th className="px-2 py-2 text-center">Trades</th>
                  <th className="px-3 py-2 text-right">Value (₹ Cr)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {tradedEquities.map((eq) => (
                  <tr key={eq.symbol} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono font-bold">
                      <button
                        onClick={() => onSelectCompany(eq.symbol)}
                        className="text-blue-700 hover:underline flex items-center space-x-1 cursor-pointer"
                      >
                        <span>{eq.symbol}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </button>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{eq.name}</td>
                    <td className="px-2 py-2 text-center font-mono">
                      <span className="text-emerald-700 font-bold">{eq.buyCount} B</span>
                      <span className="text-slate-400 mx-1">/</span>
                      <span className="text-rose-700 font-bold">{eq.sellCount} S</span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                      ₹{(eq.value / 1e7).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Exchange and Deal Category Distribution */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Exchange Mix</h3>
            <div className="space-y-2 text-xs pt-1">
              {exchangeDist.map((e) => (
                <div key={e.exchange} className="flex justify-between py-1 border-b border-slate-100">
                  <span className="font-semibold text-slate-700">{e.exchange}</span>
                  <span className="font-mono text-slate-900">₹{(e.total_value / 1e7).toFixed(2)} Cr</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Category Breakdown</h3>
            <div className="space-y-2 text-xs pt-1">
              {dealTypeDist.map((dt) => (
                <div key={dt.deal_type} className="flex justify-between py-1 border-b border-slate-100">
                  <span className="font-semibold text-slate-700">{dt.deal_type}</span>
                  <span className="font-mono text-slate-900">₹{(dt.total_value / 1e7).toFixed(2)} Cr</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Disclosed Transaction History */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-900">Disclosed Transaction History</h3>
          <p className="text-xs text-slate-500">Every recorded regulatory transaction executed by {selectedClient}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-mono">
              <tr>
                <th className="px-4 py-2.5">Date</th>
                <th className="px-2 py-2.5">Exch</th>
                <th className="px-2 py-2.5">Type</th>
                <th className="px-3 py-2.5">Symbol</th>
                <th className="px-4 py-2.5">Company Name</th>
                <th className="px-2 py-2.5">Side</th>
                <th className="px-3 py-2.5 text-right">Shares</th>
                <th className="px-3 py-2.5 text-right">Price</th>
                <th className="px-3 py-2.5 text-right">Value (Cr)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {clientDeals.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-mono text-slate-700">{d.trade_date}</td>
                  <td className="px-2 py-2.5 font-mono font-semibold">{d.exchange}</td>
                  <td className="px-2 py-2.5 font-mono">{d.deal_type}</td>
                  <td className="px-3 py-2.5 font-mono font-bold text-blue-700">
                    <button
                      onClick={() => onSelectCompany(d.symbol)}
                      className="hover:underline cursor-pointer"
                    >
                      {d.symbol}
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 truncate max-w-[200px]">{d.company_name}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
