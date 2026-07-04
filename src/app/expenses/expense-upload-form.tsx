"use client";

import { useRef, useState } from "react";
import { Upload, X, CheckCircle2, AlertCircle, Loader2, FileText } from "lucide-react";

type Status = "idle" | "reading" | "uploading" | "done" | "error";

interface FileResult {
  name: string;
  status: Status;
  message: string;
}

export function ExpenseUploadForm({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<FileResult[]>([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  if (!open) return null;

  function reset() {
    setFiles([]);
    setResults([]);
  }
  function handleClose() {
    if (busy) return;
    const anyDone = results.some((r) => r.status === "done");
    reset();
    if (anyDone) onSuccess();
    else onClose();
  }

  function readAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = () => reject(new Error("read failed"));
      fr.readAsDataURL(file);
    });
  }

  async function handleSubmit() {
    if (files.length === 0) return;
    setBusy(true);
    const out: FileResult[] = files.map((f) => ({ name: f.name, status: "reading", message: "Reading…" }));
    setResults([...out]);
    let anyOk = false;
    for (let i = 0; i < files.length; i++) {
      try {
        const dataBase64 = await readAsBase64(files[i]);
        out[i] = { name: files[i].name, status: "uploading", message: "Parsing & saving…" };
        setResults([...out]);
        const res = await fetch("/api/expenses/upload", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ fileName: files[i].name, dataBase64 }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string; detail?: string; ok?: boolean; bank?: string;
          transactions?: number; spend?: number; statementMonth?: string; replaced?: boolean;
        };
        if (!res.ok || !data.ok) {
          out[i] = { name: files[i].name, status: "error", message: data.error || `HTTP ${res.status}` };
        } else {
          anyOk = true;
          out[i] = {
            name: files[i].name,
            status: "done",
            message: `${data.bank} · ${data.statementMonth} · ${data.transactions} txns · SAR ${Math.round(data.spend ?? 0).toLocaleString()}${data.replaced ? " (replaced)" : ""}`,
          };
        }
      } catch (e) {
        out[i] = { name: files[i].name, status: "error", message: e instanceof Error ? e.message : String(e) };
      }
      setResults([...out]);
    }
    setBusy(false);
    if (anyOk) setTimeout(onSuccess, 400);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold">Upload credit card statements</h2>
          <button onClick={handleClose} disabled={busy} className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-50">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-xs text-muted-foreground">
            Upload your monthly credit card statement PDFs. Supported banks:{" "}
            <span className="text-foreground">SAB (SABB)</span> and <span className="text-foreground">Al Rajhi</span>.
            You can select multiple files. Re-uploading a month replaces it.
          </p>

          <div className="bg-background border border-border rounded-lg p-4">
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              multiple
              disabled={busy}
              onChange={(e) => { setFiles(Array.from(e.target.files ?? [])); setResults([]); }}
              className="hidden"
            />
            <div className="flex items-center gap-3">
              <button type="button" disabled={busy} onClick={() => inputRef.current?.click()}
                className="px-3 py-1.5 rounded-md border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-50">
                Choose PDF files
              </button>
              <div className="text-xs text-muted-foreground truncate flex-1">
                {files.length ? `${files.length} file(s) selected` : "No files selected"}
              </div>
            </div>
            {files.length > 0 && results.length === 0 && (
              <ul className="mt-3 space-y-1">
                {files.map((f) => (
                  <li key={f.name} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <FileText className="h-3 w-3" /> {f.name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {results.length > 0 && (
            <div className="space-y-1.5">
              {results.map((r) => (
                <div key={r.name} className={`flex items-start gap-2 text-[11px] px-3 py-2 rounded-lg border ${
                  r.status === "error" ? "text-red-400 bg-red-500/10 border-red-500/20"
                  : r.status === "done" ? "text-green-400 bg-green-500/10 border-green-500/20"
                  : "text-muted-foreground bg-background border-border"}`}>
                  {r.status === "done" ? <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                   : r.status === "error" ? <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                   : <Loader2 className="h-3.5 w-3.5 mt-0.5 shrink-0 animate-spin" />}
                  <div className="min-w-0">
                    <div className="font-medium text-foreground truncate">{r.name}</div>
                    <div>{r.message}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="px-5 py-4 border-t border-border flex items-center justify-end gap-2">
          <button onClick={handleClose} disabled={busy}
            className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-50">
            {results.some((r) => r.status === "done") ? "Done" : "Cancel"}
          </button>
          <button onClick={handleSubmit} disabled={busy || files.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {busy ? "Processing…" : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}
