"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wallet, Coins } from "lucide-react";

export function InvestmentNav() {
  const pathname = usePathname();
  const tabs = [
    { href: "/portfolio", label: "My Portfolio", icon: Wallet },
    { href: "/dividends", label: "My Dividend", icon: Coins },
  ];
  return (
    <div className="flex items-center gap-1 border-b border-border">
      {tabs.map((t) => {
        const active = pathname === t.href;
        const Icon = t.icon;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
