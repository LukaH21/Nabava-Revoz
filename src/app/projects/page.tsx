import Link from "next/link";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { desc } from "drizzle-orm";
import { StatusBadge } from "@/app/page";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const all = await db.select().from(projects).orderBy(desc(projects.createdAt));
  const filtered = status ? all.filter((p) => p.status === status) : all;

  const tabs = [
    { key: "", label: "Vse" },
    { key: "ODPRTO", label: "Odprto" },
    { key: "DODELJENO", label: "Dodeljeno" },
    { key: "ZAKLJUCENO", label: "Zaključeno" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">Analize ponudb</h1>
        <Link href="/projects/new" className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700">
          + Nov projekt
        </Link>
      </div>

      <div className="flex gap-2">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.key ? `/projects?status=${t.key}` : "/projects"}
            className={`text-sm px-3 py-1.5 rounded-md border ${
              (status || "") === t.key
                ? "bg-slate-800 text-white border-slate-800"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
        {filtered.length === 0 && <p className="p-6 text-slate-400 text-sm">Ni projektov v tem statusu.</p>}
        {filtered.map((p) => (
          <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center justify-between p-4 hover:bg-slate-50">
            <div>
              <div className="font-medium text-slate-800">{p.name}</div>
              <div className="text-xs text-slate-400">
                {p.indocCode ? `${p.indocCode} · ` : ""}
                {p.nabavnik}
                {p.esdcRequired ? " · ESDC potreben" : ""}
              </div>
            </div>
            <StatusBadge status={p.status} />
          </Link>
        ))}
      </div>
    </div>
  );
}
