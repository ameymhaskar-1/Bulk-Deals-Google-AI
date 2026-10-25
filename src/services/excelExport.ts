import * as XLSX from 'xlsx';
import { NormalizedDeal, PriceReaction } from '../types/deals';
import { computeMarketKPIs, getTopCompanies, getTopClients, aggregateByDate, aggregateByExchange } from './analytics';

export function generateExcelWorkbook(deals: NormalizedDeal[], reactions: PriceReaction[] = []): Uint8Array {
  const wb = XLSX.utils.book_new();

  const kpis = computeMarketKPIs(deals);
  const bulkDeals = deals.filter(d => d.deal_type === 'BULK');
  const blockDeals = deals.filter(d => d.deal_type === 'BLOCK');
  const topCompanies = getTopCompanies(deals, 50);
  const topClients = getTopClients(deals, 50);
  const daily = aggregateByDate(deals);
  const exchanges = aggregateByExchange(deals);

  // 1. Executive Dashboard
  const dashData = [
    ['DealScope India — Executive Bulk & Block Deals Intelligence Dashboard'],
    [`Generated: ${new Date().toISOString()}`, `Total Disclosed Deals: ${deals.length}`],
    [],
    ['METRIC', 'VALUE', 'UNIT / FORMAT'],
    ['Total Disclosed Deals', kpis.total_deals, 'Trades'],
    ['Unique Equities', kpis.unique_companies, 'Scrips'],
    ['Unique Disclosed Clients', kpis.unique_clients, 'Entities'],
    ['Total Disclosed Value', kpis.total_effective_value, 'INR'],
    ['Total Disclosed Value (Crores)', Number((kpis.total_effective_value / 1e7).toFixed(2)), 'INR Crore'],
    ['Reported Deal Value', kpis.total_reported_value, 'INR'],
    ['Calculated Deal Value (Qty x Px)', kpis.total_calculated_value, 'INR'],
    ['Buy-Side Trades Count', kpis.buy_deals_count, 'Trades'],
    ['Sell-Side Trades Count', kpis.sell_deals_count, 'Trades'],
    ['Buy Volume', kpis.buy_volume, 'Shares'],
    ['Sell Volume', kpis.sell_volume, 'Shares'],
    ['Buy Value', kpis.buy_value, 'INR'],
    ['Sell Value', kpis.sell_value, 'INR'],
    ['Calculated Value Trades Count', kpis.calculated_value_deals_count, 'Trades'],
    ['Reported Value Trades Count', kpis.reported_value_deals_count, 'Trades'],
  ];
  const wsDash = XLSX.utils.aoa_to_sheet(dashData);
  XLSX.utils.book_append_sheet(wb, wsDash, 'Executive Dashboard');

  // Helper for deals table
  const mapDealsToRows = (list: NormalizedDeal[]) => [
    [
      'Deal ID', 'Trade Date', 'Exchange', 'Deal Type', 'Symbol', 'Company Name',
      'ISIN', 'Client Name', 'Buy / Sell', 'Quantity', 'Price (INR)',
      'Reported Value', 'Calculated Value', 'Effective Value (INR)', 'Effective Value (Cr)',
      'Is Calculated?', 'Currency', 'Data Source', 'Source URL', 'Timestamp', 'Validation Flags'
    ],
    ...list.map(d => [
      d.id, d.trade_date, d.exchange, d.deal_type, d.symbol, d.company_name,
      d.isin || 'N/A', d.client_name, d.buy_sell, d.quantity, d.price,
      d.deal_value_reported !== null ? d.deal_value_reported : '',
      d.deal_value_calculated, d.deal_value_effective,
      Number((d.deal_value_effective / 1e7).toFixed(2)),
      d.is_value_calculated ? 'YES' : 'NO',
      d.currency, d.data_source_type, d.source_url, d.retrieval_timestamp, d.validation_flags
    ])
  ];

  // 2. Raw Deals
  const wsRaw = XLSX.utils.aoa_to_sheet(mapDealsToRows(deals));
  XLSX.utils.book_append_sheet(wb, wsRaw, 'Raw Deals');

  // 3. Bulk Deals
  const wsBulk = XLSX.utils.aoa_to_sheet(mapDealsToRows(bulkDeals));
  XLSX.utils.book_append_sheet(wb, wsBulk, 'Bulk Deals');

  // 4. Block Deals
  const wsBlock = XLSX.utils.aoa_to_sheet(mapDealsToRows(blockDeals));
  XLSX.utils.book_append_sheet(wb, wsBlock, 'Block Deals');

  // 5. Company Summary
  const compRows = [
    ['Symbol', 'Company Name', 'Deals Count', 'Total Value (INR)', 'Total Value (Cr)', 'Buy Value (INR)', 'Sell Value (INR)', 'Shares Volume'],
    ...topCompanies.map(c => [
      c.symbol, c.company_name, c.deal_count, c.total_value,
      Number((c.total_value / 1e7).toFixed(2)),
      c.buy_value, c.sell_value, c.volume
    ])
  ];
  const wsComp = XLSX.utils.aoa_to_sheet(compRows);
  XLSX.utils.book_append_sheet(wb, wsComp, 'Company Summary');

  // 6. Client Summary
  const cliRows = [
    ['Client / Investor Name', 'Deals Count', 'Buy Trades', 'Sell Trades', 'Unique Stocks', 'Total Value (INR)', 'Total Value (Cr)', 'Buy Value (INR)', 'Sell Value (INR)', 'Total Shares Volume'],
    ...topClients.map(c => [
      c.client_name, c.deal_count, c.buy_count, c.sell_count, c.unique_companies_count,
      c.total_value, Number((c.total_value / 1e7).toFixed(2)),
      c.buy_value, c.sell_value, c.volume
    ])
  ];
  const wsCli = XLSX.utils.aoa_to_sheet(cliRows);
  XLSX.utils.book_append_sheet(wb, wsCli, 'Client Summary');

  // 7. Daily Summary
  const dailyRows = [
    ['Trade Date', 'Trades Count', 'Total Turnover (INR)', 'Total Turnover (Cr)', 'Buy Value (INR)', 'Sell Value (INR)', 'Shares Volume'],
    ...daily.map(d => [
      d.date, d.count, d.total_value,
      Number((d.total_value / 1e7).toFixed(2)),
      d.buy_value, d.sell_value, d.volume
    ])
  ];
  const wsDaily = XLSX.utils.aoa_to_sheet(dailyRows);
  XLSX.utils.book_append_sheet(wb, wsDaily, 'Daily Summary');

  // 8. Exchange Summary
  const exRows = [
    ['Exchange', 'Trades Count', 'Total Turnover (INR)', 'Total Turnover (Cr)', 'Shares Volume'],
    ...exchanges.map(e => [
      e.exchange, e.count, e.total_value,
      Number((e.total_value / 1e7).toFixed(2)),
      e.volume
    ])
  ];
  const wsEx = XLSX.utils.aoa_to_sheet(exRows);
  XLSX.utils.book_append_sheet(wb, wsEx, 'Exchange Summary');

  // 9. Price Reactions
  const reactRows = [
    ['Symbol', 'Deal Date', 'Matched Session Date', 'Deal Price (INR)', 'T0 Close (INR)', 'Premium / Discount %', 'T+1 Close', 'T+1 Return %', 'T+5 Close', 'T+5 Return %', 'T+20 Close', 'T+20 Return %', 'Analytical Disclaimer'],
    ...(reactions.length > 0
      ? reactions.map(r => [
          r.symbol, r.deal_date, r.matched_session_date, r.deal_price,
          r.t0_close, r.premium_to_close_pct ?? 'N/A',
          r.t1_close ?? 'N/A', r.t1_return_pct ?? 'N/A',
          r.t5_close ?? 'N/A', r.t5_return_pct ?? 'N/A',
          r.t20_close ?? 'N/A', r.t20_return_pct ?? 'N/A',
          'Historical descriptive observation only; does not imply causal relationship or trading performance.'
        ])
      : [['(No price reactions computed for export selection)', '', '', '', '', '', '', '', '', '', '', '', 'Configure symbol on Price Reactions tab']])
  ];
  const wsReact = XLSX.utils.aoa_to_sheet(reactRows);
  XLSX.utils.book_append_sheet(wb, wsReact, 'Price Reactions');

  // 10. Data Quality
  const dataQualityRows = [
    ['DATA QUALITY AUDIT CHECK', 'OBSERVED COUNT', 'AUDIT CRITERIA & REMARKS'],
    ['Total Records Processed', deals.length, 'All verified and fingerprint-hashed deals'],
    ['Calculated Value Disclosures', kpis.calculated_value_deals_count, 'Value computed as quantity * price due to missing source field'],
    ['Reported Value Disclosures', kpis.reported_value_deals_count, 'Disclosed directly by exchange'],
    ['Records with ISIN Present', deals.filter(d => d.isin).length, 'SEBI compliant ISIN populated'],
    ['Records Missing ISIN', deals.filter(d => !d.isin).length, 'Exchange omitted ISIN identifier in original feed'],
    ['Suspicious Price Flags', deals.filter(d => d.validation_flags.includes('Suspicious')).length, 'Price <= 0 detected'],
    ['Currency Standardization', '100% INR', 'Strictly normalized to Indian Rupee'],
  ];
  const wsQuality = XLSX.utils.aoa_to_sheet(dataQualityRows);
  XLSX.utils.book_append_sheet(wb, wsQuality, 'Data Quality');

  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(out);
}

export function downloadWorkbook(deals: NormalizedDeal[], reactions: PriceReaction[] = []): void {
  const bytes = generateExcelWorkbook(deals, reactions);
  const blob = new Blob([bytes.buffer as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `DealScope_India_Intelligence_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
