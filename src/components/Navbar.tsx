import React from 'react';
import { 
  BarChart3, 
  Table, 
  Building2, 
  Users, 
  TrendingUp, 
  FileSpreadsheet, 
  UploadCloud, 
  Terminal, 
  RotateCcw,
  ShieldAlert,
  Code2
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenIngest: () => void;
  onOpenPythonRepo: () => void;
  onResetData: () => void;
  dealsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenIngest,
  onOpenPythonRepo,
  onResetData,
  dealsCount,
}) => {
  const navItems = [
    { id: 'overview', label: '1. Market Overview', icon: BarChart3 },
    { id: 'explorer', label: '2. Deals Explorer', icon: Table },
    { id: 'company', label: '3. Company Intel', icon: Building2 },
    { id: 'client', label: '4. Client Intel', icon: Users },
    { id: 'price', label: '5. Price Reactions', icon: TrendingUp },
    { id: 'excel', label: '6. Excel Reports', icon: FileSpreadsheet },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded bg-blue-600 flex items-center justify-center font-mono font-bold text-lg text-white shadow-inner">
              DS
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold tracking-tight text-base sm:text-lg">DealScope India</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-900 text-blue-200 border border-blue-700">
                  NSE & BSE
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Bulk & Block Deals Disclosures Intelligence
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center space-x-2">
            <div className="hidden lg:flex items-center space-x-2 mr-2 text-xs font-mono bg-slate-800 px-2.5 py-1 rounded border border-slate-700 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{dealsCount} Verified Disclosures</span>
            </div>

            <button
              onClick={onOpenIngest}
              className="flex items-center space-x-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded transition shadow-sm cursor-pointer"
              title="Upload Official Exchange CSV or Test Feeds"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Ingest / Sync</span>
            </button>

            <button
              onClick={onOpenPythonRepo}
              className="flex items-center space-x-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded transition cursor-pointer"
              title="Inspect Python / Streamlit Cloud Architecture"
            >
              <Code2 className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Python / Cloud Code</span>
            </button>

            <button
              onClick={onResetData}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition cursor-pointer"
              title="Reset to verified official sample disclosures"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 overflow-x-auto py-1 scrollbar-none border-t border-slate-800">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-t transition whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-slate-800 text-blue-400 border-b-2 border-blue-500 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-blue-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
