"use client";

import { Fragment, useMemo, useState } from "react";
import {
  ZZN_STATUS_LABELS,
  ZznStatus,
  bulkSetStatus,
  reassignZznBuyer,
  restoreZzn,
  setZznInquirySuppliers,
  setZznStatus,
  softDeleteZzn,
  toggleProcessed,
} from "./actions";

type ZznItem = {
  id: string;
  internalOrder: string;
  itemPosition: number;
  material: string | null;
  materialName: string | null;
  quantity: number | null;
  unit: string | null;
  createdBy: string | null; // planer
  requestDate: string | null;
  buyer: string | null;
  buyerOverride: string | null;
  status: ZznStatus;
  processed: boolean;
  inquirySupplierIds: string;
  comment: string | null;
  manuallyDeleted: boolean;
  deletedReason: string | null;
};

type Supplier = {
  id: string;
  name: string;
  generalEmail: string | null;
  commercialEmail: string | null;
  orderEmail: string | null;
};

const STATUS_STYLES: Record<ZznStatus, string> = {
  DODELJENO: "bg-slate-100 text-slate-600",
  V_POVPRASEVANJU: "bg-blue-100 text-blue-700",
  ZA_NAROCILO: "bg-amber-100 text-amber-700",
  V_POTRJEVANJU: "bg-purple-100 text-purple-700",
  POTRJENO: "bg-teal-100 text-teal-700",
  NAROCENO: "bg-emerald-100 text-emerald-700",
};

const STATUS_ORDER: ZznStatus[] = ["DODELJENO", "V_POVPRASEVANJU", "ZA_NAROCILO", "V_POTRJEVANJU", "POTRJENO", "NAROCENO"];

function supplierEmail(s: Supplier): string {
  return s.generalEmail || s.commercialEmail || s.orderEmail || "";
}

export default function ZznTable({ items, suppliers, showDeleted }: { items: ZznItem[]; suppliers: Supplier[]; showDeleted: boolean }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [bulkSuppliers, setBulkSuppliers] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<ZznStatus>("V_POVPRASEVANJU");
  const [openGroupKey, setOpenGroupKey] = useState<string | null>(null);

  const supplierMap = useMemo(() => new Map(suppliers.map((s) => [s.id, s])), [suppliers]);

  const filtered = items.filter((i) => {
    if (statusFilter && i.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = `${i.internalOrder} ${i.material || ""} ${i.materialName || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const groups = useMemo(() => {
    const map = new Map<string, ZznItem[]>();
    for (const i of items) {
      if (i.status !== "V_POVPRASEVANJU" && i.status !== "ZA_NAROCILO") continue;
      let ids: string[] = [];
      try {
        ids = JSON.parse(i.inquirySupplierIds || "[]");
      } catch {
        ids = [];
      }
      if (ids.length === 0) continue;
      const key = ids.slice().sort().join(",");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(i);
    }
    return Array.from(map.entries()).map(([key, groupItems]) => ({
      key,
      supplierIds: key.split(","),
      items: groupItems,
    }));
  }, [items]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((i) => i.id)));
  }

  async function applyBulkSuppliers() {
    if (selected.size === 0 || bulkSuppliers.size === 0) return;
    await setZznInquirySuppliers(Array.from(selected), Array.from(bulkSuppliers));
    setSelected(new Set());
    setBulkSuppliers(new Set());
  }

  async function applyBulkStatus() {
    if (selected.size === 0) return;
    await bulkSetStatus(Array.from(selected), bulkStatus);
    setSelected(new Set());
  }

  function buildEmailText(groupItems: ZznItem[], supplierIds: string[]) {
    const emails = supplierIds.map((id) => supplierMap.get(id)).filter(Boolean) as Supplier[];
    const lines = [
      "Pozdravljeni,",
      "",
      "prosimo za ponudbo za spodnje artikle:",
      "",
      ...groupItems.map(
        (it) => `- ${it.material || ""} — ${it.materialName || ""} — količina: ${it.quantity ?? ""} ${it.unit || ""}`,
      ),
      "",
      "Ponudbo pošljite na e-naslov: luka.hrovat@renault.si",
      "",
      "Lep pozdrav,",
      "Luka Hrovat",
    ];
    return { text: lines.join("\n"), to: emails.map(supplierEmail).filter(Boolean).join("; "), names: emails.map((e) => e.name).join(", ") };
  }

  return (
    <div className="space-y-4">
      <form className="flex gap-2 flex-wrap items-center text-sm" onSubmit={(e) => e.preventDefault()}>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-slate-300 rounded-md px-2 py-1.5">
          <option value="">Vsi statusi</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {ZZN_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Išči po materialu, nazivu, naročilu…"
          className="border border-slate-300 rounded-md px-2 py-1.5 flex-1 min-w-48"
        />
      </form>

      {selected.size > 0 && !showDeleted && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-3 text-sm">
          <div className="font-medium text-blue-800">Izbranih: {selected.size}</div>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Dobavitelji za povpraševanje</label>
              <select
                multiple
                size={5}
                value={Array.from(bulkSuppliers)}
                onChange={(e) => setBulkSuppliers(new Set(Array.from(e.target.selectedOptions).map((o) => o.value)))}
                className="border border-slate-300 rounded-md px-2 py-1.5 min-w-64"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <button onClick={applyBulkSuppliers} className="bg-blue-700 text-white px-3 py-1.5 rounded-md hover:bg-blue-800">
              Nastavi dobavitelje (→ V povpraševanju)
            </button>
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Ali samo spremeni status</label>
              <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value as ZznStatus)} className="border border-slate-300 rounded-md px-2 py-1.5">
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {ZZN_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <button onClick={applyBulkStatus} className="bg-slate-700 text-white px-3 py-1.5 rounded-md hover:bg-slate-800">
              Nastavi status
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              {!showDeleted && (
                <th className="p-2">
                  <input type="checkbox" checked={selected.size > 0 && selected.size === filtered.length} onChange={toggleAll} />
                </th>
              )}
              <th className="p-2">Interno naročilo</th>
              <th className="p-2">Material</th>
              <th className="p-2">Naziv</th>
              <th className="p-2">Kol.</th>
              <th className="p-2">Planer</th>
              <th className="p-2">Nabavnik</th>
              <th className="p-2">Status</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.slice(0, 400).map((i) => (
              <Fragment key={i.id}>
                <tr className={i.status === "NAROCENO" ? "bg-emerald-50/40" : ""}>
                  {!showDeleted && (
                    <td className="p-2">
                      <input type="checkbox" checked={selected.has(i.id)} onChange={() => toggleSelect(i.id)} />
                    </td>
                  )}
                  <td className="p-2 font-mono text-xs text-slate-600">{i.internalOrder}</td>
                  <td className="p-2 font-mono text-xs text-slate-600">{i.material}</td>
                  <td className="p-2 text-slate-700 max-w-xs truncate" title={i.materialName || ""}>
                    {i.materialName}
                  </td>
                  <td className="p-2 text-slate-600">
                    {i.quantity} {i.unit}
                  </td>
                  <td className="p-2 text-slate-600">{i.createdBy}</td>
                  <td className="p-2 text-slate-600">{i.buyerOverride || i.buyer}</td>
                  <td className="p-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[i.status]}`}>{ZZN_STATUS_LABELS[i.status]}</span>
                  </td>
                  <td className="p-2 text-right">
                    {showDeleted ? (
                      <button onClick={() => restoreZzn(i.id)} className="text-xs text-blue-600 hover:underline">
                        Obnovi
                      </button>
                    ) : (
                      <button onClick={() => setEditingId(editingId === i.id ? null : i.id)} className="text-xs text-slate-500 hover:underline">
                        Uredi
                      </button>
                    )}
                  </td>
                </tr>
                {editingId === i.id && !showDeleted && (
                  <tr className="bg-slate-50">
                    <td colSpan={9} className="p-3">
                      <RowEditor item={i} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        {filtered.length > 400 && <p className="p-3 text-xs text-slate-400">Prikazanih prvih 400 od {filtered.length} zadetkov — zoži filter.</p>}
        {filtered.length === 0 && <p className="p-6 text-sm text-slate-400">Ni zadetkov.</p>}
      </div>

      {!showDeleted && groups.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-medium text-slate-700">Skupine povpraševanj (po enakih dobaviteljih)</h2>
          {groups.map((g) => {
            const { text, to, names } = buildEmailText(g.items, g.supplierIds);
            const isOpen = openGroupKey === g.key;
            return (
              <div key={g.key} className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="font-medium text-slate-800 text-sm">Dobavitelji: {names || "(brez izbranega dobavitelja)"}</div>
                    <div className="text-xs text-slate-400">{g.items.length} artiklov</div>
                  </div>
                  <button
                    onClick={() => setOpenGroupKey(isOpen ? null : g.key)}
                    className="text-xs bg-slate-800 text-white px-3 py-1.5 rounded-md hover:bg-slate-900"
                  >
                    {isOpen ? "Skrij email" : "Prikaži email"}
                  </button>
                </div>
                {isOpen && (
                  <div className="space-y-2">
                    <div className="text-xs text-slate-500">Za: {to || "(dobavitelj nima e-naslova v bazi)"}</div>
                    <textarea readOnly value={text} rows={8} className="w-full border border-slate-200 rounded-md px-2 py-2 text-xs font-mono" />
                    <button
                      onClick={() => navigator.clipboard.writeText(text)}
                      className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700"
                    >
                      Kopiraj besedilo
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RowEditor({ item }: { item: ZznItem }) {
  const [reason, setReason] = useState("");
  const [newBuyer, setNewBuyer] = useState(item.buyerOverride || "");

  return (
    <div className="flex flex-wrap gap-4 items-end text-xs">
      <div>
        <label className="block text-slate-500 mb-1">Status</label>
        <select
          defaultValue={item.status}
          onChange={(e) => setZznStatus(item.id, e.target.value as ZznStatus)}
          className="border border-slate-300 rounded-md px-2 py-1"
        >
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {ZZN_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-slate-500 mb-1">Naročeno v SAP</label>
        <button
          onClick={() => toggleProcessed(item.id, !item.processed)}
          className={`px-3 py-1 rounded-md border ${item.processed ? "bg-emerald-600 text-white border-emerald-600" : "bg-white border-slate-300"}`}
        >
          {item.processed ? "✓ Naročeno" : "Ni naročeno"}
        </button>
      </div>
      <div>
        <label className="block text-slate-500 mb-1">Prestavi na nabavnika</label>
        <div className="flex gap-1">
          <input
            value={newBuyer}
            onChange={(e) => setNewBuyer(e.target.value)}
            placeholder="npr. MANCA"
            className="border border-slate-300 rounded-md px-2 py-1 w-32"
          />
          <button onClick={() => reassignZznBuyer(item.id, newBuyer)} className="bg-slate-700 text-white px-2 py-1 rounded-md">
            Prestavi
          </button>
        </div>
      </div>
      <div>
        <label className="block text-slate-500 mb-1">Izbriši (z razlogom)</label>
        <div className="flex gap-1">
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Razlog" className="border border-slate-300 rounded-md px-2 py-1 w-40" />
          <button onClick={() => softDeleteZzn(item.id, reason)} className="bg-red-600 text-white px-2 py-1 rounded-md">
            Izbriši
          </button>
        </div>
      </div>
      {item.comment && <div className="text-slate-500">Komentar: {item.comment}</div>}
    </div>
  );
}
