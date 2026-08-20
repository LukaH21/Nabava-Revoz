"use client";

type LineItem = { label: string; value: string; includeInTotal: boolean };
type QuoteForExport = {
  supplierName: string;
  lineItems: string;
  subtotal: number;
  brokerageAmount: number;
  totalWithBrokerage: number;
  finalPrice: number | null;
  isWinner: boolean;
};

function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export default function ExportCsvButton({ quotes, filename }: { quotes: QuoteForExport[]; filename: string }) {
  function download() {
    const labelSet = new Set<string>();
    const parsed = quotes.map((q) => {
      let items: LineItem[] = [];
      try {
        items = JSON.parse(q.lineItems);
      } catch {
        items = [];
      }
      items.forEach((li) => labelSet.add(li.label));
      return { ...q, items };
    });
    const labels = Array.from(labelSet);

    const header = ["Dobavitelj", ...labels, "Skupaj (postavke)", "Provizija", "Skupaj s provizijo", "Končna cena", "Zmagovalec"];
    const rows = parsed.map((q) => {
      const itemMap = new Map(q.items.map((li) => [li.label, li.value]));
      return [
        q.supplierName,
        ...labels.map((l) => itemMap.get(l) ?? ""),
        q.subtotal,
        q.brokerageAmount,
        q.totalWithBrokerage,
        q.finalPrice ?? "",
        q.isWinner ? "DA" : "",
      ];
    });

    const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button onClick={download} className="text-xs px-3 py-1.5 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50">
      Izvozi CSV
    </button>
  );
}
