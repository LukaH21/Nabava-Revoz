import { db } from "@/db";
import { zznItems, suppliers } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import ZznTable from "./ZznTable";
import { addManualZzn } from "./actions";

export default async function ZznPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const showDeleted = view === "deleted";

  const all = await db.select().from(zznItems).orderBy(desc(zznItems.requestDate));
  const allSuppliers = await db
    .select({
      id: suppliers.id,
      name: suppliers.name,
      generalEmail: suppliers.generalEmail,
      commercialEmail: suppliers.commercialEmail,
      orderEmail: suppliers.orderEmail,
    })
    .from(suppliers)
    .where(eq(suppliers.active, true));

  const active = all.filter((i) => !i.manuallyDeleted);
  const deleted = all.filter((i) => i.manuallyDeleted);
  const items = showDeleted ? deleted : active;

  const totalUnprocessed = active.filter((i) => !i.processed).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">ZZN PHF</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Tedenska tabela naročil na zalogo (DPG + rezervni deli) — nabavnik Luka. {totalUnprocessed} od {active.length} še ni naročenih v SAP.
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <a
            href="/zzn"
            className={`px-3 py-1.5 rounded-md border ${!showDeleted ? "bg-slate-800 text-white border-slate-800" : "bg-white border-slate-200"}`}
          >
            Aktivni ({active.length})
          </a>
          <a
            href="/zzn?view=deleted"
            className={`px-3 py-1.5 rounded-md border ${showDeleted ? "bg-slate-800 text-white border-slate-800" : "bg-white border-slate-200"}`}
          >
            Brisani ({deleted.length})
          </a>
        </div>
      </div>

      <ZznTable items={items} suppliers={allSuppliers} showDeleted={showDeleted} />

      {!showDeleted && (
        <details className="bg-white border border-slate-200 rounded-lg p-4">
          <summary className="text-sm font-medium text-slate-700 cursor-pointer">+ Ročno dodaj ZZN postavko</summary>
          <form action={addManualZzn} className="grid sm:grid-cols-3 gap-3 mt-3 text-sm">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Interno naročilo *</label>
              <input name="internalOrder" required className="w-full border border-slate-300 rounded-md px-2 py-1.5" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Postavka</label>
              <input name="itemPosition" type="number" defaultValue={10} className="w-full border border-slate-300 rounded-md px-2 py-1.5" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Material</label>
              <input name="material" className="w-full border border-slate-300 rounded-md px-2 py-1.5" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-500 mb-1">Naziv</label>
              <input name="materialName" className="w-full border border-slate-300 rounded-md px-2 py-1.5" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Količina</label>
              <input name="quantity" type="number" step="any" className="w-full border border-slate-300 rounded-md px-2 py-1.5" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Enota</label>
              <input name="unit" className="w-full border border-slate-300 rounded-md px-2 py-1.5" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-500 mb-1">Komentar</label>
              <input name="comment" className="w-full border border-slate-300 rounded-md px-2 py-1.5" />
            </div>
            <div className="sm:col-span-3">
              <button className="bg-slate-800 text-white px-4 py-2 rounded-md text-sm hover:bg-slate-900">+ Dodaj</button>
            </div>
          </form>
        </details>
      )}
    </div>
  );
}
