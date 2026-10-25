"""
Automated unit tests for data normalization, dates, buy/sell flags, and hashing.
"""
import unittest
from data_normalizer import (
    parse_indian_date,
    normalize_buy_sell,
    normalize_deal_type,
    compute_record_id,
    normalize_single_record,
)

class TestDataNormalizer(unittest.TestCase):
    def test_parse_indian_date(self):
        self.assertEqual(parse_indian_date("24-OCT-2026"), "2026-10-24")
        self.assertEqual(parse_indian_date("24-Oct-2026"), "2026-10-24")
        self.assertEqual(parse_indian_date("24/10/2026"), "2026-10-24")
        self.assertEqual(parse_indian_date("2026-10-24"), "2026-10-24")
        self.assertIsNone(parse_indian_date("invalid_date"))

    def test_normalize_buy_sell(self):
        self.assertEqual(normalize_buy_sell("BUY"), "BUY")
        self.assertEqual(normalize_buy_sell("B"), "BUY")
        self.assertEqual(normalize_buy_sell("Purchase"), "BUY")
        self.assertEqual(normalize_buy_sell("SELL"), "SELL")
        self.assertEqual(normalize_buy_sell("S"), "SELL")
        self.assertIsNone(normalize_buy_sell("HOLD"))

    def test_normalize_deal_type(self):
        self.assertEqual(normalize_deal_type("BULK DEAL"), "BULK")
        self.assertEqual(normalize_deal_type("Block"), "BLOCK")
        self.assertEqual(normalize_deal_type(None, default="BULK"), "BULK")

    def test_compute_record_id_deterministic(self):
        id1 = compute_record_id("2026-10-24", "NSE", "BULK", "HDFCBANK", "VANGUARD", "BUY", 100000, 1680.50)
        id2 = compute_record_id("2026-10-24", "NSE", "BULK", "HDFCBANK", "VANGUARD", "BUY", 100000, 1680.50)
        id3 = compute_record_id("2026-10-24", "NSE", "BULK", "HDFCBANK", "VANGUARD", "SELL", 100000, 1680.50)
        self.assertEqual(id1, id2)
        self.assertNotEqual(id1, id3)

    def test_normalize_single_record_reported_vs_calc_value(self):
        row_without_val = {
            "Date": "24-OCT-2026",
            "Symbol": "RELIANCE",
            "Security Name": "Reliance Industries Limited",
            "Client Name": "BLACKROCK FUND",
            "Buy/Sell": "BUY",
            "Quantity Traded": "500000",
            "Trade Price / Wght. Avg. Price": "2750.00"
        }
        deal, warnings = normalize_single_record(row_without_val, exchange_hint="NSE", deal_type_hint="BULK")
        self.assertIsNotNone(deal)
        self.assertEqual(deal.trade_date, "2026-10-24")
        self.assertEqual(deal.quantity, 500000)
        self.assertEqual(deal.price, 2750.00)
        self.assertIsNone(deal.deal_value_reported)
        self.assertEqual(deal.deal_value_calculated, 1375000000.0)
        self.assertEqual(deal.deal_value_effective, 1375000000.0)
        self.assertTrue(deal.is_value_calculated)

    def test_normalize_single_record_with_reported_value(self):
        row_with_val = {
            "Date": "24/10/2026",
            "Symbol": "500180",
            "Security Name": "HDFC BANK LTD",
            "Client Name": "MORGAN STANLEY",
            "Buy/Sell": "B",
            "Quantity": "1000000",
            "Price": "1680.00",
            "Value": "1680000000"
        }
        deal, warnings = normalize_single_record(row_with_val, exchange_hint="BSE", deal_type_hint="BLOCK")
        self.assertIsNotNone(deal)
        self.assertFalse(deal.is_value_calculated)
        self.assertEqual(deal.deal_value_reported, 1680000000.0)

    def test_invalid_record_rejection(self):
        # Missing client
        bad_row = {"Date": "24-OCT-2026", "Symbol": "TCS", "Buy/Sell": "BUY", "Quantity": "100", "Price": "100"}
        deal, _ = normalize_single_record(bad_row)
        self.assertIsNone(deal)

        # Negative quantity
        bad_qty = {"Date": "24-OCT-2026", "Client Name": "TEST", "Symbol": "TCS", "Buy/Sell": "BUY", "Quantity": "-100", "Price": "100"}
        deal2, _ = normalize_single_record(bad_qty)
        self.assertIsNone(deal2)

if __name__ == "__main__":
    unittest.main()
