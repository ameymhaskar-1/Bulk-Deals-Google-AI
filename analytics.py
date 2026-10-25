"""
DealScope India — Analytics Engine
Computes aggregate metrics, distributions, top companies, client rankings, and company deep-dives.
"""
from collections import defaultdict
from typing import Any, Dict, List, Optional

def compute_market_kpis(deals: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Compute high-level KPIs from a filtered list of deal records."""
    if not deals:
        return {
            "total_deals": 0,
            "unique_companies": 0,
            "unique_clients": 0,
            "total_effective_value": 0.0,
            "total_reported_value": 0.0,
            "total_calculated_value": 0.0,
            "buy_deals_count": 0,
            "sell_deals_count": 0,
            "buy_volume": 0,
            "sell_volume": 0,
            "buy_value": 0.0,
            "sell_value": 0.0,
            "calculated_value_deals_count": 0,
            "reported_value_deals_count": 0,
        }

    unique_companies = set()
    unique_clients = set()
    total_effective_val = 0.0
    total_reported_val = 0.0
    total_calculated_val = 0.0
    buy_count = 0
    sell_count = 0
    buy_vol = 0
    sell_vol = 0
    buy_val = 0.0
    sell_val = 0.0
    calc_count = 0
    rep_count = 0

    for d in deals:
        unique_companies.add(d.get("symbol") or d.get("company_name"))
        unique_clients.add(d.get("client_name"))
        
        eff_val = float(d.get("deal_value_effective") or 0.0)
        total_effective_val += eff_val

        rep_val = d.get("deal_value_reported")
        if rep_val is not None:
            total_reported_val += float(rep_val)
            rep_count += 1
        
        calc_val = float(d.get("deal_value_calculated") or 0.0)
        total_calculated_val += calc_val

        if d.get("is_value_calculated"):
            calc_count += 1

        bs = str(d.get("buy_sell", "")).upper()
        qty = int(d.get("quantity") or 0)
        if bs == "BUY":
            buy_count += 1
            buy_vol += qty
            buy_val += eff_val
        elif bs == "SELL":
            sell_count += 1
            sell_vol += qty
            sell_val += eff_val

    return {
        "total_deals": len(deals),
        "unique_companies": len(unique_companies),
        "unique_clients": len(unique_clients),
        "total_effective_value": round(total_effective_val, 2),
        "total_reported_value": round(total_reported_val, 2),
        "total_calculated_value": round(total_calculated_val, 2),
        "buy_deals_count": buy_count,
        "sell_deals_count": sell_count,
        "buy_volume": buy_vol,
        "sell_volume": sell_vol,
        "buy_value": round(buy_val, 2),
        "sell_value": round(sell_val, 2),
        "calculated_value_deals_count": calc_count,
        "reported_value_deals_count": rep_count,
    }

def aggregate_by_date(deals: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Group deals chronologically by trade date."""
    grouped = defaultdict(lambda: {
        "date": "", "count": 0, "total_value": 0.0, "buy_value": 0.0, "sell_value": 0.0, "volume": 0
    })
    for d in deals:
        dt = d.get("trade_date", "UNKNOWN")
        entry = grouped[dt]
        entry["date"] = dt
        entry["count"] += 1
        val = float(d.get("deal_value_effective") or 0.0)
        entry["total_value"] += val
        entry["volume"] += int(d.get("quantity") or 0)
        bs = str(d.get("buy_sell", "")).upper()
        if bs == "BUY":
            entry["buy_value"] += val
        elif bs == "SELL":
            entry["sell_value"] += val

    result = list(grouped.values())
    result.sort(key=lambda x: x["date"])
    for r in result:
        r["total_value"] = round(r["total_value"], 2)
        r["buy_value"] = round(r["buy_value"], 2)
        r["sell_value"] = round(r["sell_value"], 2)
    return result

def aggregate_by_deal_type(deals: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Distribution between Bulk and Block deals."""
    counts = defaultdict(lambda: {"count": 0, "total_value": 0.0, "volume": 0})
    for d in deals:
        dt = d.get("deal_type", "BULK")
        counts[dt]["count"] += 1
        counts[dt]["total_value"] += float(d.get("deal_value_effective") or 0.0)
        counts[dt]["volume"] += int(d.get("quantity") or 0)

    return [
        {"deal_type": k, "count": v["count"], "total_value": round(v["total_value"], 2), "volume": v["volume"]}
        for k, v in counts.items()
    ]

def aggregate_by_exchange(deals: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Distribution between NSE and BSE."""
    counts = defaultdict(lambda: {"count": 0, "total_value": 0.0, "volume": 0})
    for d in deals:
        ex = d.get("exchange", "NSE")
        counts[ex]["count"] += 1
        counts[ex]["total_value"] += float(d.get("deal_value_effective") or 0.0)
        counts[ex]["volume"] += int(d.get("quantity") or 0)

    return [
        {"exchange": k, "count": v["count"], "total_value": round(v["total_value"], 2), "volume": v["volume"]}
        for k, v in counts.items()
    ]

def get_top_companies(deals: List[Dict[str, Any]], top_n: int = 10, sort_by: str = "value") -> List[Dict[str, Any]]:
    """Top companies by total deal value or trade count."""
    grouped = defaultdict(lambda: {
        "symbol": "", "company_name": "", "deal_count": 0, "total_value": 0.0,
        "buy_value": 0.0, "sell_value": 0.0, "volume": 0
    })
    for d in deals:
        sym = d.get("symbol", "UNKNOWN")
        entry = grouped[sym]
        entry["symbol"] = sym
        entry["company_name"] = d.get("company_name", sym)
        entry["deal_count"] += 1
        val = float(d.get("deal_value_effective") or 0.0)
        entry["total_value"] += val
        entry["volume"] += int(d.get("quantity") or 0)
        bs = str(d.get("buy_sell", "")).upper()
        if bs == "BUY":
            entry["buy_value"] += val
        elif bs == "SELL":
            entry["sell_value"] += val

    items = list(grouped.values())
    if sort_by == "count":
        items.sort(key=lambda x: x["deal_count"], reverse=True)
    else:
        items.sort(key=lambda x: x["total_value"], reverse=True)

    for it in items:
        it["total_value"] = round(it["total_value"], 2)
        it["buy_value"] = round(it["buy_value"], 2)
        it["sell_value"] = round(it["sell_value"], 2)
    return items[:top_n]

def get_top_clients(deals: List[Dict[str, Any]], top_n: int = 10) -> List[Dict[str, Any]]:
    """Top disclosed clients by total traded value and transaction frequency."""
    grouped = defaultdict(lambda: {
        "client_name": "", "deal_count": 0, "buy_count": 0, "sell_count": 0,
        "total_value": 0.0, "buy_value": 0.0, "sell_value": 0.0, "volume": 0, "companies": set()
    })
    for d in deals:
        client = d.get("client_name", "UNKNOWN")
        entry = grouped[client]
        entry["client_name"] = client
        entry["deal_count"] += 1
        entry["companies"].add(d.get("symbol", ""))
        val = float(d.get("deal_value_effective") or 0.0)
        entry["total_value"] += val
        entry["volume"] += int(d.get("quantity") or 0)
        bs = str(d.get("buy_sell", "")).upper()
        if bs == "BUY":
            entry["buy_count"] += 1
            entry["buy_value"] += val
        elif bs == "SELL":
            entry["sell_count"] += 1
            entry["sell_value"] += val

    items = []
    for k, v in grouped.items():
        items.append({
            "client_name": v["client_name"],
            "deal_count": v["deal_count"],
            "buy_count": v["buy_count"],
            "sell_count": v["sell_count"],
            "unique_companies_count": len(v["companies"]),
            "total_value": round(v["total_value"], 2),
            "buy_value": round(v["buy_value"], 2),
            "sell_value": round(v["sell_value"], 2),
            "volume": v["volume"]
        })

    items.sort(key=lambda x: x["total_value"], reverse=True)
    return items[:top_n]

def get_company_profile(deals: List[Dict[str, Any]], symbol: str) -> Dict[str, Any]:
    """In-depth company intelligence breakdown."""
    comp_deals = [d for d in deals if d.get("symbol") == symbol or d.get("company_name") == symbol]
    kpis = compute_market_kpis(comp_deals)
    clients_seen = set()
    exchanges = set()
    for d in comp_deals:
        clients_seen.add(d.get("client_name"))
        exchanges.add(d.get("exchange"))

    return {
        "symbol": symbol,
        "company_name": comp_deals[0].get("company_name", symbol) if comp_deals else symbol,
        "deals": comp_deals,
        "kpis": kpis,
        "unique_clients": list(clients_seen),
        "exchanges": list(exchanges),
        "exchange_distribution": aggregate_by_exchange(comp_deals),
        "deal_type_distribution": aggregate_by_deal_type(comp_deals),
    }

def get_client_profile(deals: List[Dict[str, Any]], client_name: str) -> Dict[str, Any]:
    """In-depth client intelligence breakdown."""
    norm_client = client_name.strip().upper()
    client_deals = [d for d in deals if norm_client in d.get("client_name", "").upper()]
    kpis = compute_market_kpis(client_deals)
    companies = defaultdict(lambda: {"count": 0, "total_value": 0.0, "company_name": ""})
    for d in client_deals:
        s = d.get("symbol", "")
        companies[s]["count"] += 1
        companies[s]["total_value"] += float(d.get("deal_value_effective") or 0.0)
        companies[s]["company_name"] = d.get("company_name", s)

    return {
        "client_name": client_name,
        "deals": client_deals,
        "kpis": kpis,
        "traded_companies": [
            {"symbol": k, "company_name": v["company_name"], "deal_count": v["count"], "total_value": round(v["total_value"], 2)}
            for k, v in companies.items()
        ],
        "exchange_distribution": aggregate_by_exchange(client_deals),
        "deal_type_distribution": aggregate_by_deal_type(client_deals),
    }
