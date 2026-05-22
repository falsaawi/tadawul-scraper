"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Lock } from "lucide-react";

export function LoginForm({
  from,
  initialError,
}: {
  from?: string;
  initialError?: string;
}) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(
    initialError === "config"
      ? "Server is missing AUTH_SECRET. Configure environment variables in Vercel."
      : ""
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || "Invalid username or password");
        setLoading(false);
        return;
      }
      const dest = from && from.startsWith("/") ? from : "/";
      router.replace(dest);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <BarChart3 className="h-7 w-7 text-primary" />
          <span className="font-bold text-xl text-foreground">Tadawul</span>
        </div>
        <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <h1 className="text-base font-semibold text-foreground">Sign in</h1>
          </div>
          <p className="text-xs text-muted-foreground mb-5">
            Authorized access only
          </p>
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label
                className="block text-xs text-muted-foreground mb-1.5"
                htmlFor="username"
              >
                Username
              </label>
              <input
                id="username"
                name="username"
                autoComplete="username"
                required
                autoFocus
                disabled={loading}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-60"
              />
            </div>
            <div>
              <label
                className="block text-xs text-muted-foreground mb-1.5"
                htmlFor="password"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                disabled={loading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-60"
              />
            </div>
            {error && (
              <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
        <p className="text-center text-[10px] text-muted-foreground mt-4">
          Saudi Stock Exchange (Tadawul) market data scraper
        </p>
      </div>
    </div>
  );
}
