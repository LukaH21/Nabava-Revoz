import { db } from "@/db";
import { projects, inquiryRounds, quotes, suppliers } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { addQuote } from "@/app/actions";
import { getBrokerageSchedules } from "@/lib/brokerage";
import SupplierPicker from "@/components/SupplierPicker";
import QuoteCard from "@/components/QuoteCard";

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

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/projects/${projectId}`} className="text-sm text-blue-600 hover:underline">
          ← {project.name}
        </Link>
        <h1 className="text-2xl font-semibold text-slate-800 mt-1">Krog {round.roundNumber} — primerjava ponudb</h1>
        {round.reason && <p className="text-sm text-slate-500">{round.reason}</p>}
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
