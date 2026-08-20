import { db } from "@/db";
import { projects, inquiryRounds, quotes, suppliers } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { addQuote, extendDeadline, closeRound } from "@/app/actions";
import { getBrokerageSchedules } from "@/lib/brokerage";
import SupplierPicker from "@/components/SupplierPicker";
import QuoteCard from "@/components/QuoteCard";
import { DeadlineBadge } from "@/components/DeadlineBadge";
import ExportCsvButton from "@/components/ExportCsvButton";

export default async function RoundPage({
  params,
}: {
  params: Promise<{ id: string; roundId: string }>;
}) {
  const { id: projectId, roundId } = await params;

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  const [round] = await db.select().from(inquiryRounds).where(eq(inquiryRounds.id, roundId));
  if (!project || !round) notFound();

  const roundQuotes = await db.select().from(quotes).where(eq(quotes.roundId, roundId));
  const allSuppliers = await db
    .select({ id: suppliers.id, name: suppliers.name, homologated: suppliers.homologated })
    .from(suppliers)
    .orderBy(asc(suppliers.name));

  const supplierById = new Map(allSuppliers.map((s) => [s.id, s]));
  const schedules = await getBrokerageSchedules();
  const scheduleNames = Object.keys(schedules);

  const addQuoteAction = addQuote.bind(null, roundId, projectId);

  async function extendDeadlineAction(formData: FormData) {
    "use server";
    const newDeadline = String(formData.get("submissionDeadline") || "");
    if (newDeadline) await extendDeadline(roundId, projectId, newDeadline);
  }

  async function closeRoundAction() {
    "use server";
    await closeRound(roundId, projectId);
  }

  const csvQuotes = roundQuotes.map((q) => ({
    supplierName: (q.supplierId && supplierById.get(q.supplierId)?.name) || q.supplierNameFreeText || "Neznan dobavitelj",
    lineItems: q.lineItems,
    subtotal: q.subtotal,
    brokerageAmount: q.brokerageAmount,
    totalWithBrokerage: q.totalWithBrokerage,
    finalPrice: q.finalPrice,
    isWinner: q.isWinner,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href={`/projects/${projectId}`} className="text-sm text-blue-600 hover:underline">
            ← {project.name}
          </Link>
          <h1 className="text-2xl font-semibold text-slate-800 mt-1">
            Krog {round.roundNumber} — primerjava ponudb {round.closed && <span className="text-sm text-slate-400 font-normal">(zaprt)</span>}
          </h1>
          {round.reason && <p className="text-sm text-slate-500">{round.reason}</p>}
        </div>
        <ExportCsvButton quotes={csvQuotes} filename={`${project.name}-krog${round.roundNumber}.csv`} />
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-end gap-4">
        <div>
          <div className="text-xs text-slate-500 mb-1">Trenutni rok oddaje ponudb</div>
          <DeadlineBadge deadline={round.submissionDeadline} />
          {round.deadlineExtensions > 0 && (
            <div className="text-xs text-slate-400 mt-1">Podaljšano {round.deadlineExtensions}×</div>
          )}
        </div>
        <form action={extendDeadlineAction} className="flex gap-2 items-end">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Nov/podaljšan rok</label>
            <input type="date" name="submissionDeadline" required className="border border-slate-300 rounded-md px-2 py-1.5 text-sm" />
          </div>
          <button className="text-sm bg-slate-800 text-white px-3 py-1.5 rounded-md hover:bg-slate-900">Podaljšaj rok</button>
        </form>
        {!round.closed && (
          <form action={closeRoundAction}>
            <button className="text-sm px-3 py-1.5 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50">Zapri krog</button>
          </form>
        )}
      </div>

      <form action={addQuoteAction} className="bg-white border border-slate-200 rounded-lg p-4 flex gap-3 items-end">
        <SupplierPicker suppliers={allSuppliers} />
        <button className="bg-slate-800 text-white px-4 py-2 rounded-md text-sm hover:bg-slate-900">+ Dodaj ponudbo</button>
      </form>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {roundQuotes.length === 0 && (
          <p className="text-slate-400 text-sm">Za ta krog še ni dodanih ponudb. Dodaj dobavitelja zgoraj.</p>
        )}
        {roundQuotes.map((q) => {
          const s = q.supplierId ? supplierById.get(q.supplierId) : undefined;
          return (
            <QuoteCard
              key={q.id}
              quote={q}
              supplierName={s?.name || q.supplierNameFreeText || "Neznan dobavitelj"}
              isHomologated={s?.homologated ?? false}
              scheduleNames={scheduleNames}
              projectId={projectId}
              roundId={roundId}
            />
          );
        })}
      </div>
    </div>
  );
}
