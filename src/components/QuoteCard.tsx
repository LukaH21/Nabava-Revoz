"use client";

import { useState, useTransition } from "react";
import { updateQuote, deleteQuote, markWinner, type LineItem } from "@/app/actions";

type QuoteData = {
  id: string;
  supplierId: string | null;
  supplierNameFreeText: string | null;
  lineItems: string;
  subtotal: number;
  brokerageAmount: number;
  totalWithBrokerage: number;
  technicallyConfirmed: boolean;
  commerciallyConfirmed: boolean;
  finalPrice: number | null;
  isWinner: boolean;
  notes: string | null;
};

export default function QuoteCard({
  quote,
  supplierName,
  isHomologated,
  scheduleNames,
  projectId,
  roundId,
}: {
  quote: QuoteData;
  supplierName: string;
  isHomologated: boolean;
  scheduleNames: string[];
  projectId: string;
  roundId: string;
}) {
  const [lineItems, setLineItems] = useState<LineItem[]>(() => {
    try {
      return JSON.parse(quote.lineItems);
    } catch {
      return [];
    }
  });
  const [applyBrokerage, setApplyBrokerage] = useState(!isHomologated);
  const [schedule, setSchedule] = useState(scheduleNames[0] || "");
  const [technicallyConfirmed, setTechnicallyConfirmed] = useState(quote.technicallyConfirmed);
  const [commerciallyConfirmed, setCommerciallyConfirmed] = useState(quote.commerciallyConfirmed);
  const [finalPrice, setFinalPrice] = useState(quote.finalPrice?.toString() || "");
  const [notes, setNotes] = useState(quote.notes || "");
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const previewSubtotal = lineItems
    .filter((li) => li.includeInTotal)
    .reduce((sum, li) => sum + (Number(String(li.value).replace(",", ".")) || 0), 0);

  function updateLine(i: number, patch: Partial<LineItem>) {
    setLineItems((prev) => prev.map((li, idx) => (idx === i ? { ...li, ...patch } : li)));
  }

  function addLine() {
    setLineItems((prev) => [...prev, { label: "", value: "", includeInTotal: false }]);
  }

  function removeLine(i: number) {
    setLineItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  function save() {
    startTransition(async () => {
      await updateQuote(quote.id, projectId, roundId, {
        lineItems,
        applyBrokerage,
        brokerageSchedule: applyBrokerage ? schedule : undefined,
        technicallyConfirmed,
        commerciallyConfirmed,
        finalPrice: finalPrice ? Number(finalPrice.replace(",", ".")) : null,
        notes: notes || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });
  }

  return (
    <div className={`bg-white border rounded-lg p-4 space-y-3 w-72 shrink-0 ${quote.isWinner ? "border-emerald-400 ring-1 ring-emerald-300" : "border-slate-200"}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium text-slate-800">{supplierName}</div>
          {!isHomologated && <div className="text-xs text-amber-600">nehomologiran</div>}
        </div>
        {quote.isWinner && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Izbran</span>}
      </div>

      <div className="space-y-1">
        {lineItems.map((li, i) => (
          <div key={i} className="flex gap-1 items-center text-xs">
            <input
              value={li.label}
              onChange={(e) => updateLine(i, { label: e.target.value })}
              placeholder="Postavka"
              className="w-24 border border-slate-200 rounded px-1 py-1"
            />
            <input
              value={li.value}
              onChange={(e) => updateLine(i, { value: e.target.value })}
              placeholder="vrednost"
              className="flex-1 border border-slate-200 rounded px-1 py-1"
            />
            <input
              type="checkbox"
              checked={li.includeInTotal}
              onChange={(e) => updateLine(i, { includeInTotal: e.target.checked })}
              title="Vključi v skupaj"
            />
            <button onClick={() => removeLine(i)} className="text-slate-400 hover:text-red-500">
              ×
            </button>
          </div>
        ))}
        <button onClick={addLine} className="text-xs text-blue-600 hover:underline">
          + postavka
        </button>
      </div>

      <div className="text-sm border-t border-slate-100 pt-2 space-y-1">
        <div className="flex justify-between">
          <span className="text-slate-500">Skupaj (postavke)</span>
          <span className="font-medium">{previewSubtotal.toFixed(2)} €</span>
        </div>

        <label className="flex items-center gap-1 text-xs text-slate-600">
          <input type="checkbox" checked={applyBrokerage} onChange={(e) => setApplyBrokerage(e.target.checked)} />
          Posredništvo
        </label>
        {applyBrokerage && (
          <select value={schedule} onChange={(e) => setSchedule(e.target.value)} className="w-full border border-slate-200 rounded px-1 py-1 text-xs">
            {scheduleNames.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}
        <div className="flex justify-between text-xs text-slate-400">
          <span>zadnja izračunana provizija</span>
          <span>{quote.brokerageAmount.toFixed(2)} €</span>
        </div>
      </div>

      <div className="space-y-1 text-xs border-t border-slate-100 pt-2">
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={technicallyConfirmed} onChange={(e) => setTechnicallyConfirmed(e.target.checked)} />
          Tehnično potrjeno
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={commerciallyConfirmed} onChange={(e) => setCommerciallyConfirmed(e.target.checked)} />
          Komercialno potrjeno
        </label>
        <div>
          <label className="block text-slate-500 mb-0.5">Končna cena (€)</label>
          <input value={finalPrice} onChange={(e) => setFinalPrice(e.target.value)} className="w-full border border-slate-200 rounded px-1 py-1" />
        </div>
        <div>
          <label className="block text-slate-500 mb-0.5">Komentar</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full border border-slate-200 rounded px-1 py-1" />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={save}
          disabled={isPending}
          className="flex-1 bg-blue-600 text-white text-xs px-2 py-1.5 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? "Shranjujem…" : saved ? "Shranjeno ✓" : "Shrani"}
        </button>
        <button
          onClick={() => startTransition(() => markWinner(quote.id, projectId, roundId))}
          className="text-xs px-2 py-1.5 rounded border border-emerald-300 text-emerald-700 hover:bg-emerald-50"
        >
          Izberi
        </button>
        <button
          onClick={() => startTransition(() => deleteQuote(quote.id, projectId, roundId))}
          className="text-xs px-2 py-1.5 rounded border border-slate-200 text-slate-400 hover:text-red-500"
        >
          Izbriši
        </button>
      </div>
    </div>
  );
}
