import { db } from "@/db";
import { projects, inquiryRounds, quotes, activityLog, projectSuppliers, suppliers } from "@/db/schema";
import { eq, asc, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "@/app/page";
import { addRound, updateProjectStatus, addNote, addPanelSupplier, removePanelSupplier, uploadCdcDocument } from "@/app/actions";
import { DeadlineBadge } from "@/components/DeadlineBadge";
import SupplierPicker from "@/components/SupplierPicker";
import PanelConfirm from "@/components/PanelConfirm";

const activityIcons: Record<string, string> = {
  INFO: "•",
  DEADLINE: "⏱",
  NOTE: "📝",
  STATUS: "↻",
  WINNER: "🏆",
  QUOTE: "✉",
};

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

  const activity = await db.select().from(activityLog).where(eq(activityLog.projectId, id)).orderBy(desc(activityLog.createdAt));

  const panel = await db
    .select({
      id: projectSuppliers.id,
      supplierId: projectSuppliers.supplierId,
      supplierNameFreeText: projectSuppliers.supplierNameFreeText,
      name: suppliers.name,
    })
    .from(projectSuppliers)
    .leftJoin(suppliers, eq(projectSuppliers.supplierId, suppliers.id))
    .where(eq(projectSuppliers.projectId, id));

  const allSuppliers = await db
    .select({ id: suppliers.id, name: suppliers.name, homologated: suppliers.homologated })
    .from(suppliers)
    .orderBy(asc(suppliers.name));

  // dashboard analitika
  const allQuotes = roundsWithQuotes.flatMap((r) => r.quotes);
  const respondedCount = allQuotes.filter((q) => q.responded || Number(q.subtotal) > 0 || q.finalPrice).length;
  const pricesWithValue = allQuotes.map((q) => q.finalPrice ?? (q.totalWithBrokerage > 0 ? q.totalWithBrokerage : null)).filter((v): v is number => v !== null && v > 0);
  const minPrice = pricesWithValue.length ? Math.min(...pricesWithValue) : null;
  const maxPrice = pricesWithValue.length ? Math.max(...pricesWithValue) : null;
  const winner = allQuotes.find((q) => q.isWinner);
  const savings = winner && maxPrice && winner.finalPrice ? maxPrice - winner.finalPrice : null;

  async function setStatus(formData: FormData) {
    "use server";
    const status = String(formData.get("status")) as "ODPRTO" | "DODELJENO" | "ZAKLJUCENO";
    await updateProjectStatus(id, status);
  }

  async function createRound(formData: FormData) {
    "use server";
    const reason = String(formData.get("reason") || "");
    const submissionDeadline = String(formData.get("submissionDeadline") || "") || undefined;
    await addRound(id, reason, submissionDeadline);
  }

  async function submitNote(formData: FormData) {
    "use server";
    const message = String(formData.get("message") || "");
    await addNote(id, message);
  }

  const addPanelAction = async (formData: FormData) => {
    "use server";
    const supplierId = String(formData.get("supplierId") || "").trim() || null;
    const supplierNameFreeText = String(formData.get("supplierNameFreeText") || "").trim() || null;
    await addPanelSupplier(id, supplierId, supplierNameFreeText);
  };

  const uploadCdcAction = async (formData: FormData) => {
    "use server";
    await uploadCdcDocument(id, formData);
  };

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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <div className="text-xs text-slate-400">Krogov / ponudb</div>
          <div className="text-lg font-semibold text-slate-800">
            {rounds.length} / {allQuotes.length}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <div className="text-xs text-slate-400">Odgovorilo dobaviteljev</div>
          <div className="text-lg font-semibold text-slate-800">{respondedCount}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <div className="text-xs text-slate-400">Razpon cen</div>
          <div className="text-lg font-semibold text-slate-800">
            {minPrice !== null ? `${minPrice.toFixed(0)}–${maxPrice?.toFixed(0)} €` : "–"}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <div className="text-xs text-slate-400">Prihranek (max vs. izbrano)</div>
          <div className="text-lg font-semibold text-emerald-600">{savings !== null ? `${savings.toFixed(0)} €` : "–"}</div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <h2 className="font-medium text-slate-700 text-sm">Tehnični kontakt in dokumentacija</h2>
            <div className="text-sm text-slate-600">
              {project.technicalContactName || "—"}
              {project.technicalContactPhone && ` · ${project.technicalContactPhone}`}
              {project.technicalContactEmail && ` · ${project.technicalContactEmail}`}
            </div>
            {project.cdcFileUrl ? (
              <a href={project.cdcFileUrl} target="_blank" className="text-xs text-blue-600 hover:underline">
                📎 {project.cdcFileName || "CDC dokument"}
              </a>
            ) : (
              <p className="text-xs text-slate-400">Ni naloženega CDC dokumenta.</p>
            )}
            <form action={uploadCdcAction} encType="multipart/form-data" className="flex gap-2 items-center">
              <input type="file" name="file" className="text-xs" />
              <button className="text-xs bg-slate-800 text-white px-3 py-1.5 rounded-md hover:bg-slate-900">Naloži CDC</button>
            </form>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <h2 className="font-medium text-slate-700 text-sm">Panel dobaviteljev</h2>
            <div className="flex flex-wrap gap-2">
              {panel.length === 0 && <p className="text-xs text-slate-400">Panel še ni določen.</p>}
              {panel.map((p) => (
                <form key={p.id} action={async () => { "use server"; await removePanelSupplier(p.id, id); }}>
                  <button className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-full hover:bg-red-100 hover:text-red-700">
                    {p.name || p.supplierNameFreeText} ×
                  </button>
                </form>
              ))}
            </div>
            <form action={addPanelAction} className="flex gap-2 items-end">
              <SupplierPicker suppliers={allSuppliers} />
              <button className="bg-slate-700 text-white px-3 py-2 rounded-md text-sm hover:bg-slate-800">+ Dodaj v panel</button>
            </form>
            <PanelConfirm
              projectId={id}
              projectName={project.name}
              panelConfirmed={project.panelConfirmed}
              initialName={project.technicalContactName || ""}
              initialPhone={project.technicalContactPhone || ""}
              initialEmail={project.technicalContactEmail || ""}
              panelEmpty={panel.length === 0}
            />
          </div>

          <h2 className="font-medium text-slate-700">Krogi povpraševanja</h2>
          <div className="space-y-3">
            {roundsWithQuotes.map((r) => {
              const winnerR = r.quotes.find((q) => q.isWinner);
              return (
                <Link
                  key={r.id}
                  href={`/projects/${id}/rounds/${r.id}`}
                  className="block bg-white border border-slate-200 rounded-lg p-4 hover:border-slate-300"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-slate-800">
                        Krog {r.roundNumber} {r.closed && <span className="text-xs text-slate-400">(zaprt)</span>}
                      </div>
                      {r.reason && <div className="text-xs text-slate-400">{r.reason}</div>}
                    </div>
                    <div className="text-right space-y-1">
                      <div className="text-sm text-slate-500">
                        {r.quotes.length} {r.quotes.length === 1 ? "ponudba" : "ponudb"}
                        {winnerR && <span className="ml-2 text-emerald-600 font-medium">Izbran: {winnerR.supplierNameFreeText || "dobavitelj"}</span>}
                      </div>
                      <DeadlineBadge deadline={r.submissionDeadline} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          <form action={createRound} className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="text-sm font-medium text-slate-700">Nov krog povpraševanja (npr. zaradi spremenjenih tehničnih zahtev)</div>
            <div className="flex gap-3 items-end flex-wrap">
              <div className="flex-1 min-w-48">
                <label className="block text-xs text-slate-500 mb-1">Razlog</label>
                <input name="reason" placeholder="Razlog za nov krog" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Rok oddaje ponudb</label>
                <input type="date" name="submissionDeadline" className="border border-slate-300 rounded-md px-3 py-2 text-sm" />
              </div>
              <button className="bg-slate-800 text-white px-4 py-2 rounded-md text-sm hover:bg-slate-900">+ Nov krog</button>
            </div>
          </form>
        </div>

        <div className="space-y-3">
          <h2 className="font-medium text-slate-700">Aktivnosti</h2>
          <form action={submitNote} className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
            <textarea name="message" rows={2} placeholder="Dodaj opombo…" className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm" />
            <button className="text-xs bg-slate-800 text-white px-3 py-1.5 rounded-md hover:bg-slate-900">Dodaj opombo</button>
          </form>
          <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-[32rem] overflow-y-auto">
            {activity.length === 0 && <p className="p-3 text-xs text-slate-400">Še ni aktivnosti.</p>}
            {activity.map((a) => (
              <div key={a.id} className="p-3 text-xs flex gap-2">
                <span>{activityIcons[a.type] || "•"}</span>
                <div>
                  <div className="text-slate-700">{a.message}</div>
                  <div className="text-slate-400 mt-0.5">{new Date(a.createdAt).toLocaleString("sl-SI")}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
