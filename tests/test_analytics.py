"""
Automated unit tests for KPIs, aggregations, and calendar trading day calculations.
"""
import unittest
from datetime import date
from config import is_trading_day, get_last_n_trading_days
from analytics import (
    compute_market_kpis,
    aggregate_by_date,
    aggregate_by_exchange,
    get_top_companies,
    get_top_clients,
)

class TestAnalytics(unittest.TestCase):
    def setUp(self):
        self.deals = [
            {
                "id": "1", "trade_date": "2026-10-24", "exchange": "NSE", "deal_type": "BULK",
                "symbol": "HDFCBANK", "company_name": "HDFC Bank", "client_name": "VANGUARD",
                "buy_sell": "BUY", "quantity": 100000, "price": 1600.0, "deal_value_effective": 160000000.0,
                "deal_value_reported": None, "deal_value_calculated": 160000000.0, "is_value_calculated": 1
            },
            {
                "id": "2", "trade_date": "2026-10-24", "exchange": "NSE", "deal_type": "BULK",
                "symbol": "HDFCBANK", "company_name": "HDFC Bank", "client_name": "BLACKROCK",
                "buy_sell": "SELL", "quantity": 100000, "price": 1600.0, "deal_value_effective": 160000000.0,
                "deal_value_reported": None, "deal_value_calculated": 160000000.0, "is_value_calculated": 1
            },
            {
                "id": "3", "trade_date": "2026-10-23", "exchange": "BSE", "deal_type": "BLOCK",
                "symbol": "RELIANCE", "company_name": "Reliance Ind", "client_name": "LIC",
                "buy_sell": "BUY", "quantity": 50000, "price": 2800.0, "deal_value_effective": 140000000.0,
                "deal_value_reported": 140000000.0, "deal_value_calculated": 140000000.0, "is_value_calculated": 0
            }
        ]

    def test_compute_market_kpis(self):
        kpis = compute_market_kpis(self.deals)
        self.assertEqual(kpis["total_deals"], 3)
        self.assertEqual(kpis["unique_companies"], 2)
        self.assertEqual(kpis["unique_clients"], 3)
        self.assertEqual(kpis["total_effective_value"], 460000000.0)
        self.assertEqual(kpis["buy_deals_count"], 2)
        self.assertEqual(kpis["sell_deals_count"], 1)
        self.assertEqual(kpis["buy_volume"], 150000)
        self.assertEqual(kpis["sell_volume"], 100000)

    def test_empty_kpis(self):
        empty = compute_market_kpis([])
        self.assertEqual(empty["total_deals"], 0)
        self.assertEqual(empty["total_effective_value"], 0.0)

    def test_aggregate_by_date(self):
        daily = aggregate_by_date(self.deals)
        self.assertEqual(len(daily), 2)
        # Check chronological ordering
        self.assertEqual(daily[0]["date"], "2026-10-23")
        self.assertEqual(daily[1]["date"], "2026-10-24")
        self.assertEqual(daily[1]["count"], 2)

    def test_trading_day_calendar(self):
        # A Sunday is not a trading day
        sunday = date(2026, 10, 25)
        self.assertFalse(is_trading_day(sunday))

        # Test last 7 trading days yields strictly weekdays / trading sessions
        sessions = get_last_n_trading_days(7, ref_date=date(2026, 10, 24))
        self.assertEqual(len(sessions), 7)
        for s in sessions:
            self.assertTrue(is_trading_day(s))
            self.assertLess(s.weekday(), 5)

if __name__ == "__main__":
    unittest.main()
