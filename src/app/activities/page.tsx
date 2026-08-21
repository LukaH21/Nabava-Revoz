import Link from "next/link";
import { db } from "@/db";
import { projects, inquiryRounds, quotes, activityLog, zznItems } from "@/db/schema";
import { and, eq, desc, ne } from "drizzle-orm";
import { DeadlineBadge, daysUntil } from "@/components/DeadlineBadge";

const activityIcons: Record<string, string> = {
  INFO: "•",
  DEADLINE: "⏱",
  NOTE: "📝",
  STATUS: "↻",
  WINNER: "🏆",
  QUOTE: "✉",
};

export default async function ActivitiesPage() {
  const allProjects = await db.select().from(projects).where(ne(projects.status, "ZAKLJUCENO"));
  const allRounds = await db.select().from(inquiryRounds);
  const allQuotes = await db.select().from(quotes);
  const recentActivity = await db.select().from(activityLog).orderBy(desc(activityLog.createdAt)).limit(30);
  const projectById = new Map(allProjects.map((p) => [p.id, p]));

  const roundsByProject = new Map<string, typeof allRounds>();
  for (const r of allRounds) {
    if (!roundsByProject.has(r.projectId)) roundsByProject.set(r.projectId, []);
    roundsByProject.get(r.projectId)!.push(r);
  }
  const quotesByRound = new Map<string, typeof allQuotes>();
  for (const q of allQuotes) {
    if (!quotesByRound.has(q.roundId)) quotesByRound.set(q.roundId, []);
    quotesByRound.get(q.roundId)!.push(q);
  }

  // Potrebna pozornost: odprti krogi brez ponudb, roki, ki so potekli ali so blizu
  type Attention = { project: (typeof allProjects)[number]; round: (typeof allRounds)[number]; reason: string; severity: "high" | "medium" };
  const attention: Attention[] = [];
  for (const r of allRounds) {
    if (r.closed) continue;
    const project = projectById.get(r.projectId);
    if (!project) continue;
    const roundQuotes = quotesByRound.get(r.id) || [];
    const days = daysUntil(r.submissionDeadline);

    if (roundQuotes.length === 0) {
      attention.push({ project, round: r, reason: `Krog ${r.roundNumber} — še ni dodane nobene ponudbe`, severity: "medium" });
    }
    if (days !== null && days < 0) {
      attention.push({ project, round: r, reason: `Krog ${r.roundNumber} — rok oddaje ponudb je potekel (${r.submissionDeadline})`, severity: "high" });
    } else if (days !== null && days <= 2) {
      attention.push({ project, round: r, reason: `Krog ${r.roundNumber} — rok oddaje čez ${days} dni (${r.submissionDeadline})`, severity: "medium" });
    }
  }
  const esdcPending = allProjects.filter((p) => p.esdcRequired && p.status !== "ZAKLJUCENO");
  const unprocessedZznCount = (
    await db.select().from(zznItems).where(and(ne(zznItems.status, "NAROCENO"), eq(zznItems.manuallyDeleted, false)))
  ).length;
  const panelNotConfirmed = allProjects.filter((p) => !p.panelConfirmed).length;

  const totalQuotesPending = allQuotes.filter((q) => !q.technicallyConfirmed || !q.commerciallyConfirmed).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Aktivnosti</h1>
        <p className="text-slate-500 mt-1">Kje je kateri projekt v nabavnem postopku, kaj potrebuje pozornost.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="border rounded-lg p-4 bg-slate-50 border-slate-200">
          <div className="text-2xl font-semibold text-slate-800">{allProjects.length}</div>
          <div className="text-sm text-slate-600">Aktivnih projektov</div>
        </div>
        <div className="border rounded-lg p-4 bg-amber-50 border-amber-200">
          <div className="text-2xl font-semibold text-amber-700">{totalQuotesPending}</div>
          <div className="text-sm text-amber-700">Ponudb še ni potrjenih</div>
        </div>
        <div className="border rounded-lg p-4 bg-red-50 border-red-200">
          <div className="text-2xl font-semibold text-red-700">{attention.filter((a) => a.severity === "high").length}</div>
          <div className="text-sm text-red-700">Roki potekli</div>
        </div>
        <div className="border rounded-lg p-4 bg-orange-50 border-orange-200">
          <div className="text-2xl font-semibold text-orange-700">{esdcPending.length}</div>
          <div className="text-sm text-orange-700">Čaka ESDC</div>
        </div>
        <div className="border rounded-lg p-4 bg-purple-50 border-purple-200">
          <div className="text-2xl font-semibold text-purple-700">{panelNotConfirmed}</div>
          <div className="text-sm text-purple-700">Panel še ni potrjen</div>
        </div>
      </div>

      <div>
        <h2 className="font-medium text-slate-700 mb-3">Potrebna pozornost</h2>
        <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
          {attention.length === 0 && <p className="p-4 text-sm text-slate-400">Nič ne kliče po pozornosti — lepo.</p>}
          {attention
            .sort((a, b) => (a.severity === "high" ? -1 : 1))
            .map((a, i) => (
              <Link
                key={i}
                href={`/projects/${a.project.id}/rounds/${a.round.id}`}
                className="flex items-center justify-between p-3 hover:bg-slate-50"
              >
                <div>
                  <div className="text-sm font-medium text-slate-800">{a.project.name}</div>
                  <div className="text-xs text-slate-500">{a.reason}</div>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${
                    a.severity === "high" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
                  }`}
                >
                  {a.severity === "high" ? "Nujno" : "Kmalu"}
                </span>
              </Link>
            ))}
        </div>
      </div>

      {unprocessedZznCount > 0 && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-md p-3 flex items-center justify-between">
          <span>{unprocessedZznCount} vrstic v ZZN PHF še ni naročenih (razni statusi).</span>
          <Link href="/zzn" className="underline">
            Odpri ZZN PHF →
          </Link>
        </div>
      )}

      <div>
        <h2 className="font-medium text-slate-700 mb-3">Pregled po projektih</h2>
        <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
          {allProjects.length === 0 && <p className="p-4 text-sm text-slate-400">Ni aktivnih projektov.</p>}
          {allProjects.map((p) => {
            const rounds = (roundsByProject.get(p.id) || []).sort((a, b) => b.roundNumber - a.roundNumber);
            const latestRound = rounds[0];
            const roundQuotes = latestRound ? quotesByRound.get(latestRound.id) || [] : [];
            const responded = roundQuotes.filter((q) => q.responded).length;
            return (
              <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center justify-between p-4 hover:bg-slate-50">
                <div>
                  <div className="font-medium text-slate-800">{p.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {latestRound ? `Krog ${latestRound.roundNumber} · ${roundQuotes.length} ponudb (${responded} odgovorjenih)` : "brez krogov"}
                    {p.esdcRequired && " · ESDC potreben"}
                  </div>
                </div>
                {latestRound && <DeadlineBadge deadline={latestRound.submissionDeadline} />}
              </Link>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="font-medium text-slate-700 mb-3">Zadnje aktivnosti</h2>
        <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
          {recentActivity.length === 0 && <p className="p-4 text-sm text-slate-400">Še ni beleženih aktivnosti.</p>}
          {recentActivity.map((a) => {
            const project = projectById.get(a.projectId);
            return (
              <div key={a.id} className="p-3 text-sm flex gap-3">
                <span>{activityIcons[a.type] || "•"}</span>
                <div>
                  <span className="text-slate-800">{a.message}</span>
                  <div className="text-xs text-slate-400">
                    {project ? (
                      <Link href={`/projects/${project.id}`} className="hover:underline">
                        {project.name}
                      </Link>
                    ) : (
                      "projekt izbrisan"
                    )}{" "}
                    · {new Date(a.createdAt).toLocaleString("sl-SI")}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
