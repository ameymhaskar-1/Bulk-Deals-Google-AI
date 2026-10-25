import test from 'node:test';
import assert from 'node:assert/strict';
import { computeMarketKPIs, aggregateByDate, getTopCompanies } from '../services/analytics';
import { NormalizedDeal } from '../types/deals';

const dummyDeals: NormalizedDeal[] = [
  {
    id: 'd1',
    trade_date: '2026-10-24',
    exchange: 'NSE',
    deal_type: 'BULK',
    symbol: 'HDFCBANK',
    company_name: 'HDFC Bank',
    client_name: 'VANGUARD',
    buy_sell: 'BUY',
    quantity: 100000,
    price: 1650,
    deal_value_reported: null,
    deal_value_calculated: 165000000,
    deal_value_effective: 165000000,
    is_value_calculated: true,
    currency: 'INR',
    source_url: 'test',
    retrieval_timestamp: '2026-10-24T10:00:00Z',
    data_source_type: 'OFFICIAL_CSV_UPLOAD',
    raw_record: '{}',
    validation_flags: 'VALID'
  },
  {
    id: 'd2',
    trade_date: '2026-10-24',
    exchange: 'NSE',
    deal_type: 'BULK',
    symbol: 'HDFCBANK',
    company_name: 'HDFC Bank',
    client_name: 'BLACKROCK',
    buy_sell: 'SELL',
    quantity: 100000,
    price: 1650,
    deal_value_reported: null,
    deal_value_calculated: 165000000,
    deal_value_effective: 165000000,
    is_value_calculated: true,
    currency: 'INR',
    source_url: 'test',
    retrieval_timestamp: '2026-10-24T10:00:00Z',
    data_source_type: 'OFFICIAL_CSV_UPLOAD',
    raw_record: '{}',
    validation_flags: 'VALID'
  },
  {
    id: 'd3',
    trade_date: '2026-10-23',
    exchange: 'BSE',
    deal_type: 'BLOCK',
    symbol: 'RELIANCE',
    company_name: 'Reliance Ind',
    client_name: 'LIC',
    buy_sell: 'BUY',
    quantity: 50000,
    price: 2800,
    deal_value_reported: 140000000,
    deal_value_calculated: 140000000,
    deal_value_effective: 140000000,
    is_value_calculated: false,
    currency: 'INR',
    source_url: 'test',
    retrieval_timestamp: '2026-10-23T10:00:00Z',
    data_source_type: 'LIVE_API',
    raw_record: '{}',
    validation_flags: 'VALID'
  }
];

test('computeMarketKPIs aggregates volume, effective values and side counts', () => {
  const kpis = computeMarketKPIs(dummyDeals);
  assert.equal(kpis.total_deals, 3);
  assert.equal(kpis.unique_companies, 2);
  assert.equal(kpis.unique_clients, 3);
  assert.equal(kpis.total_effective_value, 470000000);
  assert.equal(kpis.buy_deals_count, 2);
  assert.equal(kpis.sell_deals_count, 1);
  assert.equal(kpis.buy_volume, 150000);
  assert.equal(kpis.sell_volume, 100000);
  assert.equal(kpis.calculated_value_deals_count, 2);
  assert.equal(kpis.reported_value_deals_count, 1);
});

test('aggregateByDate groups and sorts dates chronologically', () => {
  const daily = aggregateByDate(dummyDeals);
  assert.equal(daily.length, 2);
  assert.equal(daily[0].date, '2026-10-23');
  assert.equal(daily[1].date, '2026-10-24');
  assert.equal(daily[1].count, 2);
});

test('getTopCompanies ranks equities by total turnover', () => {
  const top = getTopCompanies(dummyDeals, 2);
  assert.equal(top[0].symbol, 'HDFCBANK');
  assert.equal(top[0].total_value, 330000000);
});
