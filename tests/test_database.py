"""
Automated unit tests for SQLite database operations and duplicate detection.
"""
import os
import tempfile
import unittest
from database import Database
from data_normalizer import NormalizedDeal

class TestDatabase(unittest.TestCase):
    def setUp(self):
        self.temp_db = tempfile.NamedTemporaryFile(delete=False)
        self.temp_db.close()
        self.db = Database(db_path=self.temp_db.name)

    def tearDown(self):
        if os.path.exists(self.temp_db.name):
            os.remove(self.temp_db.name)

    def test_insert_and_duplicate_detection(self):
        deal1 = NormalizedDeal(
            id="hash1", trade_date="2026-10-24", exchange="NSE", deal_type="BULK",
            symbol="TCS", company_name="Tata Consultancy Services", isin="INE467B01029",
            client_name="LIC", buy_sell="BUY", quantity=50000, price=4100.0,
            deal_value_reported=None, deal_value_calculated=205000000.0, deal_value_effective=205000000.0,
            is_value_calculated=True, currency="INR", source_url="test://1", retrieval_timestamp="2026-10-24T10:00:00Z",
            data_source_type="OFFICIAL_CSV_UPLOAD", raw_record="{}", validation_flags="VALID"
        )
        
        # First insert
        ins, dup, errs = self.db.insert_deals([deal1])
        self.assertEqual(ins, 1)
        self.assertEqual(dup, 0)
        self.assertEqual(len(errs), 0)

        # Re-inserting the same deal should increment duplicate count without crashing
        ins2, dup2, errs2 = self.db.insert_deals([deal1])
        self.assertEqual(ins2, 0)
        self.assertEqual(dup2, 1)

        # Query check
        results = self.db.query_deals(symbol="TCS")
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["client_name"], "LIC")

    def test_retrieval_logging(self):
        self.db.log_retrieval("TEST_SOURCE", "SUCCESS", 10, "10 deals ingested")
        logs = self.db.get_latest_retrieval_logs(limit=5)
        self.assertEqual(len(logs), 1)
        self.assertEqual(logs[0]["source_name"], "TEST_SOURCE")
        self.assertEqual(logs[0]["records_count"], 10)

if __name__ == "__main__":
    unittest.main()
