"""
Page 6: Excel Reports — Multi-Sheet Institutional Workbook Export
"""
import streamlit as st
from datetime import date, timedelta
import io

from database import Database
from config import get_last_n_trading_days
from excel_export import create_excel_report
from security_mapping import resolve_security
from price_history import fetch_historical_prices, calculate_price_reactions

st.set_page_config(page_title="Excel Reports — DealScope India", layout="wide")
st.title("Institutional Excel Reports")

st.markdown("""
Generate an audit-grade, multi-sheet Excel workbook (`.xlsx`) conforming to SEBI bulk and block deal disclosure standards.
The workbook includes 10 formatted worksheets with frozen headers, automatic column fits, formulas, and data provenance audit trails.
""")

db = Database()

col1, col2 = st.columns(2)
with col1:
    time_filter = st.selectbox(
        "Reporting Time Window:",
        ["All Stored Records", "Last 7 Trading Days", "Last 30 Calendar Days"]
    )
with col2:
    exchange_filter = st.selectbox("Exchange Scope:", ["ALL", "NSE", "BSE"])

today = date.today()
start_date = None
if time_filter == "Last 7 Trading Days":
    trading_days = get_last_n_trading_days(7, ref_date=today)
    start_date = trading_days[-1].isoformat()
elif time_filter == "Last 30 Calendar Days":
    start_date = (today - timedelta(days=30)).isoformat()

deals = db.query_deals(start_date=start_date, exchange=exchange_filter)

st.info(f"Target dataset: **{len(deals)}** deal records selected for workbook generation.")

# Pre-calculate price reactions for top 5 deals to populate sheet 9
price_reactions_data = []
for d in deals[:10]:
    ticker, conf, _ = resolve_security(d["symbol"], d["company_name"])
    if ticker:
        ps, _ = fetch_historical_prices(ticker, d["trade_date"])
        react = calculate_price_reactions(ps, d["trade_date"], d["price"])
        react["symbol"] = d["symbol"]
        react["deal_price"] = d["price"]
        price_reactions_data.append(react)

st.subheader("Workbook Worksheets Included (10 Sheets)")
st.markdown("""
1. **Executive Dashboard**: Executive KPI cards, total traded values, and volume breakdown.
2. **Raw Deals**: All disclosed records with composite key hash IDs and provenance flags.
3. **Bulk Deals**: Verified trades exceeding 0.5% of company equity.
4. **Block Deals**: Verified block window trades meeting value/quantity thresholds.
5. **Company Summary**: Aggregate trade counts, total turnover, and buy/sell totals by scrip.
6. **Client Summary**: Institutional investor activity, company count, and volume.
7. **Daily Summary**: Chronological daily turnover and transaction volume.
8. **Exchange Summary**: Comparative breakdown between NSE and BSE market share.
9. **Price Reactions**: T+1, T+5, and T+20 post-disclosure price returns.
10. **Data Quality**: Data hygiene checks, calculated value flags, and schema audit logs.
""")

if st.button("Generate Complete Excel Workbook (.xlsx)", type="primary"):
    with st.spinner("Compiling multi-sheet financial model..."):
        excel_buf = create_excel_report(deals, price_reactions=price_reactions_data)
        st.success("Excel report compiled successfully!")
        st.download_button(
            label="Download DealScope_India_Intelligence_Report.xlsx",
            data=excel_buf,
            file_name=f"DealScope_India_{date.today().isoformat()}.xlsx",
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
