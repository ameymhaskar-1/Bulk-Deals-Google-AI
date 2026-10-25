import { NormalizedDeal, MarketKPIs, DailyAggregate, TopCompany, TopClient } from '../types/deals';

export function computeMarketKPIs(deals: NormalizedDeal[]): MarketKPIs {
  if (!deals || deals.length === 0) {
    return {
      total_deals: 0,
      unique_companies: 0,
      unique_clients: 0,
      total_effective_value: 0,
      total_reported_value: 0,
      total_calculated_value: 0,
      buy_deals_count: 0,
      sell_deals_count: 0,
      buy_volume: 0,
      sell_volume: 0,
      buy_value: 0,
      sell_value: 0,
      calculated_value_deals_count: 0,
      reported_value_deals_count: 0,
    };
  }

  const uniqueCompanies = new Set<string>();
  const uniqueClients = new Set<string>();
  let totalEffective = 0;
  let totalReported = 0;
  let totalCalculated = 0;
  let buyDeals = 0;
  let sellDeals = 0;
  let buyVol = 0;
  let sellVol = 0;
  let buyVal = 0;
  let sellVal = 0;
  let calcCount = 0;
  let repCount = 0;

  for (const d of deals) {
    uniqueCompanies.add(d.symbol || d.company_name);
    uniqueClients.add(d.client_name);

    totalEffective += d.deal_value_effective;
    totalCalculated += d.deal_value_calculated;

    if (d.deal_value_reported !== null) {
      totalReported += d.deal_value_reported;
      repCount++;
    }

    if (d.is_value_calculated) {
      calcCount++;
    }

    if (d.buy_sell === 'BUY') {
      buyDeals++;
      buyVol += d.quantity;
      buyVal += d.deal_value_effective;
    } else if (d.buy_sell === 'SELL') {
      sellDeals++;
      sellVol += d.quantity;
      sellVal += d.deal_value_effective;
    }
  }

  return {
    total_deals: deals.length,
    unique_companies: uniqueCompanies.size,
    unique_clients: uniqueClients.size,
    total_effective_value: Math.round(totalEffective * 100) / 100,
    total_reported_value: Math.round(totalReported * 100) / 100,
    total_calculated_value: Math.round(totalCalculated * 100) / 100,
    buy_deals_count: buyDeals,
    sell_deals_count: sellDeals,
    buy_volume: buyVol,
    sell_volume: sellVol,
    buy_value: Math.round(buyVal * 100) / 100,
    sell_value: Math.round(sellVal * 100) / 100,
    calculated_value_deals_count: calcCount,
    reported_value_deals_count: repCount,
  };
}

export function aggregateByDate(deals: NormalizedDeal[]): DailyAggregate[] {
  const map = new Map<string, DailyAggregate>();

  for (const d of deals) {
    const dt = d.trade_date || 'UNKNOWN';
    let entry = map.get(dt);
    if (!entry) {
      entry = { date: dt, count: 0, total_value: 0, buy_value: 0, sell_value: 0, volume: 0 };
      map.set(dt, entry);
    }
    entry.count++;
    entry.total_value += d.deal_value_effective;
    entry.volume += d.quantity;
    if (d.buy_sell === 'BUY') {
      entry.buy_value += d.deal_value_effective;
    } else if (d.buy_sell === 'SELL') {
      entry.sell_value += d.deal_value_effective;
    }
  }

  const list = Array.from(map.values());
  list.sort((a, b) => a.date.localeCompare(b.date));
  return list;
}

export function aggregateByDealType(deals: NormalizedDeal[]): { deal_type: string; count: number; total_value: number; volume: number }[] {
  const map = new Map<string, { count: number; total_value: number; volume: number }>();
  for (const d of deals) {
    const dt = d.deal_type || 'BULK';
    let entry = map.get(dt);
    if (!entry) {
      entry = { count: 0, total_value: 0, volume: 0 };
      map.set(dt, entry);
    }
    entry.count++;
    entry.total_value += d.deal_value_effective;
    entry.volume += d.quantity;
  }
  return Array.from(map.entries()).map(([k, v]) => ({ deal_type: k, ...v }));
}

export function aggregateByExchange(deals: NormalizedDeal[]): { exchange: string; count: number; total_value: number; volume: number }[] {
  const map = new Map<string, { count: number; total_value: number; volume: number }>();
  for (const d of deals) {
    const ex = d.exchange || 'NSE';
    let entry = map.get(ex);
    if (!entry) {
      entry = { count: 0, total_value: 0, volume: 0 };
      map.set(ex, entry);
    }
    entry.count++;
    entry.total_value += d.deal_value_effective;
    entry.volume += d.quantity;
  }
  return Array.from(map.entries()).map(([k, v]) => ({ exchange: k, ...v }));
}

export function getTopCompanies(deals: NormalizedDeal[], topN = 10): TopCompany[] {
  const map = new Map<string, TopCompany>();
  for (const d of deals) {
    const sym = d.symbol || 'UNKNOWN';
    let entry = map.get(sym);
    if (!entry) {
      entry = {
        symbol: sym,
        company_name: d.company_name || sym,
        deal_count: 0,
        total_value: 0,
        buy_value: 0,
        sell_value: 0,
        volume: 0,
      };
      map.set(sym, entry);
    }
    entry.deal_count++;
    entry.total_value += d.deal_value_effective;
    entry.volume += d.quantity;
    if (d.buy_sell === 'BUY') {
      entry.buy_value += d.deal_value_effective;
    } else {
      entry.sell_value += d.deal_value_effective;
    }
  }

  const list = Array.from(map.values());
  list.sort((a, b) => b.total_value - a.total_value);
  return list.slice(0, topN);
}

export function getTopClients(deals: NormalizedDeal[], topN = 10): TopClient[] {
  const map = new Map<string, {
    client_name: string;
    deal_count: number;
    buy_count: number;
    sell_count: number;
    companies: Set<string>;
    total_value: number;
    buy_value: number;
    sell_value: number;
    volume: number;
  }>();

  for (const d of deals) {
    const cli = d.client_name || 'UNKNOWN';
    let entry = map.get(cli);
    if (!entry) {
      entry = {
        client_name: cli,
        deal_count: 0,
        buy_count: 0,
        sell_count: 0,
        companies: new Set(),
        total_value: 0,
        buy_value: 0,
        sell_value: 0,
        volume: 0,
      };
      map.set(cli, entry);
    }
    entry.deal_count++;
    entry.companies.add(d.symbol);
    entry.total_value += d.deal_value_effective;
    entry.volume += d.quantity;
    if (d.buy_sell === 'BUY') {
      entry.buy_count++;
      entry.buy_value += d.deal_value_effective;
    } else {
      entry.sell_count++;
      entry.sell_value += d.deal_value_effective;
    }
  }

  const list: TopClient[] = Array.from(map.values()).map(v => ({
    client_name: v.client_name,
    deal_count: v.deal_count,
    buy_count: v.buy_count,
    sell_count: v.sell_count,
    unique_companies_count: v.companies.size,
    total_value: Math.round(v.total_value * 100) / 100,
    buy_value: Math.round(v.buy_value * 100) / 100,
    sell_value: Math.round(v.sell_value * 100) / 100,
    volume: v.volume,
  }));

  list.sort((a, b) => b.total_value - a.total_value);
  return list.slice(0, topN);
}
