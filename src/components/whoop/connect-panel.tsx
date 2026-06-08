"use client";

import { useState } from "react";
import { Link2, RefreshCw, Unplug, CheckCircle2, AlertTriangle } from "lucide-react";
import type { WhoopStatus } from "@/types/whoop-dashboard";

interface Props {
  status: WhoopStatus | null;
  onChanged: () => void;
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export function WhoopConnectPanel({ status, onChanged }: Props) {
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function handleSync() {
    if (syncing) return;
    setSyncing(true);
    setMsg(null);
    try {
      const res = await fetch("/api/whoop/sync", { method: "POST" });
      const body = await res.json();
      if (res.ok) {
        const c = body.counts || {};
        setMsg({
          kind: "ok",
          text: `Synced ${c.cycles ?? 0} cycles, ${c.recovery ?? 0} recovery, ${c.sleep ?? 0} sleep, ${c.workouts ?? 0} workouts.`,
        });
        onChanged();
      } else {
        setMsg({ kind: "err", text: body.error || "Sync failed" });
      }
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Sync failed" });
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect WHOOP? Synced data is kept; you'll need to reconnect to sync again."))
      return;
    await fetch("/api/whoop/disconnect", { method: "POST" });
    onChanged();
  }

  const configured = status?.configured ?? true;
  const connected = status?.connected ?? false;

  if (!configured) {
    return (
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 text-amber-400 mb-2">
          <AlertTriangle className="h-4 w-4" />
          <h3 className="text-sm font-semibold">WHOOP not configured</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Set <code className="text-foreground">WHOOP_CLIENT_ID</code> and{" "}
          <code className="text-foreground">WHOOP_CLIENT_SECRET</code> (and optionally{" "}
          <code className="text-foreground">WHOOP_REDIRECT_URI</code>) in your environment, then
          reload. Create an app at developer.whoop.com and add{" "}
          <code className="text-foreground">/api/whoop/callback</code> as a redirect URL.
        </p>
      </div>
    );
  }

  const name = status?.user?.firstName
    ? `${status.user.firstName} ${status.user.lastName ?? ""}`.trim()
    : status?.user?.email;

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${
              connected
                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                : "bg-red-500/10 text-red-400 border border-red-500/20"
            }`}
          >
            {connected ? <CheckCircle2 className="h-3 w-3" /> : <Unplug className="h-3 w-3" />}
            {connected ? "Connected" : "Not connected"}
          </div>
          {connected && (
            <div className="text-xs text-muted-foreground">
              {name ? <span className="text-foreground font-medium">{name}</span> : null}
              <span className="ml-2">Last sync {timeAgo(status?.lastSyncedAt)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!connected ? (
            <a
              href="/api/whoop/connect"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
            >
              <Link2 className="h-3.5 w-3.5" />
              Connect WHOOP
            </a>
          ) : (
            <>
              <button
                type="button"
                onClick={handleSync}
                disabled={syncing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary/15 text-primary hover:bg-primary/25 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Syncing…" : "Sync now"}
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground border border-border transition-colors"
              >
                <Unplug className="h-3.5 w-3.5" />
                Disconnect
              </button>
            </>
          )}
        </div>
      </div>

      {msg && (
        <div
          className={`mt-3 text-xs rounded-lg px-3 py-2 ${
            msg.kind === "ok"
              ? "bg-green-500/10 text-green-400"
              : "bg-red-500/10 text-red-400"
          }`}
        >
          {msg.text}
        </div>
      )}

      {connected && status?.lastSync?.status === "failed" && !msg && (
        <div className="mt-3 text-xs rounded-lg px-3 py-2 bg-red-500/10 text-red-400">
          Last sync failed: {status.lastSync.error}
        </div>
      )}
    </div>
  );
}
