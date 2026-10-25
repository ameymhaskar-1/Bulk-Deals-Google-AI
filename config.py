"""
DealScope India — Configuration Module
Configuration settings, exchange endpoints, trading calendar, and database setup.
"""
from datetime import date, datetime, timedelta
import os
from pathlib import Path
from typing import Set

# Base directories
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)
DATABASE_PATH = str(DATA_DIR / "dealscope.db")

# Official Exchange URLs
NSE_BASE_URL = "https://www.nseindia.com"
NSE_BULK_CSV_URL = "https://nsearchives.nseindia.com/content/equities/bulk.csv"
NSE_BLOCK_CSV_URL = "https://nsearchives.nseindia.com/content/equities/block.csv"
NSE_API_BULK = "https://www.nseindia.com/api/historical/bulk-deals"
NSE_API_BLOCK = "https://www.nseindia.com/api/block-deal"

BSE_BASE_URL = "https://www.bseindia.com"
BSE_BULK_URL = "https://www.bseindia.com/markets/equity/EQReports/Bulk_Deals.aspx"
BSE_BLOCK_URL = "https://www.bseindia.com/markets/equity/EQReports/Block_Deals.aspx"
BSE_API_BULK = "https://api.bseindia.com/BseIndiaAPI/api/BulkDeals/w"

# HTTP Client Config
DEFAULT_TIMEOUT = 12  # seconds
REQUEST_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Connection": "keep-alive",
}

# Indian Stock Exchange Trading Holidays (2024-2026 Sample/Standard NSE/BSE Calendar)
NSE_BSE_HOLIDAYS_2026: Set[str] = {
    "2026-01-26",  # Republic Day
    "2026-02-17",  # Mahashivratri
    "2026-03-03",  # Holi
    "2026-03-20",  # Id-Ul-Fitr
    "2026-04-03",  # Good Friday
    "2026-04-14",  # Dr. Baba Saheb Ambedkar Jayanti
    "2026-05-01",  # Maharashtra Day
    "2026-05-27",  # Bakri Id
    "2026-08-15",  # Independence Day
    "2026-09-04",  # Janmashtami
    "2026-10-02",  # Mahatma Gandhi Jayanti
    "2026-10-20",  # Dussehra
    "2026-11-09",  # Diwali Laxmi Pujan
    "2026-11-10",  # Diwali Balipratipada
    "2026-11-24",  # Gurunanak Jayanti
    "2026-12-25",  # Christmas
}

def is_trading_day(d: date) -> bool:
    """Return True if date is a weekday and not an Indian exchange holiday."""
    if d.weekday() >= 5:  # 5=Saturday, 6=Sunday
        return False
    return d.isoformat() not in NSE_BSE_HOLIDAYS_2026

def get_last_n_trading_days(n: int = 7, ref_date: date = None) -> list[date]:
    """
    Get the last N actual Indian exchange trading days strictly excluding weekends and holidays.
    """
    if ref_date is None:
        ref_date = date.today()
    
    trading_days = []
    curr = ref_date
    while len(trading_days) < n:
        if is_trading_day(curr):
            trading_days.append(curr)
        curr -= timedelta(days=1)
    return trading_days
