import { NormalizedDeal, RetrievalLog } from '../types/deals';
import { OFFICIAL_SEED_DEALS } from '../data/officialSeedData';

const DEALS_KEY = 'dealscope_stored_deals_v1';
const LOGS_KEY = 'dealscope_retrieval_logs_v1';

export function getStoredDeals(): NormalizedDeal[] {
  try {
    const raw = localStorage.getItem(DEALS_KEY);
    if (!raw) {
      saveDeals(OFFICIAL_SEED_DEALS);
      logRetrieval('INITIAL_SEED_DISCLOSURES', 'SUCCESS', OFFICIAL_SEED_DEALS.length, 'Loaded official seed disclosures.');
      return OFFICIAL_SEED_DEALS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : OFFICIAL_SEED_DEALS;
  } catch {
    return OFFICIAL_SEED_DEALS;
  }
}

export function saveDeals(deals: NormalizedDeal[]): void {
  try {
    localStorage.setItem(DEALS_KEY, JSON.stringify(deals));
  } catch (err) {
    console.error('Failed to save deals to localStorage', err);
  }
}

export function insertDeals(newDeals: NormalizedDeal[]): { inserted: number; duplicates: number } {
  const current = getStoredDeals();
  const existingIds = new Set(current.map(d => d.id));
  let inserted = 0;
  let duplicates = 0;
  const toAdd: NormalizedDeal[] = [];

  for (const d of newDeals) {
    if (existingIds.has(d.id)) {
      duplicates++;
    } else {
      existingIds.add(d.id);
      toAdd.push(d);
      inserted++;
    }
  }

  if (inserted > 0) {
    const combined = [...toAdd, ...current];
    saveDeals(combined);
  }

  return { inserted, duplicates };
}

export function resetToSeedDeals(): void {
  saveDeals(OFFICIAL_SEED_DEALS);
  logRetrieval('RESET_SEED_DATA', 'SUCCESS', OFFICIAL_SEED_DEALS.length, 'Reset storage to authentic exchange seed records.');
}

export function getRetrievalLogs(): RetrievalLog[] {
  try {
    const raw = localStorage.getItem(LOGS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function logRetrieval(sourceName: string, status: 'SUCCESS' | 'ERROR' | 'PARTIAL', count: number, message: string): void {
  try {
    const logs = getRetrievalLogs();
    const newLog: RetrievalLog = {
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString(),
      source_name: sourceName,
      status,
      records_count: count,
      message,
    };
    logs.unshift(newLog);
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs.slice(0, 50)));
  } catch (err) {
    console.error('Failed to write retrieval log', err);
  }
}
