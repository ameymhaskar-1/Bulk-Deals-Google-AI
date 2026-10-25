"""
DealScope India — NSE & BSE Bulk and Block Deals Intelligence Platform
Master Streamlit Application
"""
import streamlit as st
from datetime import date, datetime
import os
from pathlib import Path

from config import get_last_n_trading_days, NSE_BULK_CSV_URL, NSE_BLOCK_CSV_URL, BSE_BULK_URL
from database import Database
from data_normalizer import normalize_single_record
from nse_client import NSEClient
from bse_client import BSEClient

# Page configuration
st.set_page_config(
    page_title="DealScope India — NSE & BSE Bulk/Block Deals Intelligence",
    page_icon="📈",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Initialize database
db = Database()

def seed_sample_data_if_empty():
    deals = db.query_deals()
    if not deals:
        sample_nse = Path("sample_data/nse_deals_sample.csv")
        sample_bse = Path("sample_data/bse_deals_sample.csv")
        records = []
        if sample_nse.exists():
            with open(sample_nse, "r", encoding="utf-8") as f:
                cl = NSEClient()
                recs, _ = cl.parse_nse_csv(f.read(), "BULK", "sample_data/nse_deals_sample.csv")
                records.extend(recs)
        if sample_bse.exists():
            with open(sample_bse, "r", encoding="utf-8") as f:
                cl = BSEClient()
                recs, _ = cl.parse_bse_csv(f.read(), "BULK", "sample_data/bse_deals_sample.csv")
                records.extend(recs)
        if records:
            db.insert_deals(records)
            db.log_retrieval("SEED_SAMPLE_DATA", "SUCCESS", len(records), "Initial seed data loaded.")

seed_sample_data_if_empty()

# Custom Styling (Restrained Navy/Blue Palette, Clean Light Theme)
st.markdown("""
<style>
    .main { background-color: #F8FAFC; }
    h1, h2, h3 { color: #0F172A; font-family: 'Inter', -apple-system, sans-serif; font-weight: 700; }
    .stMetric {
        background: #FFFFFF;
        padding: 16px;
        border-radius: 8px;
        border: 1px solid #E2E8F0;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .disclaimer-box {
        background-color: #EFF6FF;
        border-left: 4px solid #3B82F6;
        padding: 12px 16px;
        border-radius: 4px;
        font-size: 0.85rem;
        color: #1E3A8A;
        margin-bottom: 20px;
    }
</style>
""", unsafe_allow_html=True)

# Sidebar
st.sidebar.title("DealScope India")
st.sidebar.caption("NSE & BSE Disclosures Intelligence")

st.sidebar.markdown("---")
st.sidebar.subheader("Official Source Status")
st.sidebar.info("""
**NSE Disclosures**: Primary: nseindia.com (Akamai protected)  
**BSE Disclosures**: Primary: bseindia.com  
**Fallback Mode**: Verified Official CSV Ingestion
""")

latest_logs = db.get_latest_retrieval_logs(limit=1)
if latest_logs:
    log = latest_logs[0]
    st.sidebar.caption(f"Last Ingestion: {log['timestamp'][:19]} ({log['status']})")

st.sidebar.markdown("---")

st.sidebar.subheader("Manual Data Ingestion")

uploaded_file = st.sidebar.file_uploader(
    "Upload Official Exchange CSV",
    type=["csv"],
    key="deal_upload",
)

if uploaded_file is not None:
    filename = uploaded_file.name.lower()

    # Infer exchange and deal type from the filename.
    if "nse" in filename or "bulk-deals" in filename or "block-deals" in filename:
        exchange = "NSE"
    elif "bse" in filename:
        exchange = "BSE"
    else:
        exchange = st.sidebar.selectbox(
            "Select exchange",
            ["NSE", "BSE"],
            key="upload_exchange",
        )

    if "block" in filename:
        deal_type = "BLOCK"
    elif "bulk" in filename:
        deal_type = "BULK"
    else:
        deal_type = st.sidebar.selectbox(
            "Select deal type",
            ["BULK", "BLOCK"],
            key="upload_deal_type",
        )

    st.sidebar.caption(
        f"Detected source: {exchange} | Deal type: {deal_type}"
    )

    if st.sidebar.button("Import deals", type="primary"):
        content = uploaded_file.getvalue().decode(
            "utf-8-sig", errors="replace"
        )

        try:
            if exchange == "NSE":
                client = NSEClient()
                recs, msg = client.parse_nse_csv(
                    content, deal_type, uploaded_file.name
                )
            else:
                client = BSEClient()
                recs, msg = client.parse_bse_csv(
                    content, deal_type, uploaded_file.name
                )

            if recs:
                ins, dup, errs = db.insert_deals(recs)

                st.sidebar.success(
                    f"{exchange} {deal_type}: "
                    f"{len(recs):,} parsed; "
                    f"{ins:,} inserted; "
                    f"{dup:,} duplicates."
                )

                if errs:
                    st.sidebar.warning(
                        f"Database reported {len(errs)} errors."
                    )

                db.log_retrieval(
                    f"UPLOAD_{exchange}_{deal_type}_{uploaded_file.name}",
                    "SUCCESS",
                    ins,
                    f"Parsed: {len(recs)}; duplicates: {dup}",
                )
            else:
                st.sidebar.error(
                    f"{exchange} parser failed: {msg}"
                )

        except Exception as exc:
            st.sidebar.error(
                f"Import failed: {type(exc).__name__}: {exc}"
            )
# Landing Page / Router Overview
st.title("DealScope India — Disclosures Intelligence")
st.markdown("""
<div class="disclaimer-box">
<strong>Research & Compliance Notice:</strong> This is an empirical market surveillance and monitoring tool tracking public regulatory disclosures under SEBI bulk and block deal frameworks. Disclosed trades do not imply bullish or bearish intent, nor do they represent an investor's net portfolio position.
</div>
""", unsafe_allow_html=True)

all_deals = db.query_deals()
kpis = {
    "total": len(all_deals),
    "companies": len(set(d["symbol"] for d in all_deals)),
    "clients": len(set(d["client_name"] for d in all_deals)),
    "value_cr": sum(d["deal_value_effective"] for d in all_deals) / 10000000.0,
}

c1, c2, c3, c4 = st.columns(4)
c1.metric("Total Disclosed Trades", f"{kpis['total']:,}")
c2.metric("Unique Equities", f"{kpis['companies']:,}")
c3.metric("Disclosed Institutional Clients", f"{kpis['clients']:,}")
c4.metric("Total Traded Value", f"₹{kpis['value_cr']:,.2f} Cr")

st.markdown("### Quick Navigation")
st.markdown("""
Use the sidebar pages to explore detailed analytics:
- **1. Market Overview**: Macro KPI cards, volume distribution, exchange share, top active companies.
- **2. Deals Explorer**: Granular filtering across trade dates, exchanges, symbols, and trade values.
- **3. Company Intelligence**: Chronological deal histories and client participation per scrip.
- **4. Client Intelligence**: Institutional investor tracking and portfolio dispersion.
- **5. Price Reactions**: T+1, T+5, and T+20 post-disclosure price impact and benchmark comparisons.
- **6. Excel Reports**: Complete 10-sheet audit-grade financial workbook generation.
""")
