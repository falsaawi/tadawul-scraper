"use client";

import { useRef, useState } from "react";
import { Upload, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

type Status = "idle" | "parsing" | "uploading" | "done" | "error";

export function DividendUploadForm({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const fileInput = useRef<HTMLInputElement | null>(null);

  if (!open) return null;

  function reset() {
    setFile(null);
    setStatus("idle");
    setMessage("");
  }

  function handleClose() {
    if (status === "parsing" || status === "uploading") return;
    const wasSuccessful = status === "done";
    reset();
    if (wasSuccessful) onSuccess();
    else onClose();
  }

  async function handleSubmit() {
    if (!file) return;
    setStatus("parsing");
    setMessage("Parsing dividend report…");

    let parsed;
    try {
      const parser = await import("@/lib/dividend-parser");
      parsed = await parser.parseDividendWorkbook(file);
    } catch (err) {
      setStatus("error");
      setMessage(`Parse failed: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }

    if (parsed.rows.length === 0) {
      setStatus("error");
      setMessage("No dividend rows parsed. Wrong file format?");
      return;
    }

    setStatus("uploading");
    setMessage(`Uploading ${parsed.rows.length.toLocaleString()} dividend records…`);

    try {
      const res = await fetch("/api/investment/dividends-upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const text = await res.text();
      let data: { error?: string; detail?: string; ok?: boolean; matched?: number; unmatched?: number; rowCount?: number } = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { error: text.slice(0, 200) };
      }
      if (!res.ok || !data.ok) {
        setStatus("error");
        setMessage(
          (data.error || `HTTP ${res.status}`) +
            (data.detail ? ` — ${String(data.detail).slice(0, 200)}` : "")
        );
        return;
      }
      setStatus("done");
      const matched = data.matched ?? 0;
      const total = data.rowCount ?? parsed.rows.length;
      setMessage(`Saved ${total.toLocaleString()} dividends, ${matched.toLocaleString()} matched to symbols.`);
      setTimeout(() => {
        reset();
        onSuccess();
      }, 900);
    } catch (err) {
      setStatus("error");
      setMessage(`Upload failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const busy = status === "parsing" || status === "uploading";

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold">Upload dividend report</h2>
          <button
            onClick={handleClose}
            disabled={busy}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-xs text-muted-foreground">
            Pick the dividend export from your broker (e.g. <code className="text-foreground">InvestorDividends.xlsx</code>).
            Each new upload replaces the previous one. Rows are matched to your Saudi
            holdings by company name; unmatched rows still count toward lifetime totals.
          </p>

          <div className="bg-background border border-border rounded-lg p-4">
            <input
              ref={fileInput}
              type="file"
              accept=".xlsx,.xls"
              disabled={busy}
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setStatus("idle");
                setMessage("");
              }}
              className="hidden"
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => fileInput.current?.click()}
                className="px-3 py-1.5 rounded-md border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-50"
              >
                Choose file
              </button>
              <div className="text-xs text-muted-foreground truncate flex-1">
                {file?.name ?? "No file selected"}
              </div>
              {status === "done" && <CheckCircle2 className="h-4 w-4 text-green-400" />}
              {status === "error" && <AlertCircle className="h-4 w-4 text-red-400" />}
              {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
          </div>

          {message && (
            <div
              className={`text-xs px-3 py-2 rounded-lg border ${
                status === "error"
                  ? "text-red-400 bg-red-500/10 border-red-500/20"
                  : status === "done"
                  ? "text-green-400 bg-green-500/10 border-green-500/20"
                  : "text-muted-foreground bg-background border-border"
              }`}
            >
              {message}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-border flex items-center justify-end gap-2">
          <button
            onClick={handleClose}
            disabled={busy}
            className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-50"
          >
            {status === "done" ? "Close" : "Cancel"}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!file || busy || status === "done"}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {status === "parsing" ? "Parsing…" : status === "uploading" ? "Uploading…" : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}
