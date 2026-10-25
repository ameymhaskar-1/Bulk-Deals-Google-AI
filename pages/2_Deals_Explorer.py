"""
Page 2: Deals Explorer — Search, Filter, and Export
"""
import streamlit as st
import pandas as pd
import io

from database import Database

st.set_page_config(page_title="Deals Explorer — DealScope India", layout="wide")
st.title("Deals Explorer")

db = Database()

# Filters in Expander or Sidebar
with st.expander("Filter Disclosures", expanded=True):
    f_c1, f_c2, f_c3, f_c4 = st.columns(4)
    with f_c1:
        exchange_sel = st.selectbox("Exchange", ["ALL", "NSE", "BSE"])
        deal_type_sel = st.selectbox("Deal Category", ["ALL", "BULK", "BLOCK"])
    with f_c2:
        buy_sell_sel = st.selectbox("Transaction Side", ["ALL", "BUY", "SELL"])
        symbol_search = st.text_input("Symbol or Company Name", placeholder="e.g. HDFCBANK or Reliance")
    with f_c3:
        client_search = st.text_input("Client / Investor Name", placeholder="e.g. Vanguard or LIC")
        min_qty = st.number_input("Minimum Quantity", min_value=0, value=0, step=50000)
    with f_c4:
        min_val = st.number_input("Minimum Deal Value (₹)", min_value=0.0, value=0.0, step=10000000.0)
        reset = st.button("Reset All Filters")

if reset:
    st.experimental_rerun() if hasattr(st, "experimental_rerun") else st.rerun()

deals = db.query_deals(
    exchange=exchange_sel,
    deal_type=deal_type_sel,
    buy_sell=buy_sell_sel,
    symbol=symbol_search if symbol_search else None,
    client_name=client_search if client_search else None,
    min_quantity=min_qty if min_qty > 0 else None,
    min_deal_value=min_val if min_val > 0 else None,
)

st.caption(f"Displaying **{len(deals)}** verified transactions matching filter criteria.")

if deals:
    df = pd.DataFrame(deals)
    df["deal_value_cr"] = df["deal_value_effective"] / 1e7
    df["is_calc_badge"] = df["is_value_calculated"].apply(lambda x: "CALCULATED" if x else "REPORTED")

    display_cols = [
        "trade_date", "exchange", "deal_type", "symbol", "company_name",
        "client_name", "buy_sell", "quantity", "price", "deal_value_cr",
        "is_calc_badge", "data_source_type"
    ]

    st.dataframe(
        df[display_cols],
        column_config={
            "trade_date": "Date",
            "exchange": "Exch",
            "deal_type": "Type",
            "symbol": "Symbol",
            "company_name": "Company Name",
            "client_name": "Disclosed Client",
            "buy_sell": "Side",
            "quantity": st.column_config.NumberColumn("Shares", format="%d"),
            "price": st.column_config.NumberColumn("Price (₹)", format="₹%.2f"),
            "deal_value_cr": st.column_config.NumberColumn("Value (₹ Cr)", format="₹%.2f"),
            "is_calc_badge": "Value Provenance",
            "data_source_type": "Source Type"
        },
        use_container_width=True,
        hide_index=True
    )

    # Export filtered records
    csv_buf = io.StringIO()
    df.to_csv(csv_buf, index=False)
    st.download_button(
        label="Download Filtered Deals (CSV)",
        data=csv_buf.getvalue(),
        file_name="dealscope_filtered_deals.csv",
        mime="text/csv"
    )
else:
    st.warning("No records matched the filter criteria.")
