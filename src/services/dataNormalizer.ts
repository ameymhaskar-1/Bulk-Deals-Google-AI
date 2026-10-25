import { NormalizedDeal, Exchange, DealType, BuySell, DataSourceType } from '../types/deals';

const MONTH_MAP: Record<string, string> = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04',
  MAY: '05', JUN: '06', JUL: '07', AUG: '08',
  SEP: '09', OCT: '10', NOV: '11', DEC: '12'
};

export function parseIndianDate(dateStr: unknown): string | null {
  if (!dateStr) return null;
  const s = String(dateStr).trim().toUpperCase();

  // 24-OCT-2026 or 24-Oct-2026
  const matchAlpha = s.match(/^(\d{1,2})[-/ ]([A-Z]{3})[-/ ](\d{2,4})$/);
  if (matchAlpha) {
    const day = matchAlpha[1].padStart(2, '0');
    const month = MONTH_MAP[matchAlpha[2]] || '01';
    let year = matchAlpha[3];
    if (year.length === 2) year = '20' + year;
    return `${year}-${month}-${day}`;
  }

  // 24/10/2026 (DD/MM/YYYY)
  const matchDmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (matchDmy) {
    const day = matchDmy[1].padStart(2, '0');
    const month = matchDmy[2].padStart(2, '0');
    let year = matchDmy[3];
    if (year.length === 2) year = '20' + year;
    return `${year}-${month}-${day}`;
  }

  // 2026-10-24 (ISO YYYY-MM-DD)
  const matchIso = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (matchIso) {
    const year = matchIso[1];
    const month = matchIso[2].padStart(2, '0');
    const day = matchIso[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return null;
}

export function normalizeBuySell(val: unknown): BuySell | null {
  if (val === null || val === undefined) return null;
  const s = String(val).trim().toUpperCase();
  if (['BUY', 'B', 'PURCHASE', '1'].includes(s)) return 'BUY';
  if (['SELL', 'S', 'SALE', '2'].includes(s)) return 'SELL';
  return null;
}

export function normalizeDealType(val: unknown, defaultType: DealType = 'BULK'): DealType {
  if (!val) return defaultType;
  const s = String(val).trim().toUpperCase();
  if (s.includes('BLOCK')) return 'BLOCK';
  if (s.includes('BULK')) return 'BULK';
  return defaultType;
}

export function generateRecordFingerprint(
  tradeDate: string,
  exchange: string,
  dealType: string,
  symbol: string,
  clientName: string,
  buySell: string,
  quantity: number,
  price: number
): string {
  const str = `${tradeDate}|${exchange}|${dealType}|${symbol.toUpperCase()}|${clientName.trim().toUpperCase()}|${buySell}|${quantity}|${price.toFixed(2)}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'deal_' + Math.abs(hash).toString(36) + '_' + Math.floor(Math.random() * 1000).toString(36);
}

export function normalizeRecord(
  row: Record<string, any>,
  exchangeHint: Exchange = 'NSE',
  dealTypeHint: DealType = 'BULK',
  sourceType: DataSourceType = 'OFFICIAL_CSV_UPLOAD',
  sourceUrl = 'file://upload'
): { deal: NormalizedDeal | null; warnings: string[] } {
  const warnings: string[] = [];

  // Date
  const dateVal = row['Date'] || row['DATE'] || row['Trade Date'] || row['Deal Date'] || row['deal_date'] || row['date'];
  const parsedDate = parseIndianDate(dateVal);
  if (!parsedDate) {
    return { deal: null, warnings: [`Invalid or missing trade date: '${dateVal}'`] };
  }

  // Exchange
  let exchange: Exchange = exchangeHint;
  const exRaw = (row['Exchange'] || row['EXCHANGE'] || exchangeHint).toString().trim().toUpperCase();
  if (exRaw === 'NSE' || exRaw === 'BSE') {
    exchange = exRaw;
  }

  // Deal Type
  const dtRaw = row['Deal Type'] || row['DEAL TYPE'] || row['deal_type'] || dealTypeHint;
  const dealType = normalizeDealType(dtRaw, dealTypeHint);

  // Symbol & Name
  let symbol = (
    row['Symbol'] || row['SYMBOL'] || row['Security Code'] ||
    row['Scrip Code'] || row['Security Symbol'] || row['symbol'] || ''
  ).toString().trim().toUpperCase();

  const companyName = (
    row['Security Name'] || row['SECURITY NAME'] || row['Scrip Name'] ||
    row['Company Name'] || row['company_name'] || symbol
  ).toString().trim();

  if (!symbol) {
    symbol = companyName.slice(0, 12).trim().toUpperCase();
    warnings.push('Symbol missing; derived from company name.');
  }

  // Client Name
  const clientName = (
    row['Client Name'] || row['CLIENT NAME'] || row['Investor Name'] || row['client_name'] || ''
  ).toString().trim();
  if (!clientName) {
    return { deal: null, warnings: ['Missing client name; record rejected.'] };
  }

  // Buy / Sell
  const bsRaw = row['Buy/Sell'] || row['BUY/SELL'] || row['Buy / Sell'] || row['Deal'] || row['Transaction Type'] || row['buy_sell'];
  const buySell = normalizeBuySell(bsRaw);
  if (!buySell) {
    return { deal: null, warnings: [`Unknown buy/sell indicator: '${bsRaw}'`] };
  }

  // Quantity
  const qtyRaw = row['Quantity Traded'] || row['Quantity'] || row['QUANTITY'] || row['Shares Traded'] || row['qty'];
  const qtyClean = String(qtyRaw).replace(/,/g, '').trim();
  const quantity = parseInt(qtyClean, 10);
  if (isNaN(quantity) || quantity <= 0) {
    return { deal: null, warnings: [`Invalid or non-positive quantity: '${qtyRaw}'`] };
  }

  // Price
  const priceRaw = row['Trade Price / Wght. Avg. Price'] || row['Trade Price'] || row['Price'] || row['PRICE'] || row['Avg Price'] || row['price'];
  const priceClean = String(priceRaw).replace(/,/g, '').trim();
  const price = parseFloat(priceClean);
  if (isNaN(price)) {
    return { deal: null, warnings: [`Non-numeric price: '${priceRaw}'`] };
  }
  if (price <= 0) {
    warnings.push(`Suspicious zero or negative price: ${price}`);
  }

  // Deal Value
  const valRaw = row['Value'] || row['VALUE'] || row['Deal Value'] || row['deal_value'];
  let dealValueReported: number | null = null;
  let isCalculated = true;
  const dealValueCalculated = Math.round(quantity * price * 100) / 100;

  if (valRaw !== undefined && valRaw !== null && String(valRaw).trim() !== '') {
    const valClean = String(valRaw).replace(/,/g, '').trim();
    const parsedVal = parseFloat(valClean);
    if (!isNaN(parsedVal) && parsedVal > 0) {
      dealValueReported = Math.round(parsedVal * 100) / 100;
      isCalculated = false;
    } else {
      warnings.push(`Could not parse reported deal value '${valRaw}'; falling back to calculated.`);
    }
  }

  const dealValueEffective = dealValueReported !== null ? dealValueReported : dealValueCalculated;

  const isin = row['ISIN'] || row['isin'] ? String(row['ISIN'] || row['isin']).trim().toUpperCase() : undefined;

  const id = generateRecordFingerprint(parsedDate, exchange, dealType, symbol, clientName, buySell, quantity, price);

  const deal: NormalizedDeal = {
    id,
    trade_date: parsedDate,
    exchange,
    deal_type: dealType,
    symbol,
    company_name: companyName,
    isin,
    client_name: clientName,
    buy_sell: buySell,
    quantity,
    price: Math.round(price * 100) / 100,
    deal_value_reported: dealValueReported,
    deal_value_calculated: dealValueCalculated,
    deal_value_effective: dealValueEffective,
    is_value_calculated: isCalculated,
    currency: 'INR',
    source_url: sourceUrl,
    retrieval_timestamp: new Date().toISOString(),
    data_source_type: sourceType,
    raw_record: JSON.stringify(row),
    validation_flags: warnings.length > 0 ? warnings.join('; ') : 'VALID'
  };

  return { deal, warnings };
}

export function parseCSVString(csvText: string): Array<Record<string, string>> {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  // Parse header
  const headers = parseCSVLine(lines[0]);
  const rows: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length === 0 || (cols.length === 1 && !cols[0])) continue;
    const row: Record<string, string> = {};
    for (let h = 0; h < headers.length; h++) {
      row[headers[h].trim()] = cols[h] !== undefined ? cols[h].trim() : '';
    }
    rows.push(row);
  }

  return rows;
}

function parseCSVLine(text: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result;
}
