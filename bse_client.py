"""
DealScope India — BSE Client Adapter
Interacts with official BSE India disclosure pages, endpoints, and CSV uploads.
"""
import csv
from datetime import datetime
import io
from typing import Any, Dict, List, Optional, Tuple

import requests

from config import BSE_BASE_URL, BSE_BULK_URL, BSE_BLOCK_URL, BSE_API_BULK, DEFAULT_TIMEOUT, REQUEST_HEADERS
from data_normalizer import normalize_single_record, NormalizedDeal

class BSEClient:
    def __init__(self, timeout: int = DEFAULT_TIMEOUT):
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update(REQUEST_HEADERS)

    def fetch_live_bulk_deals(self) -> Tuple[List[NormalizedDeal], str]:
        """
        Attempts to query BSE Bulk Deals endpoint.
        """
        try:
            resp = self.session.get(BSE_API_BULK, timeout=self.timeout)
            if resp.status_code == 200:
                try:
                    data = resp.json()
                    # BSE JSON format parsing if available
                    deals = []
                    for item in data.get("Table", []):
                        deal, _ = normalize_single_record(
                            row=item,
                            exchange_hint="BSE",
                            deal_type_hint="BULK",
                            source_type="LIVE_API",
                            source_url=BSE_API_BULK
                        )
                        if deal:
                            deals.append(deal)
                    return deals, f"Fetched {len(deals)} records from BSE API."
                except Exception as ex:
                    return [], f"Failed to parse BSE JSON response: {str(ex)}"
            elif resp.status_code == 403:
                return [], "BSE 403 Forbidden. Cloud IP restrictions active. Please use official BSE CSV upload."
            else:
                return [], f"BSE API returned status code {resp.status_code}."
        except requests.exceptions.Timeout:
            return [], "BSE endpoint request timed out."
        except Exception as e:
            return [], f"BSE connection error: {str(e)}"

    def parse_bse_csv(
        self,
        csv_text: str,
        deal_type_hint: str = "BULK",
        source_url: str = "https://www.bseindia.com"
    ) -> Tuple[List[NormalizedDeal], str]:
        """
        Parses official BSE Bulk / Block deals CSV file content.
        """
        deals: List[NormalizedDeal] = []
        reader = csv.DictReader(io.StringIO(csv_text))
        
        parsed_count = 0
        error_count = 0

        for row in reader:
            deal, warnings = normalize_single_record(
                row=row,
                exchange_hint="BSE",
                deal_type_hint=deal_type_hint,
                source_type="LIVE_API" if "http" in source_url else "OFFICIAL_CSV_UPLOAD",
                source_url=source_url
            )
            if deal:
                deals.append(deal)
                parsed_count += 1
            else:
                error_count += 1

        msg = f"Successfully parsed {parsed_count} BSE records ({error_count} rejected or empty rows)."
        return deals, msg
