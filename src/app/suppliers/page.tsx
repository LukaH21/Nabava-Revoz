import { db } from "@/db";
import { suppliers } from "@/db/schema";
import { asc } from "drizzle-orm";

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const all = await db.select().from(suppliers).orderBy(asc(suppliers.name));
  const filtered = q
    ? all.filter(
        (s) =>
          s.name.toLowerCase().includes(q.toLowerCase()) ||
          (s.buyerName || "").toLowerCase().includes(q.toLowerCase()) ||
          (s.city || "").toLowerCase().includes(q.toLowerCase()),
      )
    : all;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">Dobavitelji</h1>
        <span className="text-sm text-slate-500">{all.length} v bazi</span>
      </div>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Išči po imenu, nabavniku ali mestu…"
          className="w-full max-w-md border border-slate-300 rounded-md px-3 py-2 text-sm"
        />
        <button className="bg-slate-800 text-white px-4 py-2 rounded-md text-sm">Išči</button>
      </form>

      <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="p-3">Dobavitelj</th>
              <th className="p-3">Nabavnik</th>
              <th className="p-3">Kontakt</th>
              <th className="p-3">E-mail</th>
              <th className="p-3">Mesto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.slice(0, 200).map((s) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="p-3 font-medium text-slate-800">{s.name}</td>
                <td className="p-3 text-slate-600">{s.buyerName || "—"}</td>
                <td className="p-3 text-slate-600">{s.commercialContact || "—"}</td>
                <td className="p-3 text-slate-600">{s.commercialEmail || s.generalEmail || "—"}</td>
                <td className="p-3 text-slate-600">{s.city || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > 200 && (
          <p className="p-3 text-xs text-slate-400">Prikazanih prvih 200 od {filtered.length} zadetkov — zoži iskanje.</p>
        )}
      </div>
    </div>
  );
}
