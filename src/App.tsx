/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { NormalizedDeal } from './types/deals';
import { getStoredDeals, resetToSeedDeals } from './services/storage';
import { Navbar } from './components/Navbar';
import { MarketOverview } from './components/MarketOverview';
import { DealsExplorer } from './components/DealsExplorer';
import { CompanyIntelligence } from './components/CompanyIntelligence';
import { ClientIntelligence } from './components/ClientIntelligence';
import { PriceReactions } from './components/PriceReactions';
import { ExcelReports } from './components/ExcelReports';
import { IngestionModal } from './components/IngestionModal';
import { PythonRepoModal } from './components/PythonRepoModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [deals, setDeals] = useState<NormalizedDeal[]>([]);
  const [isIngestOpen, setIsIngestOpen] = useState<boolean>(false);
  const [isPythonRepoOpen, setIsPythonRepoOpen] = useState<boolean>(false);

  // Cross-page drilldown selections
  const [drilldownSymbol, setDrilldownSymbol] = useState<string>('HDFCBANK');
  const [drilldownClient, setDrilldownClient] = useState<string>('GOVERNMENT PENSION FUND GLOBAL');

  // Load stored deals on mount
  useEffect(() => {
    refreshDeals();
  }, []);

  const refreshDeals = () => {
    const loaded = getStoredDeals();
    setDeals(loaded);
  };

  const handleResetData = () => {
    if (window.confirm('Reset local database to verified authentic official exchange disclosures?')) {
      resetToSeedDeals();
      refreshDeals();
    }
  };

  const handleSelectCompany = (symbol: string) => {
    setDrilldownSymbol(symbol);
    setActiveTab('company');
  };

  const handleSelectClient = (client: string) => {
    setDrilldownClient(client);
    setActiveTab('client');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenIngest={() => setIsIngestOpen(true)}
        onOpenPythonRepo={() => setIsPythonRepoOpen(true)}
        onResetData={handleResetData}
        dealsCount={deals.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'overview' && (
          <MarketOverview
            deals={deals}
            onSelectCompany={handleSelectCompany}
            onSelectClient={handleSelectClient}
          />
        )}

        {activeTab === 'explorer' && (
          <DealsExplorer
            deals={deals}
            onSelectCompany={handleSelectCompany}
            onSelectClient={handleSelectClient}
          />
        )}

        {activeTab === 'company' && (
          <CompanyIntelligence
            deals={deals}
            initialSymbol={drilldownSymbol}
            onSelectClient={handleSelectClient}
          />
        )}

        {activeTab === 'client' && (
          <ClientIntelligence
            deals={deals}
            initialClient={drilldownClient}
            onSelectCompany={handleSelectCompany}
          />
        )}

        {activeTab === 'price' && (
          <PriceReactions
            deals={deals}
            onSelectCompany={handleSelectCompany}
          />
        )}

        {activeTab === 'excel' && (
          <ExcelReports
            deals={deals}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-2">
          <div>
            <span className="font-semibold text-slate-700">DealScope India</span> — NSE & BSE Bulk & Block Deals Intelligence Platform
          </div>
          <div className="text-[11px] text-slate-400">
            SEBI Regulatory Research & Monitoring • Not Investment Advice
          </div>
        </div>
      </footer>

      {/* Modals */}
      <IngestionModal
        isOpen={isIngestOpen}
        onClose={() => setIsIngestOpen(false)}
        onDealsUpdated={refreshDeals}
      />

      <PythonRepoModal
        isOpen={isPythonRepoOpen}
        onClose={() => setIsPythonRepoOpen(false)}
      />
    </div>
  );
}
