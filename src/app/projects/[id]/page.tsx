import { db } from "@/db";
import { projects, inquiryRounds, quotes } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "@/app/page";
import { addRound, updateProjectStatus } from "@/app/actions";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  if (!project) notFound();

  const rounds = await db
    .select()
    .from(inquiryRounds)
    .where(eq(inquiryRounds.projectId, id))
    .orderBy(asc(inquiryRounds.roundNumber));

  const roundsWithQuotes = await Promise.all(
    rounds.map(async (r) => {
      const rq = await db.select().from(quotes).where(eq(quotes.roundId, r.id));
      return { ...r, quotes: rq };
    }),
  );

  async function setStatus(formData: FormData) {
    "use server";
    const status = String(formData.get("status")) as "ODPRTO" | "DODELJENO" | "ZAKLJUCENO";
    await updateProjectStatus(id, status);
  }

  async function createRound(formData: FormData) {
    "use server";
    const reason = String(formData.get("reason") || "");
    await addRound(id, reason);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">{project.name}</h1>
          <div className="text-sm text-slate-500 mt-1">
            {project.indocCode && <span>{project.indocCode} · </span>}
            Nabavnik: {project.nabavnik}
          </div>
          {project.description && <p className="text-sm text-slate-600 mt-2 max-w-2xl">{project.description}</p>}
        </div>
        <StatusBadge status={project.status} />
      </div>

      {project.esdcRequired && (
        <div className="bg-orange-50 border border-orange-200 text-orange-800 text-sm rounded-md p-3">
          Vrednost presega 5.000 € — potrebna je potrditev izbora dobavitelja (ESDC).
        </div>
      )}

      <form action={setStatus} className="flex gap-2 items-center text-sm">
        <span className="text-slate-500">Status:</span>
        {(["ODPRTO", "DODELJENO", "ZAKLJUCENO"] as const).map((s) => (
          <button
            key={s}
            name="status"
            value={s}
            className={`px-3 py-1 rounded-md border ${
              project.status === s ? "bg-slate-800 text-white border-slate-800" : "bg-white border-slate-200 hover:bg-slate-50"
            }`}
          >
            {s === "ODPRTO" ? "Odprto" : s === "DODELJENO" ? "Dodeljeno" : "Zaključeno"}
          </button>
        ))}
      </form>

      <div className="flex items-center justify-between">
        <h2 className="font-medium text-slate-700">Krogi povpraševanja</h2>
      </div>

      <div className="space-y-3">
        {roundsWithQuotes.map((r) => {
          const winner = r.quotes.find((q) => q.isWinner);
          return (
            <Link
              key={r.id}
              href={`/projects/${id}/rounds/${r.id}`}
              className="block bg-white border border-slate-200 rounded-lg p-4 hover:border-slate-300"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-800">Krog {r.roundNumber}</div>
                  {r.reason && <div className="text-xs text-slate-400">{r.reason}</div>}
                </div>
                <div className="text-sm text-slate-500">
                  {r.quotes.length} {r.quotes.length === 1 ? "ponudba" : "ponudb"}
                  {winner && <span className="ml-2 text-emerald-600 font-medium">Izbran: {winner.supplierNameFreeText || "dobavitelj"}</span>}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <form action={createRound} className="bg-white border border-slate-200 rounded-lg p-4 flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Nov krog povpraševanja (npr. zaradi spremenjenih tehničnih zahtev)
          </label>
          <input name="reason" placeholder="Razlog za nov krog" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
        </div>
        <button className="bg-slate-800 text-white px-4 py-2 rounded-md text-sm hover:bg-slate-900">+ Nov krog</button>
      </form>
    </div>
  );
}
