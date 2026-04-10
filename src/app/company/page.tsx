"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { CompanySelector } from "@/components/company/company-selector";
import { ProfileCard } from "@/components/company/profile-card";
import { AnnouncementsCard } from "@/components/company/announcements-card";
import { DividendsCard } from "@/components/company/dividends-card";
import { BoardCard } from "@/components/company/board-card";
import { CorporateActionsCard } from "@/components/company/corporate-actions-card";
import { PriceHistoryChart } from "@/components/company/price-history-chart";

interface CompanyData {
  id: string;
  symbol: string;
  companyName: string;
  sector: string | null;
  details: Record<string, string> | null;
  scrapedAt: string;
  announcements: Array<{ id: string; title: string; date: string | null; category: string | null }>;
  dividends: Array<{ id: string; announcedDate: string | null; eligibilityDate: string | null; distributionDate: string | null; distributionWay: string | null; dividendAmount: string | null }>;
  boardMembers: Array<{ id: string; tradingDate: string | null; shareholder: string | null; designation: string | null; sharesHeld: string | null; sharesPrev: string | null; sharesChange: string | null }>;
  corporateActions: Array<{ id: string; title: string; date: string | null; details: string | null }>;
}

export default function CompanyPage() {
  const [stocks, setStocks] = useState<Array<{ symbol: string; companyName: string }>>([]);
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [selectedSector, setSelectedSector] = useState("");
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const [scraping, setScraping] = useState(false);
  const [scrapeMsg, setScrapeMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [profiledSymbols, setProfiledSymbols] = useState<Set<string>>(new Set());

  // Fetch stock list
  useEffect(() => {
    async function fetchList() {
      try {
        const res = await fetch("/api/company?list=true");
        const data = await res.json();
        setStocks(data.allStocks || []);
        const profiled = new Set<string>((data.profiles || []).map((p: { symbol: string }) => p.symbol));
        setProfiledSymbols(profiled);
      } catch { /* ignore */ }
    }
    fetchList();
  }, []);

  // Fetch company data when symbol changes
  const fetchCompany = useCallback(async () => {
    if (!selectedSymbol) { setCompanyData(null); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/company?symbol=${selectedSymbol}`);
      if (res.ok) {
        setCompanyData(await res.json());
      } else {
        setCompanyData(null);
      }
    } catch { setCompanyData(null); }
    finally { setLoading(false); }
  }, [selectedSymbol]);

  useEffect(() => { fetchCompany(); }, [fetchCompany]);

  async function handleScrape() {
    if (!selectedSymbol) return;
    setScraping(true);
    setScrapeMsg("");
    try {
      const res = await fetch(`/api/company/scrape?symbol=${selectedSymbol}`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setScrapeMsg("Profile scraped successfully!");
        setProfiledSymbols((prev) => new Set([...prev, selectedSymbol]));
        await fetchCompany();
      } else {
        setScrapeMsg(`Error: ${data.error}`);
      }
    } catch (err) {
      setScrapeMsg(`Error: ${err instanceof Error ? err.message : "Failed"}`);
    } finally {
      setScraping(false);
    }
  }

  const filteredStocks = selectedSector
    ? stocks // TODO: filter by sector when sector data is available per stock
    : stocks;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">Company Profile</h1>
          <p className="text-muted-foreground text-xs mt-0.5">
            Detailed company information, announcements, dividends, and board data
          </p>
        </div>

        <CompanySelector
          stocks={filteredStocks}
          selectedSymbol={selectedSymbol}
          selectedSector={selectedSector}
          onSymbolChange={setSelectedSymbol}
          onSectorChange={setSelectedSector}
          onScrape={handleScrape}
          scraping={scraping}
          profileExists={profiledSymbols.has(selectedSymbol)}
        />

        {scrapeMsg && (
          <div className={`text-xs font-medium px-4 py-2 rounded-lg ${scrapeMsg.includes("Error") ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>
            {scrapeMsg}
          </div>
        )}

        {!selectedSymbol && (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <p className="text-muted-foreground text-sm">Select a company and click &quot;Scrape Profile&quot; to load its data.</p>
            {profiledSymbols.size > 0 && (
              <p className="text-xs text-muted-foreground mt-2">{profiledSymbols.size} companies profiled so far</p>
            )}
          </div>
        )}

        {selectedSymbol && loading && (
          <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground animate-pulse">
            Loading profile...
          </div>
        )}

        {selectedSymbol && !loading && !companyData && (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <p className="text-muted-foreground text-sm">No profile data for {selectedSymbol} yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Click &quot;Scrape Profile&quot; to fetch data from Tadawul.</p>
          </div>
        )}

        {companyData && (
          <>
            <ProfileCard
              companyName={companyData.companyName}
              symbol={companyData.symbol}
              sector={companyData.sector}
              details={companyData.details as Record<string, string> | null}
              scrapedAt={companyData.scrapedAt}
            />

            <PriceHistoryChart symbol={companyData.symbol} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <AnnouncementsCard announcements={companyData.announcements} />
              <DividendsCard dividends={companyData.dividends} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <BoardCard members={companyData.boardMembers} />
              <CorporateActionsCard actions={companyData.corporateActions} />
            </div>
          </>
        )}

        {/* Show price history even without profile data */}
        {selectedSymbol && !companyData && !loading && (
          <PriceHistoryChart symbol={selectedSymbol} />
        )}
      </main>
    </div>
  );
}
