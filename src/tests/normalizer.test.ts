import test from 'node:test';
import assert from 'node:assert/strict';
import { parseIndianDate, normalizeBuySell, normalizeDealType, normalizeRecord } from '../services/dataNormalizer';

test('parseIndianDate parses DD-MON-YYYY format accurately', () => {
  assert.equal(parseIndianDate('24-OCT-2026'), '2026-10-24');
  assert.equal(parseIndianDate('24-Oct-2026'), '2026-10-24');
  assert.equal(parseIndianDate('05-JAN-2025'), '2025-01-05');
});

test('parseIndianDate parses DD/MM/YYYY and ISO format', () => {
  assert.equal(parseIndianDate('24/10/2026'), '2026-10-24');
  assert.equal(parseIndianDate('2026-10-24'), '2026-10-24');
  assert.equal(parseIndianDate('invalid'), null);
});

test('normalizeBuySell strictly normalizes buy and sell indicators', () => {
  assert.equal(normalizeBuySell('BUY'), 'BUY');
  assert.equal(normalizeBuySell('B'), 'BUY');
  assert.equal(normalizeBuySell('Purchase'), 'BUY');
  assert.equal(normalizeBuySell('SELL'), 'SELL');
  assert.equal(normalizeBuySell('S'), 'SELL');
  assert.equal(normalizeBuySell('UNKNOWN'), null);
});

test('normalizeDealType identifies BULK and BLOCK deals', () => {
  assert.equal(normalizeDealType('Block Deal Window', 'BULK'), 'BLOCK');
  assert.equal(normalizeDealType('Bulk Deals', 'BLOCK'), 'BULK');
  assert.equal(normalizeDealType(null, 'BULK'), 'BULK');
});

test('normalizeRecord distinguishes calculated value from reported value', () => {
  const rowCalc = {
    Date: '24-OCT-2026',
    Symbol: 'RELIANCE',
    'Security Name': 'Reliance Industries Limited',
    'Client Name': 'BLACKROCK FUND',
    'Buy/Sell': 'BUY',
    'Quantity Traded': '100,000',
    'Trade Price / Wght. Avg. Price': '2,750.00'
  };
  const { deal, warnings } = normalizeRecord(rowCalc);
  assert.ok(deal);
  assert.equal(deal?.trade_date, '2026-10-24');
  assert.equal(deal?.quantity, 100000);
  assert.equal(deal?.price, 2750);
  assert.equal(deal?.deal_value_reported, null);
  assert.equal(deal?.deal_value_calculated, 275000000);
  assert.equal(deal?.is_value_calculated, true);
});

test('normalizeRecord rejects rows with missing client or negative quantity', () => {
  const missingClient = {
    Date: '24-OCT-2026',
    Symbol: 'TCS',
    'Buy/Sell': 'BUY',
    'Quantity Traded': '1000',
    'Trade Price': '4000'
  };
  const res1 = normalizeRecord(missingClient);
  assert.equal(res1.deal, null);

  const negQty = {
    Date: '24-OCT-2026',
    'Client Name': 'TEST',
    Symbol: 'TCS',
    'Buy/Sell': 'BUY',
    'Quantity Traded': '-500',
    'Trade Price': '4000'
  };
  const res2 = normalizeRecord(negQty);
  assert.equal(res2.deal, null);
});
