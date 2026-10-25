# DealScope India — NSE & BSE Bulk and Block Deals Intelligence Platform

**DealScope India** is an institutional-grade surveillance, normalization, and research platform for equity market analysts, quantitative researchers, and compliance teams monitoring regulatory transaction disclosures on the **National Stock Exchange of India (NSE)** and **BSE Ltd**.

---

## 1. Regulatory Context & Framework

Under the **Securities and Exchange Board of India (SEBI)** disclosure mandates:
- **Bulk Deal**: Any transaction where the total quantity of shares bought or sold exceeds **0.5% of the total equity shares** of the company. These trades can be executed across normal market trading windows and must be disclosed by brokers to the exchanges after market close.
- **Block Deal**: A discrete transaction executed through a dedicated **Block Deal Window** (morning and afternoon sessions) with a **minimum order size of ₹10 Crore (₹100 Million)** or **500,000 shares**.
- **Important Compliance Notice**: Deal disclosures report single-day gross executed quantities. Disclosed trades do not represent an investor's net portfolio position, current beneficial holding, or future investment intent. This platform is strictly a research and monitoring system, not a buy/sell recommendation engine.

---

## 2. System Architecture

```text
dealscope-india/
├── app.py                      # Master Streamlit dashboard entrypoint & data router
├── config.py                   # Exchange endpoints, trading holidays calendar, SQLite settings
├── database.py                 # SQLite persistence, transactional commit, duplicate detection
├── data_normalizer.py          # Unified schema normalizer, composite key hash generator
├── analytics.py                # Quantitative aggregations, buy/sell metrics, client rankings
├── security_mapping.py         # ISIN, NSE Symbol, BSE Scrip Code & Yahoo Ticker resolver
├── price_history.py            # T+0, T+1, T+5, T+20 trading-session price reaction engine
├── excel_export.py             # 10-sheet audit-grade Excel (.xlsx) workbook generator
├── nse_client.py               # Official NSE disclosure scraper and CSV archive parser
├── bse_client.py               # Official BSE disclosure scraper and CSV archive parser
├── pages/
│   ├── 1_Market_Overview.py    # Macro KPI cards, volume mix, top companies & clients
│   ├── 2_Deals_Explorer.py     # Multi-parameter filtering, search, and CSV export
│   ├── 3_Company_Intelligence.py # Deep-dive per scrip with deal markers on price chart
│   ├── 4_Client_Intelligence.py  # Institutional client surveillance and traded portfolio
│   ├── 5_Price_Reactions.py    # T+1, T+5, T+20 post-disclosure returns vs benchmark
│   └── 6_Excel_Reports.py      # Multi-sheet Excel workbook export interface
├── sample_data/                # Authentic official-format CSV samples for NSE and BSE
├── tests/                      # Automated unit tests covering all core modules
└── requirements.txt            # Pinned Python package dependencies
```

---

## 3. Verified Official Exchange Endpoints & Disclosures

Tested and audited as of **October 2026**:

1. **National Stock Exchange (NSE)**
   - **Report Page**: `https://www.nseindia.com/report-detail/display-bulk-and-block-deals`
   - **Daily Bulk CSV Archive**: `https://nsearchives.nseindia.com/content/equities/bulk.csv`
   - **Daily Block CSV Archive**: `https://nsearchives.nseindia.com/content/equities/block.csv`
   - **Historical API Endpoint**: `https://www.nseindia.com/api/historical/bulk-deals`
   - *Technical Observation*: NSE enforces strict Akamai bot-detection and TLS fingerprinting. Requests originating from major cloud hosting IP blocks (AWS, GCP, Azure, DigitalOcean) frequently receive `HTTP 403 Forbidden`. DealScope India's `NSEClient` explicitly detects this condition and gracefully directs the researcher to the built-in official CSV ingestion workflow.

2. **BSE Ltd (BSE)**
   - **Bulk Deals Portal**: `https://www.bseindia.com/markets/equity/EQReports/Bulk_Deals.aspx`
   - **Block Deals Portal**: `https://www.bseindia.com/markets/equity/EQReports/Block_Deals.aspx`
   - **BSE API**: `https://api.bseindia.com/BseIndiaAPI/api/BulkDeals/w`
   - *Technical Observation*: BSE API requires specific request referrer headers and rate limiting. The platform supports both live JSON queries and direct official CSV file uploads.

---

## 4. Key Functional Features

- **Calculated vs Reported Value Separation**: Exchange disclosures often provide price and quantity without a pre-computed value. DealScope computes `quantity × price` and explicitly tags it as `CALCULATED`, while keeping source-reported values distinguishable for audit compliance.
- **Deterministic Record Fingerprinting**: Composite SHA-256 hash derived from `trade_date | exchange | deal_type | symbol | client_name | buy_sell | quantity | price` prevents duplicate ingestions during repetitive syncs.
- **Real Trading Session Logic**: Post-deal price return calculations (`T+1`, `T+5`, `T+20`) strictly advance through actual Indian exchange trading sessions, properly accounting for weekends and 16 annual statutory market holidays.
- **10-Sheet Multi-Worksheet Excel Engine**: Generates a formatted `.xlsx` workbook containing:
  1. `Executive Dashboard`
  2. `Raw Deals`
  3. `Bulk Deals`
  4. `Block Deals`
  5. `Company Summary`
  6. `Client Summary`
  7. `Daily Summary`
  8. `Exchange Summary`
  9. `Price Reactions`
  10. `Data Quality`

---

## 5. Local Setup & Quickstart

### Prerequisites
- Python 3.10, 3.11, or 3.12
- Git

### Installation
```bash
# Clone the repository
git clone https://github.com/your-username/dealscope-india.git
cd dealscope-india

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run automated tests
python3 -m unittest discover -s tests

# Start Streamlit application
streamlit run app.py
```

---

## 6. Deployment on Streamlit Community Cloud

1. Push your repository to GitHub (`main` branch).
2. Visit [share.streamlit.io](https://share.streamlit.io) and log in with GitHub.
3. Click **New app** and select:
   - **Repository**: `your-username/dealscope-india`
   - **Branch**: `main`
   - **Main file path**: `app.py`
4. Click **Deploy!**
5. Streamlit Cloud automatically installs packages from `requirements.txt` and starts the application.
*(Note: Because Streamlit Cloud instances have ephemeral local storage, store uploaded CSVs or connect to an external PostgreSQL database for permanent cross-session retention).*

---

## 7. Known Limitations & Roadmap

- **Exchange Cloud IP Shielding**: Direct automated scraping of live pages from cloud servers is subject to frequent CDN blocks (Akamai / Cloudflare). The CSV ingestion pipeline is the recommended production workflow.
- **Client Name Standardization**: Institutional investors often appear under slight variations (e.g., `LIFE INSURANCE CORPORATION OF INDIA` vs `LIC OF INDIA`). DealScope preserves original disclosures to prevent incorrect entity merging.
- **Next High-Priority Improvements**:
  1. Direct integration with official SEBI XBRL regulatory feed.
  2. PostgreSQL / Cloud SQL integration for multi-user shared storage.
  3. PDF announcement extraction for accompanying promoter disclosure filings (SAST Regulation 29).
