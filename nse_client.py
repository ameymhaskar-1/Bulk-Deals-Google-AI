"""
DealScope India — NSE Client Adapter
Interacts with official NSE India disclosures, sessions, CSV archives, and error handling.
"""
import csv
from datetime import datetime
import io
from typing import Any, Dict, List, Optional, Tuple

import requests

from config import DEFAULT_TIMEOUT, NSE_BASE_URL, NSE_BULK_CSV_URL, NSE_BLOCK_CSV_URL, REQUEST_HEADERS
from data_normalizer import normalize_single_record, NormalizedDeal

class NSEClient:
    def __init__(self, timeout: int = DEFAULT_TIMEOUT):
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update(REQUEST_HEADERS)
        self.cookies_initialized = False

    def initialize_session(self) -> Tuple[bool, str]:
        """
        NSE requires fetching the home page first to receive session cookies (nsit, etc.).
        Returns (success, message).
        """
        try:
            resp = self.session.get(NSE_BASE_URL, timeout=self.timeout)
            if resp.status_code == 200:
                self.cookies_initialized = True
                return True, "Session initialized with NSE official cookies."
            elif resp.status_code == 403:
                return False, "NSE returned 403 Forbidden (Akamai anti-scraping / Cloud IP geoblock active). Use official CSV import."
            else:
                return False, f"NSE returned status code {resp.status_code}."
        except requests.exceptions.Timeout:
            return False, "Connection to nseindia.com timed out."
        except requests.exceptions.RequestException as e:
            return False, f"NSE connection error: {str(e)}"

    def fetch_bulk_deals_csv(self) -> Tuple[List[NormalizedDeal], str]:
        """
        Fetches official daily bulk deals CSV from NSE archives.
        """
        try:
            resp = self.session.get(NSE_BULK_CSV_URL, timeout=self.timeout)
            if resp.status_code == 200:
                content = resp.content.decode("utf-8-sig", errors="replace")
                return self.parse_nse_csv(content, deal_type="BULK", source_url=NSE_BULK_CSV_URL)
            elif resp.status_code == 403:
                return [], "NSE 403 Forbidden. Cloud hosting IP is blocked by NSE CDN. Please use manual official CSV upload."
            else:
                return [], f"Failed to fetch NSE bulk CSV. Status: {resp.status_code}"
        except Exception as e:
            return [], f"Error connecting to NSE: {str(e)}"

    def fetch_block_deals_csv(self) -> Tuple[List[NormalizedDeal], str]:
        """
        Fetches official daily block deals CSV from NSE archives.
        """
        try:
            resp = self.session.get(NSE_BLOCK_CSV_URL, timeout=self.timeout)
            if resp.status_code == 200:
                content = resp.content.decode("utf-8-sig", errors="replace")
                return self.parse_nse_csv(content, deal_type="BLOCK", source_url=NSE_BLOCK_CSV_URL)
            elif resp.status_code == 403:
                return [], "NSE 403 Forbidden. Cloud hosting IP is blocked by NSE CDN. Please use manual official CSV upload."
            else:
                return [], f"Failed to fetch NSE block CSV. Status: {resp.status_code}"
        except Exception as e:
            return [], f"Error connecting to NSE: {str(e)}"

    def parse_nse_csv(
        self,
        csv_text: str,
        deal_type: str = "BULK",
        source_url: str = "https://www.nseindia.com"
    ) -> Tuple[List[NormalizedDeal], str]:
        """
        Parses official NSE Bulk / Block deals CSV file content.
        """
        deals: List[NormalizedDeal] = []
        reader = csv.DictReader(io.StringIO(csv_text))
        
        parsed_count = 0
        error_count = 0

        for row in reader:
            deal, warnings = normalize_single_record(
                row=row,
                exchange_hint="NSE",
                deal_type_hint=deal_type,
                source_type="LIVE_API" if "http" in source_url else "OFFICIAL_CSV_UPLOAD",
                source_url=source_url
            )
            if deal:
                deals.append(deal)
                parsed_count += 1
            else:
                error_count += 1

        msg = f"Successfully parsed {parsed_count} NSE {deal_type} deal records ({error_count} rejected or empty rows)."
        return deals, msg
