export type Exchange = 'NSE' | 'BSE';
export type DealType = 'BULK' | 'BLOCK';
export type BuySell = 'BUY' | 'SELL';
export type DataSourceType = 'LIVE_API' | 'OFFICIAL_CSV_UPLOAD' | 'OFFICIAL_XLSX_UPLOAD' | 'HISTORICAL_ARCHIVE';

export interface NormalizedDeal {
  id: string;
  trade_date: string; // YYYY-MM-DD
  exchange: Exchange;
  deal_type: DealType;
  symbol: string;
  company_name: string;
  isin?: string;
  client_name: string;
  buy_sell: BuySell;
  quantity: number;
  price: number;
  deal_value_reported: number | null;
  deal_value_calculated: number;
  deal_value_effective: number;
  is_value_calculated: boolean;
  currency: string;
  source_url: string;
  retrieval_timestamp: string;
  data_source_type: DataSourceType;
  raw_record: string;
  validation_flags: string;
}

export interface MarketKPIs {
  total_deals: number;
  unique_companies: number;
  unique_clients: number;
  total_effective_value: number;
  total_reported_value: number;
  total_calculated_value: number;
  buy_deals_count: number;
  sell_deals_count: number;
  buy_volume: number;
  sell_volume: number;
  buy_value: number;
  sell_value: number;
  calculated_value_deals_count: number;
  reported_value_deals_count: number;
}

export interface DailyAggregate {
  date: string;
  count: number;
  total_value: number;
  buy_value: number;
  sell_value: number;
  volume: number;
}

export interface TopCompany {
  symbol: string;
  company_name: string;
  deal_count: number;
  total_value: number;
  buy_value: number;
  sell_value: number;
  volume: number;
}

export interface TopClient {
  client_name: string;
  deal_count: number;
  buy_count: number;
  sell_count: number;
  unique_companies_count: number;
  total_value: number;
  buy_value: number;
  sell_value: number;
  volume: number;
}

export interface PricePoint {
  date: string;
  close: number;
  volume: number;
}

export interface PriceReaction {
  deal_date: string;
  matched_session_date: string;
  t0_close: number;
  t1_close: number | null;
  t5_close: number | null;
  t20_close: number | null;
  t1_return_pct: number | null;
  t5_return_pct: number | null;
  t20_return_pct: number | null;
  premium_to_close_pct: number | null;
  symbol: string;
  deal_price: number;
  buy_sell: BuySell;
}

export interface RetrievalLog {
  id: string;
  timestamp: string;
  source_name: string;
  status: 'SUCCESS' | 'ERROR' | 'PARTIAL';
  records_count: number;
  message: string;
}
