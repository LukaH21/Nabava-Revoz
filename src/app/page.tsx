import Link from "next/link";
import { db } from "@/db";
import { projects, suppliers } from "@/db/schema";
import { desc } from "drizzle-orm";

export default async function Home() {
  const allProjects = await db.select().from(projects).orderBy(desc(projects.createdAt));
  const supplierCount = (await db.select().from(suppliers)).length;

  const counts = {
    ODPRTO: allProjects.filter((p) => p.status === "ODPRTO").length,
    DODELJENO: allProjects.filter((p) => p.status === "DODELJENO").length,
    ZAKLJUCENO: allProjects.filter((p) => p.status === "ZAKLJUCENO").length,
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Pregled</h1>
        <p className="text-slate-500 mt-1">Nabavna aplikacija — analize ponudb in baza dobaviteljev.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Odprto" value={counts.ODPRTO} color="bg-amber-50 text-amber-700 border-amber-200" />
        <StatCard label="Dodeljeno" value={counts.DODELJENO} color="bg-blue-50 text-blue-700 border-blue-200" />
        <StatCard label="Zaključeno" value={counts.ZAKLJUCENO} color="bg-emerald-50 text-emerald-700 border-emerald-200" />
        <StatCard label="Dobavitelji v bazi" value={supplierCount} color="bg-slate-50 text-slate-700 border-slate-200" />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-medium text-slate-700">Zadnje analize ponudb</h2>
        <Link href="/projects/new" className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700">
          + Nov projekt
        </Link>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
        {allProjects.length === 0 && (
          <p className="p-6 text-slate-400 text-sm">Ni še nobenega projekta. Ustvari prvega.</p>
        )}
        {allProjects.slice(0, 8).map((p) => (
          <Link
            key={p.id}
            href={`/projects/${p.id}`}
            className="flex items-center justify-between p-4 hover:bg-slate-50"
          >
            <div>
              <div className="font-medium text-slate-800">{p.name}</div>
              {p.indocCode && <div className="text-xs text-slate-400">{p.indocCode}</div>}
            </div>
            <StatusBadge status={p.status} />
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`border rounded-lg p-4 ${color}`}>
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-sm">{label}</div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ODPRTO: "bg-amber-100 text-amber-700",
    DODELJENO: "bg-blue-100 text-blue-700",
    ZAKLJUCENO: "bg-emerald-100 text-emerald-700",
  };
  const labels: Record<string, string> = {
    ODPRTO: "Odprto",
    DODELJENO: "Dodeljeno",
    ZAKLJUCENO: "Zaključeno",
  };
  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-full ${styles[status] || "bg-slate-100"}`}>
      {labels[status] || status}
    </span>
  );
}
