"""
DealScope India — Security Mapping Module
Maps disclosed company names, BSE scrip codes, and NSE symbols to ISINs and Yahoo Finance tickers.
"""
from typing import Dict, Optional, Tuple

# Pre-seeded directory of verified Indian equities (NSE, BSE, ISIN, Yahoo Ticker)
SECURITY_DIRECTORY: Dict[str, Dict[str, str]] = {
    "HDFCBANK": {
        "symbol": "HDFCBANK",
        "company_name": "HDFC Bank Limited",
        "bse_code": "500180",
        "isin": "INE040A01034",
        "yahoo_ticker": "HDFCBANK.NS",
        "bse_yahoo": "500180.BO",
    },
    "RELIANCE": {
        "symbol": "RELIANCE",
        "company_name": "Reliance Industries Limited",
        "bse_code": "500325",
        "isin": "INE002A01018",
        "yahoo_ticker": "RELIANCE.NS",
        "bse_yahoo": "500325.BO",
    },
    "TCS": {
        "symbol": "TCS",
        "company_name": "Tata Consultancy Services Limited",
        "bse_code": "532540",
        "isin": "INE467B01029",
        "yahoo_ticker": "TCS.NS",
        "bse_yahoo": "532540.BO",
    },
    "INFY": {
        "symbol": "INFY",
        "company_name": "Infosys Limited",
        "bse_code": "500209",
        "isin": "INE009A01021",
        "yahoo_ticker": "INFY.NS",
        "bse_yahoo": "500209.BO",
    },
    "ICICIBANK": {
        "symbol": "ICICIBANK",
        "company_name": "ICICI Bank Limited",
        "bse_code": "532174",
        "isin": "INE090A01021",
        "yahoo_ticker": "ICICIBANK.NS",
        "bse_yahoo": "532174.BO",
    },
    "BHARTIARTL": {
        "symbol": "BHARTIARTL",
        "company_name": "Bharti Airtel Limited",
        "bse_code": "532454",
        "isin": "INE397D01024",
        "yahoo_ticker": "BHARTIARTL.NS",
        "bse_yahoo": "532454.BO",
    },
    "LT": {
        "symbol": "LT",
        "company_name": "Larsen & Toubro Limited",
        "bse_code": "500510",
        "isin": "INE018A01030",
        "yahoo_ticker": "LT.NS",
        "bse_yahoo": "500510.BO",
    },
    "ITC": {
        "symbol": "ITC",
        "company_name": "ITC Limited",
        "bse_code": "500875",
        "isin": "INE154A01025",
        "yahoo_ticker": "ITC.NS",
        "bse_yahoo": "500875.BO",
    },
    "AXISBANK": {
        "symbol": "AXISBANK",
        "company_name": "Axis Bank Limited",
        "bse_code": "532215",
        "isin": "INE238A01034",
        "yahoo_ticker": "AXISBANK.NS",
        "bse_yahoo": "532215.BO",
    },
    "HINDUNILVR": {
        "symbol": "HINDUNILVR",
        "company_name": "Hindustan Unilever Limited",
        "bse_code": "500696",
        "isin": "INE030A01027",
        "yahoo_ticker": "HINDUNILVR.NS",
        "bse_yahoo": "500696.BO",
    },
}

def resolve_security(
    symbol_or_code: str,
    company_name: Optional[str] = None
) -> Tuple[Optional[str], str, Optional[str]]:
    """
    Resolves symbol to Yahoo Finance ticker and returns (yahoo_ticker, confidence, isin).
    Confidence is 'HIGH', 'MEDIUM', or 'MANUAL_REQUIRED'.
    """
    clean_key = symbol_or_code.strip().upper()

    # Exact symbol match
    if clean_key in SECURITY_DIRECTORY:
        info = SECURITY_DIRECTORY[clean_key]
        return info["yahoo_ticker"], "HIGH", info.get("isin")

    # Match by BSE code
    for sym, info in SECURITY_DIRECTORY.items():
        if info.get("bse_code") == clean_key:
            return info["yahoo_ticker"], "HIGH", info.get("isin")

    # Fuzzy match by company name
    if company_name:
        comp_clean = company_name.strip().upper()
        for sym, info in SECURITY_DIRECTORY.items():
            if info["company_name"].upper() in comp_clean or comp_clean in info["company_name"].upper():
                return info["yahoo_ticker"], "MEDIUM", info.get("isin")

    # If key looks like standard NSE symbol (letters only)
    if clean_key.isalpha():
        return f"{clean_key}.NS", "MEDIUM", None

    # If key is 6-digit numeric (BSE Scrip Code)
    if clean_key.isdigit() and len(clean_key) == 6:
        return f"{clean_key}.BO", "MEDIUM", None

    return None, "MANUAL_REQUIRED", None
