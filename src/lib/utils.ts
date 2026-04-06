import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseNumber(text: string): number | null {
  if (!text || text === "-" || text === "N/A" || text.trim() === "") return null;
  const cleaned = text.replace(/,/g, "").replace(/[()]/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

export function parseInteger(text: string): number | null {
  const num = parseNumber(text);
  return num !== null ? Math.round(num) : null;
}

export function formatNumber(num: number | null | undefined): string {
  if (num == null) return "-";
  return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatInteger(num: number | null | undefined): string {
  if (num == null) return "-";
  return Math.round(num).toLocaleString("en-US");
}

export function formatRiyadhTime(date: Date): string {
  return date.toLocaleString("en-US", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}
