"""
DealScope India — Database Management Module
Handles SQLite schema creation, transactional storage, duplicate detection, and audit logging.
"""
from dataclasses import asdict
from datetime import datetime
import json
from pathlib import Path
import sqlite3
from typing import Any, Dict, List, Optional, Tuple

from config import DATABASE_PATH
from data_normalizer import NormalizedDeal

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS deals (
    id TEXT PRIMARY KEY,
    trade_date TEXT NOT NULL,
    exchange TEXT NOT NULL,
    deal_type TEXT NOT NULL,
    symbol TEXT NOT NULL,
    company_name TEXT NOT NULL,
    isin TEXT,
    client_name TEXT NOT NULL,
    buy_sell TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    deal_value_reported REAL,
    deal_value_calculated REAL NOT NULL,
    deal_value_effective REAL NOT NULL,
    is_value_calculated INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    source_url TEXT NOT NULL,
    retrieval_timestamp TEXT NOT NULL,
    data_source_type TEXT NOT NULL,
    raw_record TEXT NOT NULL,
    validation_flags TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_deals_trade_date ON deals(trade_date);
CREATE INDEX IF NOT EXISTS idx_deals_symbol ON deals(symbol);
CREATE INDEX IF NOT EXISTS idx_deals_client ON deals(client_name);
CREATE INDEX IF NOT EXISTS idx_deals_exchange ON deals(exchange);
CREATE INDEX IF NOT EXISTS idx_deals_deal_type ON deals(deal_type);

CREATE TABLE IF NOT EXISTS retrieval_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    source_name TEXT NOT NULL,
    status TEXT NOT NULL,
    records_count INTEGER NOT NULL DEFAULT 0,
    message TEXT
);
"""

class Database:
    def __init__(self, db_path: str = DATABASE_PATH):
        self.db_path = db_path
        self._init_db()

    def get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=10.0)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        with self.get_connection() as conn:
            conn.executescript(SCHEMA_SQL)

    def insert_deals(self, deals: List[NormalizedDeal]) -> Tuple[int, int, List[str]]:
        """
        Transactional insert of normalized deals.
        Returns: (inserted_count, duplicate_count, error_messages)
        """
        if not deals:
            return 0, 0, []

        inserted = 0
        duplicates = 0
        errors = []

        with self.get_connection() as conn:
            cursor = conn.cursor()
            for deal in deals:
                try:
                    cursor.execute("""
                        INSERT INTO deals (
                            id, trade_date, exchange, deal_type, symbol, company_name,
                            isin, client_name, buy_sell, quantity, price,
                            deal_value_reported, deal_value_calculated, deal_value_effective,
                            is_value_calculated, currency, source_url, retrieval_timestamp,
                            data_source_type, raw_record, validation_flags
                        ) VALUES (
                            ?, ?, ?, ?, ?, ?,
                            ?, ?, ?, ?, ?,
                            ?, ?, ?,
                            ?, ?, ?, ?,
                            ?, ?, ?
                        )
                    """, (
                        deal.id, deal.trade_date, deal.exchange, deal.deal_type, deal.symbol, deal.company_name,
                        deal.isin, deal.client_name, deal.buy_sell, deal.quantity, deal.price,
                        deal.deal_value_reported, deal.deal_value_calculated, deal.deal_value_effective,
                        1 if deal.is_value_calculated else 0, deal.currency, deal.source_url, deal.retrieval_timestamp,
                        deal.data_source_type, deal.raw_record, deal.validation_flags
                    ))
                    inserted += 1
                except sqlite3.IntegrityError:
                    # Duplicate record based on primary key hash
                    duplicates += 1
                except Exception as e:
                    errors.append(f"Error inserting record {deal.symbol}/{deal.client_name}: {str(e)}")
            conn.commit()

        return inserted, duplicates, errors

    def log_retrieval(self, source_name: str, status: str, records_count: int = 0, message: str = "") -> None:
        with self.get_connection() as conn:
            conn.execute(
                "INSERT INTO retrieval_logs (timestamp, source_name, status, records_count, message) VALUES (?, ?, ?, ?, ?)",
                (datetime.utcnow().isoformat() + "Z", source_name, status, records_count, message)
            )
            conn.commit()

    def get_latest_retrieval_logs(self, limit: int = 20) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            rows = conn.execute("SELECT * FROM retrieval_logs ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
            return [dict(r) for r in rows]

    def query_deals(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        exchange: Optional[str] = None,
        deal_type: Optional[str] = None,
        symbol: Optional[str] = None,
        client_name: Optional[str] = None,
        buy_sell: Optional[str] = None,
        min_quantity: Optional[int] = None,
        min_deal_value: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        query = "SELECT * FROM deals WHERE 1=1"
        params = []

        if start_date:
            query += " AND trade_date >= ?"
            params.append(start_date)
        if end_date:
            query += " AND trade_date <= ?"
            params.append(end_date)
        if exchange and exchange != "ALL":
            query += " AND exchange = ?"
            params.append(exchange.upper())
        if deal_type and deal_type != "ALL":
            query += " AND deal_type = ?"
            params.append(deal_type.upper())
        if symbol:
            query += " AND (symbol LIKE ? OR company_name LIKE ?)"
            params.append(f"%{symbol.strip()}%")
            params.append(f"%{symbol.strip()}%")
        if client_name:
            query += " AND client_name LIKE ?"
            params.append(f"%{client_name.strip()}%")
        if buy_sell and buy_sell != "ALL":
            query += " AND buy_sell = ?"
            params.append(buy_sell.upper())
        if min_quantity is not None and min_quantity > 0:
            query += " AND quantity >= ?"
            params.append(min_quantity)
        if min_deal_value is not None and min_deal_value > 0:
            query += " AND deal_value_effective >= ?"
            params.append(min_deal_value)

        query += " ORDER BY trade_date DESC, deal_value_effective DESC"

        with self.get_connection() as conn:
            rows = conn.execute(query, tuple(params)).fetchall()
            return [dict(r) for r in rows]

    def get_all_symbols(self) -> List[Dict[str, str]]:
        with self.get_connection() as conn:
            rows = conn.execute("SELECT DISTINCT symbol, company_name FROM deals ORDER BY symbol ASC").fetchall()
            return [{"symbol": r["symbol"], "company_name": r["company_name"]} for r in rows]

    def get_all_clients(self) -> List[str]:
        with self.get_connection() as conn:
            rows = conn.execute("SELECT DISTINCT client_name FROM deals ORDER BY client_name ASC").fetchall()
            return [r["client_name"] for r in rows]
