"""
Page 5: Price Reaction Analysis — Post-Disclosure Impact
"""
import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

from database import Database
from security_mapping import resolve_security, SECURITY_DIRECTORY
from price_history import fetch_historical_prices, calculate_price_reactions

st.set_page_config(page_title="Price Reactions — DealScope India", layout="wide")
st.title("Post-Disclosure Price Reaction Analysis")

st.markdown("""
<div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px 16px; border-radius: 4px; font-size: 0.85rem; color: #92400E; margin-bottom: 20px;">
<strong>Quantitative & Risk Methodology:</strong> Price reaction metrics evaluate equity returns over subsequent Indian exchange trading sessions (T+1, T+5, T+20). These are descriptive historical observations and <strong>do not imply causal impact, alpha generation, or predictive efficacy</strong>.
</div>
""", unsafe_allow_html=True)

db = Database()
deals = db.query_deals()

if not deals:
    st.info("No deal disclosures available for price reaction analysis.")
    st.stop()

# Select a specific deal or filter by symbol
symbols = sorted(list(set(d["symbol"] for d in deals)))
selected_symbol = st.selectbox("Select Security Symbol", symbols)

symbol_deals = [d for d in deals if d["symbol"] == selected_symbol]
st.caption(f"Found {len(symbol_deals)} disclosure(s) for **{selected_symbol}**.")

# Deal selector
deal_options = [
    f"{d['trade_date']} | {d['buy_sell']} {d['quantity']:,} shs @ ₹{d['price']} ({d['client_name']})"
    for d in symbol_deals
]
selected_idx = st.selectbox("Select Specific Transaction", range(len(deal_options)), format_func=lambda i: deal_options[i])
deal = symbol_deals[selected_idx]

# Security Resolution
comp_name = deal["company_name"]
mapped_ticker, confidence, isin = resolve_security(deal["symbol"], comp_name)

col_meta1, col_meta2 = st.columns(2)
with col_meta1:
    st.info(f"**Disclosed Deal**: {deal['deal_type']} on {deal['exchange']} | Trade Date: {deal['trade_date']}")
with col_meta2:
    st.info(f"**Security Mapping**: Ticker: `{mapped_ticker}` | Match Confidence: `{confidence}` | ISIN: `{isin or 'N/A'}`")

# Calculate Reaction Metrics
price_series, source_note = fetch_historical_prices(mapped_ticker or deal["symbol"], deal["trade_date"])
reaction = calculate_price_reactions(price_series, deal["trade_date"], deal["price"])

st.caption(f"Historical Price Source: {source_note}")

# Metrics Display
c1, c2, c3, c4 = st.columns(4)
c1.metric("Execution Price vs T0 Close", f"₹{deal['price']}", f"{reaction['premium_to_close_pct']}% vs T0" if reaction['premium_to_close_pct'] is not None else "N/A")
c2.metric("T+1 Return", f"₹{reaction['t1_close'] or 'N/A'}", f"{reaction['t1_return_pct']}%" if reaction['t1_return_pct'] is not None else "N/A")
c3.metric("T+5 Return", f"₹{reaction['t5_close'] or 'N/A'}", f"{reaction['t5_return_pct']}%" if reaction['t5_return_pct'] is not None else "N/A")
c4.metric("T+20 Return", f"₹{reaction['t20_close'] or 'N/A'}", f"{reaction['t20_return_pct']}%" if reaction['t20_return_pct'] is not None else "N/A")

# Pre & Post Deal Price Trajectory Chart
if price_series:
    df_px = pd.DataFrame(price_series)
    fig = go.Figure()
    
    # Line chart of closing price
    fig.add_trace(go.Scatter(
        x=df_px["date"], y=df_px["close"], mode="lines+markers", name="Closing Price (₹)",
        line=dict(color="#2563EB", width=2)
    ))

    # Add vertical reference line on deal date
    fig.add_vline(
        x=deal["trade_date"], line_width=2, line_dash="dash", line_color="#EF4444",
        annotation_text="Disclosure Date", annotation_position="top left"
    )

    # Highlight transaction point
    fig.add_trace(go.Scatter(
        x=[deal["trade_date"]], y=[deal["price"]], mode="markers",
        marker=dict(size=14, color="#10B981" if deal["buy_sell"] == "BUY" else "#DC2626", symbol="star"),
        name=f"Trade Price: ₹{deal['price']}"
    ))

    fig.update_layout(
        title=f"Pre and Post Deal Price Window: {selected_symbol}",
        xaxis_title="Trading Session Date", yaxis_title="Price (INR)",
        hovermode="x unified"
    )
    st.plotly_chart(fig, use_container_width=True)

# Quantitative Summary Table
st.subheader("Benchmark-Relative Session Breakdown")
summary_data = [
    {"Session": "T-0 (Deal Session)", "Date": reaction["matched_session_date"], "Closing Price": reaction["t0_close"], "Return %": "0.00%"},
    {"Session": "T+1 Trading Day", "Date": "T+1 Session", "Closing Price": reaction["t1_close"], "Return %": f"{reaction['t1_return_pct']}%" if reaction['t1_return_pct'] is not None else "N/A"},
    {"Session": "T+5 Trading Days", "Date": "T+5 Session", "Closing Price": reaction["t5_close"], "Return %": f"{reaction['t5_return_pct']}%" if reaction['t5_return_pct'] is not None else "N/A"},
    {"Session": "T+20 Trading Days", "Date": "T+20 Session", "Closing Price": reaction["t20_close"], "Return %": f"{reaction['t20_return_pct']}%" if reaction['t20_return_pct'] is not None else "N/A"},
]
st.table(pd.DataFrame(summary_data))
