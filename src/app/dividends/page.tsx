import { Header } from "@/components/layout/header";
import { InvestmentNav } from "../portfolio/investment-nav";
import { DividendClient } from "./dividend-client";

export const dynamic = "force-dynamic";

export default function DividendsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-5">
        <InvestmentNav />
        <DividendClient />
      </main>
    </div>
  );
}
