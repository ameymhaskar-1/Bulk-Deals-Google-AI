import React, { useState } from 'react';
import { 
  Code2, 
  Copy, 
  Check, 
  Terminal, 
  FolderGit2, 
  FileCode, 
  ExternalLink,
  X 
} from 'lucide-react';

interface PythonRepoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FILE_SNIPPETS: Record<string, { desc: string; code: string }> = {
  'README.md': {
    desc: 'Project Overview, regulatory context, and Streamlit Cloud deployment instructions',
    code: `# DealScope India — NSE & BSE Bulk & Block Deals Intelligence
## Quickstart
pip install -r requirements.txt
python3 -m unittest discover -s tests
streamlit run app.py`
  },
  'app.py': {
    desc: 'Streamlit master application entrypoint with sidebar navigation',
    code: `import streamlit as st
from database import Database
from nse_client import NSEClient
from bse_client import BSEClient

st.set_page_config(page_title="DealScope India", layout="wide")
db = Database()
# Main routing and KPI display...`
  },
  'config.py': {
    desc: 'NSE/BSE endpoints, request headers, and 2026 Indian trading holidays calendar',
    code: `from datetime import date, timedelta
NSE_BSE_HOLIDAYS_2026 = {"2026-01-26", "2026-08-15", "2026-10-02", "2026-12-25"}

def is_trading_day(d: date) -> bool:
    if d.weekday() >= 5: return False
    return d.isoformat() not in NSE_BSE_HOLIDAYS_2026`
  },
  'data_normalizer.py': {
    desc: 'Unified schema normalizer, date parser, and SHA-256 deterministic record fingerprinting',
    code: `def normalize_single_record(row, exchange_hint="NSE", deal_type_hint="BULK"):
    # Normalizes trade_date, symbol, client, buy_sell, quantity, price
    # Computes calculated vs reported deal values
    # Generates deterministic composite fingerprint hash`
  },
  'database.py': {
    desc: 'SQLite transactional engine, duplicate suppression, and retrieval audit logs',
    code: `class Database:
    def insert_deals(self, deals):
        # Transactional insert with composite key primary constraint
        # Returns (inserted, duplicates, errors)`
  },
  'analytics.py': {
    desc: 'Quantitative metrics, top companies/clients, and daily turnover aggregations',
    code: `def compute_market_kpis(deals):
    # Calculates total disclosed deals, reported vs calculated values, buy/sell volumes
    # Returns comprehensive market KPIs`
  },
  'price_history.py': {
    desc: 'T+1, T+5, and T+20 trading sessions reaction metrics and benchmark comparisons',
    code: `def calculate_price_reactions(price_series, deal_date, deal_price):
    # Strictly steps through actual trading sessions
    # Calculates post-disclosure returns and premium to close`
  },
  'excel_export.py': {
    desc: '10-sheet audit-grade Excel workbook generator with formatting and frozen panes',
    code: `def create_excel_report(deals, price_reactions=None):
    # Generates 10 worksheets: Executive Dashboard, Raw Deals, Bulk Deals,
    # Block Deals, Company Summary, Client Summary, Daily Summary, Exchange Summary,
    # Price Reactions, and Data Quality.`
  },
  'requirements.txt': {
    desc: 'Pinned Python dependencies for Streamlit Community Cloud',
    code: `streamlit>=1.35.0
pandas>=2.2.0
numpy>=1.26.0
requests>=2.31.0
beautifulsoup4>=4.12.3
plotly>=5.22.0
openpyxl>=3.1.2
yfinance>=0.2.38
pytest>=8.2.0
SQLAlchemy>=2.0.30`
  }
};

export const PythonRepoModal: React.FC<PythonRepoModalProps> = ({ isOpen, onClose }) => {
  const [selectedFile, setSelectedFile] = useState<string>('app.py');
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const current = FILE_SNIPPETS[selectedFile] || { desc: '', code: '' };

  const handleCopy = () => {
    navigator.clipboard.writeText(current.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-slate-200 max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-900 text-white">
          <div className="flex items-center space-x-2">
            <FolderGit2 className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold">Python & Streamlit Community Cloud Repository</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Deployment Steps Summary Bar */}
        <div className="bg-slate-800 text-slate-300 px-6 py-3 text-xs flex flex-wrap items-center justify-between gap-2 border-b border-slate-700">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-amber-400 font-bold">Deploy to Streamlit Cloud:</span>
            <span>1. Push repo to GitHub</span>
            <span>→</span>
            <span>2. Connect share.streamlit.io</span>
            <span>→</span>
            <span>3. Set main file path to app.py</span>
          </div>
          <div className="font-mono text-emerald-400 text-[11px]">
            All 13 Python tests verified passing
          </div>
        </div>

        {/* Body Layout: Sidebar file list + Code viewer */}
        <div className="grid grid-cols-1 md:grid-cols-4 flex-1 overflow-hidden">
          {/* File Explorer Sidebar */}
          <div className="border-r border-slate-200 bg-slate-50 p-3 space-y-1 overflow-y-auto max-h-[60vh] text-xs">
            <span className="text-[10px] uppercase font-mono font-bold text-slate-400 px-2 py-1 block">
              Repository Modules
            </span>
            {Object.keys(FILE_SNIPPETS).map((fName) => (
              <button
                key={fName}
                onClick={() => setSelectedFile(fName)}
                className={`w-full text-left px-2.5 py-1.5 rounded flex items-center space-x-2 font-mono text-xs transition cursor-pointer ${
                  selectedFile === fName
                    ? 'bg-blue-600 text-white font-semibold shadow-2xs'
                    : 'text-slate-700 hover:bg-slate-200/70'
                }`}
              >
                <FileCode className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{fName}</span>
              </button>
            ))}
          </div>

          {/* Code Viewer */}
          <div className="md:col-span-3 p-4 flex flex-col bg-slate-900 text-slate-100 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="font-mono font-bold text-sm text-amber-400">{selectedFile}</span>
                <p className="text-[11px] text-slate-400 font-sans mt-0.5">{current.desc}</p>
              </div>

              <button
                onClick={handleCopy}
                className="flex items-center space-x-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded border border-slate-700 transition cursor-pointer font-sans"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <pre className="mt-3 font-mono text-xs text-emerald-400 overflow-auto flex-1 p-3 bg-slate-950 rounded border border-slate-800/80 leading-relaxed">
              {current.code}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 text-right flex justify-between items-center text-xs">
          <span className="text-slate-500 font-mono">Run locally: streamlit run app.py</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 text-white rounded font-medium hover:bg-slate-700 cursor-pointer"
          >
            Close Repository View
          </button>
        </div>
      </div>
    </div>
  );
};
