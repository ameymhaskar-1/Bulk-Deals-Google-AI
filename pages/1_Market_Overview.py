"""
Page 1: Market Overview — Macro Intelligence Dashboard
"""
import streamlit as st
import pandas as pd
import plotly.express as px
from datetime import date, timedelta

from config import get_last_n_trading_days
from database import Database
from analytics import (
    compute_market_kpis,
    aggregate_by_date,
    aggregate_by_deal_type,
    aggregate_by_exchange,
    get_top_companies,
    get_top_clients,
)

st.set_page_config(page_title="Market Overview — DealScope India", layout="wide")
st.title("Market Overview — Bulk & Block Disclosures")

db = Database()

# Date filter selector
time_horizon = st.radio(
    "Select Reporting Window:",
    ["All Historical Records", "Last 7 Trading Days", "Last 30 Calendar Days"],
    horizontal=True
)

today = date.today()
start_date = None
if time_horizon == "Last 7 Trading Days":
    trading_days = get_last_n_trading_days(7, ref_date=today)
    start_date = trading_days[-1].isoformat()
elif time_horizon == "Last 30 Calendar Days":
    start_date = (today - timedelta(days=30)).isoformat()

deals = db.query_deals(start_date=start_date)
kpis = compute_market_kpis(deals)

# KPI Cards
c1, c2, c3, c4 = st.columns(4)
c1.metric("Total Deals", f"{kpis['total_deals']:,}")
c2.metric("Unique Companies", f"{kpis['unique_companies']:,}")
c3.metric("Unique Disclosed Clients", f"{kpis['unique_clients']:,}")
c4.metric("Total Effective Value", f"₹{kpis['total_effective_value'] / 1e7:,.2f} Cr")

c5, c6, c7, c8 = st.columns(4)
c5.metric("Reported Value", f"₹{kpis['total_reported_value'] / 1e7:,.2f} Cr")
c6.metric("Calculated Value (Qty × Px)", f"₹{kpis['total_calculated_value'] / 1e7:,.2f} Cr")
c7.metric("Buy-Side Deals", f"{kpis['buy_deals_count']:,} (Vol: {kpis['buy_volume']:,})")
c8.metric("Sell-Side Deals", f"{kpis['sell_deals_count']:,} (Vol: {kpis['sell_volume']:,})")

st.markdown("---")

col_l, col_r = st.columns(2)

with col_l:
    st.subheader("Disclosed Deal Value Over Time")
    daily = aggregate_by_date(deals)
    if daily:
        df_daily = pd.DataFrame(daily)
        fig_daily = px.bar(
            df_daily, x="date", y=["buy_value", "sell_value"],
            title="Buy vs Sell Value by Trade Date (INR)",
            labels={"value": "Value (INR)", "date": "Trade Date", "variable": "Side"},
            color_discrete_map={"buy_value": "#10B981", "sell_value": "#EF4444"}
        )
        st.plotly_chart(fig_daily, use_container_width=True)
    else:
        st.info("No records in selected period.")

with col_r:
    st.subheader("Exchange & Deal Category Mix")
    col_pie1, col_pie2 = st.columns(2)
    with col_pie1:
        ex_agg = aggregate_by_exchange(deals)
        if ex_agg:
            fig_ex = px.pie(
                ex_agg, names="exchange", values="total_value", title="NSE vs BSE Share",
                color_discrete_sequence=["#1E40AF", "#F59E0B"]
            )
            st.plotly_chart(fig_ex, use_container_width=True)
    with col_pie2:
        dt_agg = aggregate_by_deal_type(deals)
        if dt_agg:
            fig_dt = px.pie(
                dt_agg, names="deal_type", values="total_value", title="Bulk vs Block Deal Value",
                color_discrete_sequence=["#3B82F6", "#8B5CF6"]
            )
            st.plotly_chart(fig_dt, use_container_width=True)

st.markdown("---")
st.subheader("Top Equities by Disclosed Deal Value")
top_c = get_top_companies(deals, top_n=10)
if top_c:
    df_top_c = pd.DataFrame(top_c)
    df_top_c["total_value_cr"] = df_top_c["total_value"] / 1e7
    df_top_c["buy_value_cr"] = df_top_c["buy_value"] / 1e7
    df_top_c["sell_value_cr"] = df_top_c["sell_value"] / 1e7
    st.dataframe(
        df_top_c[["symbol", "company_name", "deal_count", "total_value_cr", "buy_value_cr", "sell_value_cr", "volume"]],
        column_config={
            "symbol": "Symbol",
            "company_name": "Company Name",
            "deal_count": "Deals Count",
            "total_value_cr": st.column_config.NumberColumn("Total Value (₹ Cr)", format="₹%.2f"),
            "buy_value_cr": st.column_config.NumberColumn("Buy Value (₹ Cr)", format="₹%.2f"),
            "sell_value_cr": st.column_config.NumberColumn("Sell Value (₹ Cr)", format="₹%.2f"),
            "volume": st.column_config.NumberColumn("Total Shares", format="%d"),
        },
        use_container_width=True
    )

st.subheader("Top Institutional Clients by Trade Activity")
top_cl = get_top_clients(deals, top_n=10)
if top_cl:
    df_top_cl = pd.DataFrame(top_cl)
    df_top_cl["total_value_cr"] = df_top_cl["total_value"] / 1e7
    st.dataframe(
        df_top_cl[["client_name", "deal_count", "buy_count", "sell_count", "unique_companies_count", "total_value_cr", "volume"]],
        column_config={
            "client_name": "Client Name",
            "deal_count": "Trades Count",
            "buy_count": "Buy Trades",
            "sell_count": "Sell Trades",
            "unique_companies_count": "Unique Stocks",
            "total_value_cr": st.column_config.NumberColumn("Total Value (₹ Cr)", format="₹%.2f"),
            "volume": st.column_config.NumberColumn("Total Shares", format="%d"),
        },
        use_container_width=True
    )
