"use client";

import { useState } from "react";
import QuoteCard from "./QuoteCard";

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

export default function RoundWorkspace({
  quotes,
  supplierNames,
  homologatedById,
  scheduleNames,
  projectId,
  roundId,
}: {
  quotes: QuoteData[];
  supplierNames: Record<string, string>;
  homologatedById: Record<string, boolean>;
  scheduleNames: string[];
  projectId: string;
  roundId: string;
}) {
  const [live, setLive] = useState<Record<string, number>>(() =>
    Object.fromEntries(quotes.map((q) => [q.id, q.finalPrice ?? q.totalWithBrokerage ?? 0])),
  );

  function onLiveChange(id: string, value: number) {
    setLive((prev) => (prev[id] === value ? prev : { ...prev, [id]: value }));
  }

  const bars = quotes
    .map((q) => ({ id: q.id, name: supplierNames[q.id] || "?", value: live[q.id] || 0 }))
    .filter((b) => b.value > 0)
    .sort((a, b) => a.value - b.value);
  const maxVal = Math.max(1, ...bars.map((b) => b.value));

  return (
    <div className="space-y-4">
      {bars.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
          <div className="text-sm font-medium text-slate-700">Vizualna primerjava (sproti se posodablja)</div>
          {bars.map((b, i) => (
            <div key={b.id} className="flex items-center gap-2 text-xs">
              <div className="w-32 truncate text-slate-600" title={b.name}>
                {b.name}
              </div>
              <div className="flex-1 bg-slate-100 rounded h-5 relative overflow-hidden">
                <div
                  className={`h-full rounded ${i === 0 ? "bg-emerald-500" : "bg-blue-400"}`}
                  style={{ width: `${(b.value / maxVal) * 100}%` }}
                />
              </div>
              <div className="w-20 text-right font-medium text-slate-700">{b.value.toFixed(0)} €</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {quotes.length === 0 && <p className="text-slate-400 text-sm">Za ta krog še ni dodanih ponudb. Dodaj dobavitelja zgoraj.</p>}
        {quotes.map((q) => (
          <QuoteCard
            key={q.id}
            quote={q}
            supplierName={supplierNames[q.id] || "Neznan dobavitelj"}
            isHomologated={homologatedById[q.id] ?? false}
            scheduleNames={scheduleNames}
            projectId={projectId}
            roundId={roundId}
            onLiveChange={onLiveChange}
          />
        ))}
      </div>
    </div>
  );
}
