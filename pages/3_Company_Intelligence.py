"""
Page 3: Company Intelligence — Deep-Dive per Equity
"""
import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

from database import Database
from analytics import get_company_profile
from security_mapping import resolve_security
from price_history import fetch_historical_prices

st.set_page_config(page_title="Company Intelligence — DealScope India", layout="wide")
st.title("Company Disclosures Intelligence")

st.markdown("""
<div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 10px 14px; border-radius: 4px; font-size: 0.85rem; color: #92400E; margin-bottom: 16px;">
<strong>Surveillance Notice:</strong> Bulk and block disclosures represent single-day gross traded quantities under SEBI criteria. They do not constitute the total holdings, net position, or beneficial ownership of any investor or promoter.
</div>
""", unsafe_allow_html=True)

db = Database()
symbols = db.get_all_symbols()
symbol_list = [s["symbol"] for s in symbols]

if not symbol_list:
    st.info("No companies found in database. Ingest official CSV data to proceed.")
    st.stop()

selected_symbol = st.selectbox("Select Security Symbol / Company", symbol_list)

all_deals = db.query_deals()
profile = get_company_profile(all_deals, selected_symbol)
kpis = profile["kpis"]

c1, c2, c3, c4 = st.columns(4)
c1.metric("Total Deals", kpis["total_deals"])
c2.metric("Total Value (₹ Cr)", f"₹{kpis['total_effective_value'] / 1e7:,.2f} Cr")
c3.metric("Buy Deals / Vol", f"{kpis['buy_deals_count']} ({kpis['buy_volume']:,})")
c4.metric("Sell Deals / Vol", f"{kpis['sell_deals_count']} ({kpis['sell_volume']:,})")

# Stock Price History & Deal Marker Chart
st.subheader("Historical Stock Price & Disclosure Markers")
ticker, conf, isin = resolve_security(selected_symbol, profile["company_name"])
st.caption(f"Security: **{profile['company_name']}** | Symbol: **{selected_symbol}** | Mapped Ticker: **{ticker}** (Confidence: {conf})")

if profile["deals"]:
    latest_deal_date = profile["deals"][0]["trade_date"]
    price_series, source_note = fetch_historical_prices(ticker or selected_symbol, latest_deal_date)
    st.caption(f"Price Source: {source_note}")

    if price_series:
        df_px = pd.DataFrame(price_series)
        fig = go.Figure()
        fig.add_trace(go.Scatter(
            x=df_px["date"], y=df_px["close"], mode="lines", name="Closing Price (₹)",
            line=dict(color="#1E3A8A", width=2)
        ))

        # Add markers for each deal date
        for d in profile["deals"]:
            d_date = d["trade_date"]
            d_side = d["buy_sell"]
            color = "#10B981" if d_side == "BUY" else "#EF4444"
            fig.add_trace(go.Scatter(
                x=[d_date], y=[d["price"]], mode="markers",
                marker=dict(size=12, color=color, symbol="diamond"),
                name=f"{d_side} @ ₹{d['price']}",
                text=f"{d['client_name']}: {d['quantity']:,} shares"
            ))

        fig.update_layout(
            title=f"{selected_symbol} Price Trajectory with Disclosure Markers",
            xaxis_title="Trading Date", yaxis_title="Price (INR)",
            hovermode="x unified"
        )
        st.plotly_chart(fig, use_container_width=True)

# Disclosed Transactions Table
st.subheader("Disclosed Transactions")
if profile["deals"]:
    df_deals = pd.DataFrame(profile["deals"])
    df_deals["deal_value_cr"] = df_deals["deal_value_effective"] / 1e7
    st.dataframe(
        df_deals[["trade_date", "exchange", "deal_type", "client_name", "buy_sell", "quantity", "price", "deal_value_cr", "data_source_type"]],
        column_config={
            "trade_date": "Date",
            "exchange": "Exchange",
            "deal_type": "Type",
            "client_name": "Disclosed Client",
            "buy_sell": "Side",
            "quantity": st.column_config.NumberColumn("Shares", format="%d"),
            "price": st.column_config.NumberColumn("Price (₹)", format="₹%.2f"),
            "deal_value_cr": st.column_config.NumberColumn("Value (₹ Cr)", format="₹%.2f"),
        },
        use_container_width=True
    )
