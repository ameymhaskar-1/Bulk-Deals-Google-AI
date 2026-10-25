"""
DealScope India — Data Normalizer Module
Validates, normalizes, and fingerprints bulk and block deal disclosures into a standardized schema.
"""
from dataclasses import dataclass, asdict
from datetime import datetime, date
import hashlib
import json
import re
from typing import Any, Dict, List, Optional, Tuple

MONTH_MAP = {
    "JAN": "01", "FEB": "02", "MAR": "03", "APR": "04",
    "MAY": "05", "JUN": "06", "JUL": "07", "AUG": "08",
    "SEP": "09", "OCT": "10", "NOV": "11", "DEC": "12"
}

@dataclass
class NormalizedDeal:
    id: str
    trade_date: str  # YYYY-MM-DD
    exchange: str    # 'NSE' | 'BSE'
    deal_type: str   # 'BULK' | 'BLOCK'
    symbol: str
    company_name: str
    isin: Optional[str]
    client_name: str
    buy_sell: str    # 'BUY' | 'SELL'
    quantity: int
    price: float
    deal_value_reported: Optional[float]
    deal_value_calculated: float
    deal_value_effective: float
    is_value_calculated: bool
    currency: str
    source_url: str
    retrieval_timestamp: str
    data_source_type: str  # 'LIVE_API' | 'OFFICIAL_CSV_UPLOAD' | 'OFFICIAL_XLSX_UPLOAD' | 'HISTORICAL_ARCHIVE'
    raw_record: str
    validation_flags: str

def parse_indian_date(date_str: Any) -> Optional[str]:
    """Parse dates in various Indian exchange formats to ISO YYYY-MM-DD."""
    if not date_str:
        return None
    s = str(date_str).strip().upper()
    
    # Format: 24-OCT-2026 or 24-Oct-2026
    match_alpha = re.match(r"^(\d{1,2})[-/ ]([A-Z]{3})[-/ ](\d{2,4})$", s)
    if match_alpha:
        day = match_alpha.group(1).zfill(2)
        month_str = match_alpha.group(2)
        year = match_alpha.group(3)
        if len(year) == 2:
            year = "20" + year
        month = MONTH_MAP.get(month_str, "01")
        return f"{year}-{month}-{day}"

    # Format: 24/10/2026 or 24-10-2026 (DD/MM/YYYY)
    match_dmy = re.match(r"^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$", s)
    if match_dmy:
        day = match_dmy.group(1).zfill(2)
        month = match_dmy.group(2).zfill(2)
        year = match_dmy.group(3)
        if len(year) == 2:
            year = "20" + year
        return f"{year}-{month}-{day}"

    # Format: 2026-10-24 (ISO YYYY-MM-DD)
    match_iso = re.match(r"^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$", s)
    if match_iso:
        year = match_iso.group(1)
        month = match_iso.group(2).zfill(2)
        day = match_iso.group(3).zfill(2)
        return f"{year}-{month}-{day}"

    return None

def normalize_buy_sell(val: Any) -> Optional[str]:
    """Normalize buy/sell indicators strictly to 'BUY' or 'SELL'."""
    if val is None:
        return None
    s = str(val).strip().upper()
    if s in ["BUY", "B", "PURCHASE", "1"]:
        return "BUY"
    if s in ["SELL", "S", "SALE", "2"]:
        return "SELL"
    return None

def normalize_deal_type(val: Any, default: str = "BULK") -> str:
    """Normalize deal category into 'BULK' or 'BLOCK'."""
    if not val:
        return default
    s = str(val).strip().upper()
    if "BLOCK" in s:
        return "BLOCK"
    if "BULK" in s:
        return "BULK"
    return default

def compute_record_id(
    trade_date: str,
    exchange: str,
    deal_type: str,
    symbol: str,
    client_name: str,
    buy_sell: str,
    quantity: int,
    price: float
) -> str:
    """Generate a deterministic composite fingerprint hash."""
    raw_key = f"{trade_date}|{exchange}|{deal_type}|{symbol.upper()}|{client_name.strip().upper()}|{buy_sell}|{quantity}|{round(price, 2)}"
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()[:24]

def normalize_single_record(
    row: Dict[str, Any],
    exchange_hint: str = "NSE",
    deal_type_hint: str = "BULK",
    source_type: str = "OFFICIAL_CSV_UPLOAD",
    source_url: str = "file://upload"
) -> Tuple[Optional[NormalizedDeal], List[str]]:
    """
    Normalizes a dictionary representing a row from NSE or BSE into NormalizedDeal.
    Returns (record, warning_list).
    """
    warnings = []
    
    # 1. Date resolution
    date_val = (
        row.get("Date") or row.get("DATE") or row.get("Trade Date") or
        row.get("Deal Date") or row.get("deal_date") or row.get("date")
    )
    parsed_date = parse_indian_date(date_val)
    if not parsed_date:
        return None, [f"Invalid or missing trade date: '{date_val}'"]

    # 2. Exchange
    exchange = (
        row.get("Exchange") or row.get("EXCHANGE") or exchange_hint
    ).strip().upper()
    if exchange not in ["NSE", "BSE"]:
        exchange = exchange_hint

    # 3. Deal Type
    deal_type_raw = row.get("Deal Type") or row.get("DEAL TYPE") or row.get("deal_type") or deal_type_hint
    deal_type = normalize_deal_type(deal_type_raw, default=deal_type_hint)

    # 4. Symbol / Scrip Code
    symbol = (
        row.get("Symbol") or row.get("SYMBOL") or row.get("Security Code") or
        row.get("Scrip Code") or row.get("Security Symbol") or row.get("symbol") or ""
    ).strip().upper()

    company_name = (
        row.get("Security Name") or row.get("SECURITY NAME") or row.get("Scrip Name") or
        row.get("Company Name") or row.get("company_name") or symbol
    ).strip()

    if not symbol:
        symbol = company_name[:12].strip().upper()
        warnings.append("Symbol missing; derived from company name.")

    # 5. Client Name
    client_name = (
        row.get("Client Name") or row.get("CLIENT NAME") or row.get("Investor Name") or
        row.get("client_name") or ""
    ).strip()
    if not client_name:
        return None, ["Missing client name; record rejected."]

    # 6. Buy / Sell
    bs_raw = (
        row.get("Buy/Sell") or row.get("BUY/SELL") or row.get("Buy / Sell") or
        row.get("Deal") or row.get("Transaction Type") or row.get("buy_sell")
    )
    buy_sell = normalize_buy_sell(bs_raw)
    if not buy_sell:
        return None, [f"Unknown buy/sell indicator: '{bs_raw}'"]

    # 7. Quantity
    qty_raw = (
        row.get("Quantity Traded") or row.get("Quantity") or row.get("QUANTITY") or
        row.get("Shares Traded") or row.get("qty")
    )
    try:
        qty_str = str(qty_raw).strip().replace(",", "")
        qty_val = float(qty_str)
        quantity = int(qty_val)
        if quantity <= 0:
            return None, [f"Negative or zero quantity: '{qty_raw}'"]
    except Exception:
        return None, [f"Non-numeric quantity: '{qty_raw}'"]

    # 8. Price
    price_raw = (
        row.get("Trade Price / Wght. Avg. Price") or row.get("Trade Price") or
        row.get("Price") or row.get("PRICE") or row.get("Avg Price") or row.get("price")
    )
    try:
        price_str = str(price_raw).strip().replace(",", "")
        price = round(float(price_str), 2)
        if price <= 0:
            warnings.append(f"Suspicious zero/negative price: {price}")
    except Exception:
        return None, [f"Non-numeric price: '{price_raw}'"]
        if price <= 0:
            warnings.append(f"Suspicious zero/negative price: {price}")
    except Exception:
        return None, [f"Non-numeric price: '{price_raw}'"]

    # 9. Deal Value (Reported vs Calculated)
    val_raw = row.get("Value") or row.get("VALUE") or row.get("Deal Value") or row.get("deal_value")
    deal_value_reported = None
    is_calculated = True
    deal_value_calc = round(quantity * price, 2)
    
    if val_raw:
        try:
            val_clean = re.sub(r"[^\d.]", "", str(val_raw))
            deal_value_reported = round(float(val_clean), 2)
            is_calculated = False
        except Exception:
            warnings.append(f"Could not parse reported deal value '{val_raw}'; falling back to calculated.")

    deal_value_effective = deal_value_reported if deal_value_reported is not None else deal_value_calc

    # 10. ISIN
    isin = row.get("ISIN") or row.get("isin") or None
    if isin:
        isin = str(isin).strip().upper()

    # 11. Generate Record ID & Audit Metadata
    rec_id = compute_record_id(
        trade_date=parsed_date,
        exchange=exchange,
        deal_type=deal_type,
        symbol=symbol,
        client_name=client_name,
        buy_sell=buy_sell,
        quantity=quantity,
        price=price
    )

    retrieval_ts = datetime.utcnow().isoformat() + "Z"
    validation_flags = "; ".join(warnings) if warnings else "VALID"

    deal = NormalizedDeal(
        id=rec_id,
        trade_date=parsed_date,
        exchange=exchange,
        deal_type=deal_type,
        symbol=symbol,
        company_name=company_name,
        isin=isin,
        client_name=client_name,
        buy_sell=buy_sell,
        quantity=quantity,
        price=price,
        deal_value_reported=deal_value_reported,
        deal_value_calculated=deal_value_calc,
        deal_value_effective=deal_value_effective,
        is_value_calculated=is_calculated,
        currency="INR",
        source_url=source_url,
        retrieval_timestamp=retrieval_ts,
        data_source_type=source_type,
        raw_record=json.dumps(row, default=str),
        validation_flags=validation_flags
    )
    return deal, warnings
