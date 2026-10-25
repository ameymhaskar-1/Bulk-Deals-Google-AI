"""
Page 4: Client Intelligence — Institutional Investor Surveillance
"""
import streamlit as st
import pandas as pd
import plotly.express as px

from database import Database
from analytics import get_client_profile

st.set_page_config(page_title="Client Intelligence — DealScope India", layout="wide")
st.title("Client & Investor Intelligence")

st.markdown("""
<div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 10px 14px; border-radius: 4px; font-size: 0.85rem; color: #92400E; margin-bottom: 16px;">
<strong>Investor Analysis Notice:</strong> Disclosed transactions represent gross trades on specific execution dates. Client matching is conservative; similar names are not automatically merged. Disclosures do not reflect overall portfolio holdings or investment motives.
</div>
""", unsafe_allow_html=True)

db = Database()
clients = db.get_all_clients()

if not clients:
    st.info("No client records found. Ingest exchange disclosures first.")
    st.stop()

selected_client = st.selectbox("Select Disclosed Client / Investor Name", clients)

all_deals = db.query_deals()
profile = get_client_profile(all_deals, selected_client)
kpis = profile["kpis"]

c1, c2, c3, c4 = st.columns(4)
c1.metric("Total Trades Disclosed", kpis["total_deals"])
c2.metric("Total Traded Value (₹ Cr)", f"₹{kpis['total_effective_value'] / 1e7:,.2f} Cr")
c3.metric("Buy Deals / Vol", f"{kpis['buy_deals_count']} ({kpis['buy_volume']:,})")
c4.metric("Sell Deals / Vol", f"{kpis['sell_deals_count']} ({kpis['sell_volume']:,})")

col_a, col_b = st.columns(2)
with col_a:
    st.subheader("Traded Equities")
    if profile["traded_companies"]:
        df_comp = pd.DataFrame(profile["traded_companies"])
        st.dataframe(
            df_comp,
            column_config={
                "symbol": "Symbol",
                "company_name": "Company Name",
                "deal_count": "Transactions",
                "total_value": st.column_config.NumberColumn("Total Value (₹)", format="₹%,.2f"),
            },
            use_container_width=True
        )

with col_b:
    st.subheader("Exchange & Deal Category Breakdown")
    ex_dist = profile["exchange_distribution"]
    if ex_dist:
        fig_ex = px.bar(
            pd.DataFrame(ex_dist), x="exchange", y="total_value", title="Value by Exchange (INR)",
            color="exchange", color_discrete_map={"NSE": "#1E40AF", "BSE": "#F59E0B"}
        )
        st.plotly_chart(fig_ex, use_container_width=True)

st.subheader("Transaction History")
if profile["deals"]:
    df_deals = pd.DataFrame(profile["deals"])
    df_deals["deal_value_cr"] = df_deals["deal_value_effective"] / 1e7
    st.dataframe(
        df_deals[["trade_date", "exchange", "deal_type", "symbol", "company_name", "buy_sell", "quantity", "price", "deal_value_cr"]],
        column_config={
            "trade_date": "Date",
            "exchange": "Exchange",
            "deal_type": "Category",
            "symbol": "Symbol",
            "company_name": "Company",
            "buy_sell": "Side",
            "quantity": st.column_config.NumberColumn("Shares", format="%d"),
            "price": st.column_config.NumberColumn("Price (₹)", format="₹%.2f"),
            "deal_value_cr": st.column_config.NumberColumn("Value (₹ Cr)", format="₹%.2f"),
        },
        use_container_width=True
    )
