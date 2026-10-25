import { PricePoint, PriceReaction, BuySell } from '../types/deals';

// Official Indian Exchange Holidays (2026)
const NSE_BSE_HOLIDAYS_2026 = new Set<string>([
  '2026-01-26', // Republic Day
  '2026-02-17', // Mahashivratri
  '2026-03-03', // Holi
  '2026-03-20', // Id-Ul-Fitr
  '2026-04-03', // Good Friday
  '2026-04-14', // Dr. Ambedkar Jayanti
  '2026-05-01', // Maharashtra Day
  '2026-05-27', // Bakri Id
  '2026-08-15', // Independence Day
  '2026-09-04', // Janmashtami
  '2026-10-02', // Mahatma Gandhi Jayanti
  '2026-10-20', // Dussehra
  '2026-11-09', // Diwali Laxmi Pujan
  '2026-11-10', // Diwali Balipratipada
  '2026-11-24', // Gurunanak Jayanti
  '2026-12-25', // Christmas
]);

export function isTradingDay(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00Z');
  const dayOfWeek = d.getUTCDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) return false; // Weekend
  return !NSE_BSE_HOLIDAYS_2026.has(dateStr);
}

export function getTradingSessions(startDateStr: string, count: number, forward = true): string[] {
  const sessions: string[] = [];
  const curr = new Date(startDateStr + 'T00:00:00Z');
  const stepDays = forward ? 1 : -1;

  while (sessions.length < count) {
    curr.setUTCDate(curr.getUTCDate() + stepDays);
    const iso = curr.toISOString().slice(0, 10);
    if (isTradingDay(iso)) {
      sessions.push(iso);
    }
  }

  return sessions;
}

export function generatePriceSeries(
  symbol: string,
  dealDate: string,
  basePrice = 1600,
  preCount = 10,
  postCount = 25
): PricePoint[] {
  const backward = getTradingSessions(dealDate, preCount, false);
  backward.reverse();
  const forward = getTradingSessions(dealDate, postCount, true);
  const allDates = [...backward, dealDate, ...forward];

  let seed = 0;
  for (let i = 0; i < symbol.length; i++) seed += symbol.charCodeAt(i);
  for (let i = 0; i < dealDate.length; i++) seed += dealDate.charCodeAt(i);

  let currentPrice = basePrice;
  const points: PricePoint[] = [];

  for (let i = 0; i < allDates.length; i++) {
    const dt = allDates[i];
    const wave = Math.sin((seed + i) * 0.7) * 0.015;
    const drift = i > preCount ? 0.0006 : -0.0003;
    currentPrice = currentPrice * (1 + wave + drift);
    points.push({
      date: dt,
      close: Math.round(currentPrice * 100) / 100,
      volume: Math.floor(500000 + Math.abs(Math.cos(seed + i) * 1200000))
    });
  }

  return points;
}

export function calculateReaction(
  priceSeries: PricePoint[],
  dealDate: string,
  dealPrice: number,
  symbol: string,
  buySell: BuySell = 'BUY'
): PriceReaction {
  let t0Idx = priceSeries.findIndex(p => p.date >= dealDate);
  if (t0Idx === -1) t0Idx = priceSeries.length - 1;

  const t0 = priceSeries[t0Idx];
  const t1 = t0Idx + 1 < priceSeries.length ? priceSeries[t0Idx + 1] : null;
  const t5 = t0Idx + 5 < priceSeries.length ? priceSeries[t0Idx + 5] : null;
  const t20 = t0Idx + 20 < priceSeries.length ? priceSeries[t0Idx + 20] : null;

  const t1Ret = t1 ? Math.round(((t1.close - t0.close) / t0.close) * 10000) / 100 : null;
  const t5Ret = t5 ? Math.round(((t5.close - t0.close) / t0.close) * 10000) / 100 : null;
  const t20Ret = t20 ? Math.round(((t20.close - t0.close) / t0.close) * 10000) / 100 : null;
  const prem = Math.round(((dealPrice - t0.close) / t0.close) * 10000) / 100;

  return {
    deal_date: dealDate,
    matched_session_date: t0.date,
    t0_close: t0.close,
    t1_close: t1 ? t1.close : null,
    t5_close: t5 ? t5.close : null,
    t20_close: t20 ? t20.close : null,
    t1_return_pct: t1Ret,
    t5_return_pct: t5Ret,
    t20_return_pct: t20Ret,
    premium_to_close_pct: prem,
    symbol,
    deal_price: dealPrice,
    buy_sell: buySell,
  };
}
