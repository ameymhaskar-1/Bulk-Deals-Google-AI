import React, { useState, useMemo } from 'react';
import { NormalizedDeal } from '../types/deals';
import { 
  Search, 
  Filter, 
  RotateCcw, 
  Download, 
  ExternalLink, 
  ChevronLeft, 
  ChevronRight,
  ShieldCheck,
  Calculator,
  ArrowUpDown
} from 'lucide-react';
import { Rupee } from './Rupee';

interface DealsExplorerProps {
  deals: NormalizedDeal[];
  onSelectCompany: (symbol: string) => void;
  onSelectClient: (client: string) => void;
}

export const DealsExplorer: React.FC<DealsExplorerProps> = ({
  deals,
  onSelectCompany,
  onSelectClient,
}) => {
  // Filter States
  const [exchangeFilter, setExchangeFilter] = useState<string>('ALL');
  const [dealTypeFilter, setDealTypeFilter] = useState<string>('ALL');
  const [sideFilter, setSideFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [clientQuery, setClientQuery] = useState<string>('');
  const [minQty, setMinQty] = useState<number>(0);
  const [minValCr, setMinValCr] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const pageSize = 15;

  // Sorting
  const [sortField, setSortField] = useState<keyof NormalizedDeal>('trade_date');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Selected deal for raw JSON inspect modal
  const [inspectDeal, setInspectDeal] = useState<NormalizedDeal | null>(null);

  const resetFilters = () => {
    setExchangeFilter('ALL');
    setDealTypeFilter('ALL');
    setSideFilter('ALL');
    setSearchQuery('');
    setClientQuery('');
    setMinQty(0);
    setMinValCr(0);
    setPage(1);
  };

  const filteredDeals = useMemo(() => {
    return deals.filter((d) => {
      if (exchangeFilter !== 'ALL' && d.exchange !== exchangeFilter) return false;
      if (dealTypeFilter !== 'ALL' && d.deal_type !== dealTypeFilter) return false;
      if (sideFilter !== 'ALL' && d.buy_sell !== sideFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toUpperCase();
        const sym = (d.symbol || '').toUpperCase();
        const name = (d.company_name || '').toUpperCase();
        if (!sym.includes(q) && !name.includes(q)) return false;
      }

      if (clientQuery.trim()) {
        const cq = clientQuery.trim().toUpperCase();
        const cli = (d.client_name || '').toUpperCase();
        if (!cli.includes(cq)) return false;
      }

      if (minQty > 0 && d.quantity < minQty) return false;
      if (minValCr > 0 && d.deal_value_effective < minValCr * 10000000) return false;

      return true;
    });
  }, [deals, exchangeFilter, dealTypeFilter, sideFilter, searchQuery, clientQuery, minQty, minValCr]);

  const sortedDeals = useMemo(() => {
    const list = [...filteredDeals];
    list.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;
      if (typeof aVal === 'string') {
        return sortAsc ? (aVal as string).localeCompare(bVal as string) : (bVal as string).localeCompare(aVal as string);
      }
      return sortAsc ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    });
    return list;
  }, [filteredDeals, sortField, sortAsc]);

  const totalPages = Math.ceil(sortedDeals.length / pageSize) || 1;
  const paginatedDeals = sortedDeals.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (field: keyof NormalizedDeal) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const downloadFilteredCSV = () => {
    const headers = [
      'ID', 'Trade Date', 'Exchange', 'Deal Type', 'Symbol', 'Company Name',
      'ISIN', 'Client Name', 'Buy / Sell', 'Quantity', 'Price', 'Effective Value (INR)',
      'Reported Value', 'Calculated Value', 'Is Value Calculated', 'Data Source', 'Source URL'
    ];
    const rows = sortedDeals.map(d => [
      d.id, d.trade_date, d.exchange, d.deal_type, d.symbol, `"${d.company_name}"`,
      d.isin || '', `"${d.client_name}"`, d.buy_sell, d.quantity, d.price,
      d.deal_value_effective, d.deal_value_reported || '', d.deal_value_calculated,
      d.is_value_calculated ? 'YES' : 'NO', d.data_source_type, d.source_url
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dealscope_filtered_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Header */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Filter className="w-4 h-4 text-blue-600" />
              <span>Deals Explorer & Disclosures Database</span>
            </h2>
            <p className="text-xs text-slate-500">
              Filtered dataset: <strong className="text-slate-800">{sortedDeals.length}</strong> matching transactions
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={resetFilters}
              className="flex items-center space-x-1 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
            <button
              onClick={downloadFilteredCSV}
              className="flex items-center space-x-1 text-xs text-white bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded transition shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5 text-xs">
          <div>
            <label className="block text-slate-500 font-medium mb-1">Exchange</label>
            <select
              value={exchangeFilter}
              onChange={(e) => { setExchangeFilter(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-slate-800 focus:outline-blue-500"
            >
              <option value="ALL">All Exchanges</option>
              <option value="NSE">NSE Only</option>
              <option value="BSE">BSE Only</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-500 font-medium mb-1">Deal Category</label>
            <select
              value={dealTypeFilter}
              onChange={(e) => { setDealTypeFilter(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-slate-800 focus:outline-blue-500"
            >
              <option value="ALL">All Categories</option>
              <option value="BULK">Bulk Deals</option>
              <option value="BLOCK">Block Deals</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-500 font-medium mb-1">Side</label>
            <select
              value={sideFilter}
              onChange={(e) => { setSideFilter(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-slate-800 focus:outline-blue-500"
            >
              <option value="ALL">Buy & Sell</option>
              <option value="BUY">Buy Side</option>
              <option value="SELL">Sell Side</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-slate-500 font-medium mb-1">Search Scrip / Company</label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. HDFCBANK or Reliance"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="w-full bg-slate-50 border border-slate-200 rounded pl-7 pr-2 py-1.5 text-slate-800 focus:outline-blue-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
            </div>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-slate-500 font-medium mb-1">Client / Investor Name</label>
            <input
              type="text"
              placeholder="e.g. Vanguard or LIC"
              value={clientQuery}
              onChange={(e) => { setClientQuery(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-slate-800 focus:outline-blue-500"
            />
          </div>
        </div>

        {/* Numeric Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs pt-1">
          <div>
            <label className="block text-slate-500 font-medium mb-1">Min Shares Quantity</label>
            <input
              type="number"
              value={minQty || ''}
              placeholder="e.g. 500000"
              onChange={(e) => { setMinQty(Number(e.target.value) || 0); setPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-slate-800 focus:outline-blue-500"
            />
          </div>
          <div>
            <label className="block text-slate-500 font-medium mb-1">Min Trade Value (Crores)</label>
            <input
              type="number"
              value={minValCr || ''}
              placeholder="e.g. 10.0"
              step="5"
              onChange={(e) => { setMinValCr(Number(e.target.value) || 0); setPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-slate-800 focus:outline-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Main Deals Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-mono font-semibold">
              <tr>
                <th 
                  onClick={() => handleSort('trade_date')} 
                  className="px-3.5 py-3 cursor-pointer hover:text-blue-600"
                >
                  <div className="flex items-center space-x-1">
                    <span>Date</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="px-2 py-3">Exch</th>
                <th className="px-2 py-3">Type</th>
                <th 
                  onClick={() => handleSort('symbol')} 
                  className="px-3 py-3 cursor-pointer hover:text-blue-600"
                >
                  <div className="flex items-center space-x-1">
                    <span>Symbol</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="px-4 py-3">Client / Investor</th>
                <th className="px-2 py-3">Side</th>
                <th 
                  onClick={() => handleSort('quantity')} 
                  className="px-3 py-3 text-right cursor-pointer hover:text-blue-600"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Shares</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('price')} 
                  className="px-3 py-3 text-right cursor-pointer hover:text-blue-600"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Price</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('deal_value_effective')} 
                  className="px-3 py-3 text-right cursor-pointer hover:text-blue-600"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Value (Cr)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="px-2 py-3 text-center">Value Provenance</th>
                <th className="px-2 py-3 text-center">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {paginatedDeals.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-slate-400">
                    No transactions match the selected filter parameters.
                  </td>
                </tr>
              ) : (
                paginatedDeals.map((d) => {
                  const isBuy = d.buy_sell === 'BUY';
                  return (
                    <tr key={d.id} className="hover:bg-blue-50/40 transition">
                      <td className="px-3.5 py-2.5 font-mono text-slate-600 whitespace-nowrap">
                        {d.trade_date}
                      </td>
                      <td className="px-2 py-2.5 font-mono text-[11px]">
                        <span className={`px-1.5 py-0.5 rounded font-bold ${
                          d.exchange === 'NSE' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {d.exchange}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 font-mono text-[11px]">
                        <span className={`px-1.5 py-0.5 rounded font-medium ${
                          d.deal_type === 'BLOCK' ? 'bg-indigo-100 text-indigo-800 font-semibold' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {d.deal_type}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <button
                          onClick={() => onSelectCompany(d.symbol)}
                          className="font-bold text-blue-700 hover:underline text-left cursor-pointer"
                        >
                          {d.symbol}
                        </button>
                        <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{d.company_name}</div>
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => onSelectClient(d.client_name)}
                          className="font-medium text-slate-800 hover:text-blue-700 hover:underline text-left truncate max-w-[220px] block cursor-pointer"
                          title={d.client_name}
                        >
                          {d.client_name}
                        </button>
                      </td>
                      <td className="px-2 py-2.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          isBuy ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}>
                          {d.buy_sell}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-800">
                        {d.quantity.toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-800">
                        <span className="inline-flex items-center justify-end">
                          <Rupee className="w-2.5 h-2.5 mr-0.5" />
                          <span>{d.price.toFixed(2)}</span>
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">
                        <span className="inline-flex items-center justify-end">
                          <Rupee className="w-2.5 h-2.5 mr-0.5" />
                          <span>{(d.deal_value_effective / 1e7).toFixed(2)}</span>
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        {d.is_value_calculated ? (
                          <span 
                            className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-mono"
                            title="Calculated as Quantity * Price (Disclosed value missing in source)"
                          >
                            <Calculator className="w-2.5 h-2.5 text-slate-500 mr-0.5" />
                            CALCULATED
                          </span>
                        ) : (
                          <span 
                            className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 font-mono font-medium"
                            title="Directly disclosed by official exchange feed"
                          >
                            <ShieldCheck className="w-2.5 h-2.5 text-emerald-600 mr-0.5" />
                            REPORTED
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <button
                          onClick={() => setInspectDeal(d)}
                          className="text-slate-400 hover:text-blue-600 cursor-pointer p-1 rounded"
                          title="View raw source payload & fingerprint"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div>
            Showing <strong className="font-semibold text-slate-900">{paginatedDeals.length}</strong> of{' '}
            <strong className="font-semibold text-slate-900">{sortedDeals.length}</strong> records (Page {page} of {totalPages})
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setPage(Math.max(page - 1, 1))}
              disabled={page <= 1}
              className="p-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-mono">{page} / {totalPages}</span>
            <button
              onClick={() => setPage(Math.min(page + 1, totalPages))}
              disabled={page >= totalPages}
              className="p-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Audit / Raw Payload Modal */}
      {inspectDeal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 max-w-2xl w-full shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 font-mono">
                Disclosure Record Audit • {inspectDeal.symbol}
              </h3>
              <button
                onClick={() => setInspectDeal(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-base cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs font-mono max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded border border-slate-200">
                <div><span className="text-slate-500">Record Fingerprint:</span> {inspectDeal.id}</div>
                <div><span className="text-slate-500">ISIN:</span> {inspectDeal.isin || 'NOT DISCLOSED'}</div>
                <div><span className="text-slate-500">Source Type:</span> {inspectDeal.data_source_type}</div>
                <div><span className="text-slate-500">Ingested At:</span> {inspectDeal.retrieval_timestamp}</div>
                <div><span className="text-slate-500">Validation:</span> {inspectDeal.validation_flags}</div>
                <div><span className="text-slate-500">Provenance:</span> {inspectDeal.source_url}</div>
              </div>

              <div>
                <span className="block text-slate-600 font-bold mb-1 font-sans">Original Source Raw Record:</span>
                <pre className="p-3 bg-slate-900 text-emerald-400 rounded overflow-x-auto text-[11px]">
                  {JSON.stringify(JSON.parse(inspectDeal.raw_record || '{}'), null, 2)}
                </pre>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 text-right">
              <button
                onClick={() => setInspectDeal(null)}
                className="px-4 py-1.5 bg-slate-800 text-white rounded text-xs font-sans hover:bg-slate-700 cursor-pointer"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
