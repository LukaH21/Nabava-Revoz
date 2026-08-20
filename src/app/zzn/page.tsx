import { db } from "@/db";
import { zznItems } from "@/db/schema";
import { asc, desc, eq } from "drizzle-orm";
import { toggleProcessed } from "./actions";

export default async function ZznPage({
  searchParams,
}: {
  searchParams: Promise<{ buyer?: string; status?: string }>;
}) {
  const { buyer, status } = await searchParams;

  const all = await db.select().from(zznItems).orderBy(desc(zznItems.requestDate));
  const buyers = Array.from(new Set(all.map((i) => i.buyer).filter(Boolean))).sort() as string[];

  let filtered = all;
  if (buyer) filtered = filtered.filter((i) => i.buyer === buyer);
  if (status === "processed") filtered = filtered.filter((i) => i.processed);
  if (status === "unprocessed") filtered = filtered.filter((i) => !i.processed);

  const totalUnprocessed = all.filter((i) => !i.processed).length;

  async function markProcessed(formData: FormData) {
    "use server";
    const id = String(formData.get("id"));
    const current = String(formData.get("current")) === "true";
    await toggleProcessed(id, !current);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">ZZN PHF</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Tedenska tabela naročil na zalogo (DPG + rezervni deli). {totalUnprocessed} od {all.length} še ni naročenih v SAP.
          </p>
        </div>
      </div>

      <form className="flex gap-2 flex-wrap items-center text-sm">
        <select name="buyer" defaultValue={buyer || ""} className="border border-slate-300 rounded-md px-2 py-1.5">
          <option value="">Vsi nabavniki</option>
          {buyers.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={status || ""} className="border border-slate-300 rounded-md px-2 py-1.5">
          <option value="">Vsi statusi</option>
          <option value="unprocessed">Ni še naročeno</option>
          <option value="processed">Naročeno</option>
        </select>
        <button className="bg-slate-800 text-white px-3 py-1.5 rounded-md">Filtriraj</button>
      </form>

      <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="p-2">Naročeno</th>
              <th className="p-2">Interno naročilo</th>
              <th className="p-2">Material</th>
              <th className="p-2">Naziv</th>
              <th className="p-2">Kol.</th>
              <th className="p-2">Nabavnik</th>
              <th className="p-2">Datum zahteve</th>
              <th className="p-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.slice(0, 300).map((i) => (
              <tr key={i.id} className={i.processed ? "bg-emerald-50/40" : ""}>
                <td className="p-2">
                  <form action={markProcessed}>
                    <input type="hidden" name="id" value={i.id} />
                    <input type="hidden" name="current" value={String(i.processed)} />
                    <button type="submit" className="w-5 h-5 rounded border border-slate-300 flex items-center justify-center hover:border-emerald-400">
                      {i.processed ? "✓" : ""}
                    </button>
                  </form>
                </td>
                <td className="p-2 font-mono text-xs text-slate-600">{i.internalOrder}</td>
                <td className="p-2 font-mono text-xs text-slate-600">{i.material}</td>
                <td className="p-2 text-slate-700 max-w-xs truncate" title={i.materialName || ""}>
                  {i.materialName}
                </td>
                <td className="p-2 text-slate-600">
                  {i.quantity} {i.unit}
                </td>
                <td className="p-2 text-slate-600">{i.buyer}</td>
                <td className="p-2 text-slate-600">{i.requestDate}</td>
                <td className="p-2">
                  {i.unprocessed ? (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">neobdelano</span>
                  ) : (
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">obdelano</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > 300 && (
          <p className="p-3 text-xs text-slate-400">Prikazanih prvih 300 od {filtered.length} zadetkov — zoži filter.</p>
        )}
      </div>
    </div>
  );
}
