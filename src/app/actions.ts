"use server";

import { db } from "@/db";
import { projects, inquiryRounds, quotes, suppliers, activityLog } from "@/db/schema";
import { eq, desc, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { computeBrokerageFee, getBrokerageSchedules } from "@/lib/brokerage";

async function logActivity(
  projectId: string,
  type: "INFO" | "DEADLINE" | "NOTE" | "STATUS" | "WINNER" | "QUOTE",
  message: string,
) {
  await db.insert(activityLog).values({ projectId, type, message });
}

export async function createProject(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Naziv projekta je obvezen");
  const indocCode = String(formData.get("indocCode") || "").trim() || null;
  const description = String(formData.get("description") || "").trim() || null;
  const estimatedValueRaw = String(formData.get("estimatedValue") || "").trim();
  const estimatedValue = estimatedValueRaw ? Number(estimatedValueRaw) : null;
  const submissionDeadline = String(formData.get("submissionDeadline") || "").trim() || null;

  const [project] = await db
    .insert(projects)
    .values({ name, indocCode, description, estimatedValue })
    .returning();

  // prvi krog povpraševanja se ustvari samodejno
  await db.insert(inquiryRounds).values({ projectId: project.id, roundNumber: 1, submissionDeadline });

  await logActivity(project.id, "INFO", "Projekt ustvarjen, krog 1 odprt.");
  if (submissionDeadline) {
    await logActivity(project.id, "DEADLINE", `Rok oddaje ponudb za krog 1 nastavljen na ${submissionDeadline}.`);
  }

  revalidatePath("/projects");
  revalidatePath("/activities");
  redirect(`/projects/${project.id}`);
}

export async function updateProjectStatus(projectId: string, status: "ODPRTO" | "DODELJENO" | "ZAKLJUCENO") {
  await db
    .update(projects)
    .set({ status, closedAt: status === "ZAKLJUCENO" ? new Date().toISOString() : null, updatedAt: new Date().toISOString() })
    .where(eq(projects.id, projectId));
  const labels: Record<string, string> = { ODPRTO: "Odprto", DODELJENO: "Dodeljeno", ZAKLJUCENO: "Zaključeno" };
  await logActivity(projectId, "STATUS", `Status spremenjen na "${labels[status]}".`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  revalidatePath("/activities");
}

export async function addRound(projectId: string, reason: string, submissionDeadline?: string) {
  const [{ maxRound }] = await db
    .select({ maxRound: max(inquiryRounds.roundNumber) })
    .from(inquiryRounds)
    .where(eq(inquiryRounds.projectId, projectId));

  const nextRound = (maxRound ?? 0) + 1;
  const [round] = await db
    .insert(inquiryRounds)
    .values({ projectId, roundNumber: nextRound, reason: reason || null, submissionDeadline: submissionDeadline || null })
    .returning();

  await logActivity(
    projectId,
    "INFO",
    `Odprt krog ${nextRound} povpraševanja${reason ? ` — ${reason}` : ""}.`,
  );

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/activities");
  redirect(`/projects/${projectId}/rounds/${round.id}`);
}

export async function extendDeadline(roundId: string, projectId: string, newDeadline: string) {
  const [round] = await db.select().from(inquiryRounds).where(eq(inquiryRounds.id, roundId));
  if (!round) throw new Error("Krog ni najden");

  await db
    .update(inquiryRounds)
    .set({ submissionDeadline: newDeadline, deadlineExtensions: round.deadlineExtensions + 1 })
    .where(eq(inquiryRounds.id, roundId));

  await logActivity(
    projectId,
    "DEADLINE",
    `Rok oddaje ponudb za krog ${round.roundNumber} podaljšan${round.submissionDeadline ? ` (bil: ${round.submissionDeadline})` : ""} na ${newDeadline}.`,
  );

  revalidatePath(`/projects/${projectId}/rounds/${roundId}`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/activities");
}

export async function closeRound(roundId: string, projectId: string) {
  const [round] = await db.select().from(inquiryRounds).where(eq(inquiryRounds.id, roundId));
  await db.update(inquiryRounds).set({ closed: true }).where(eq(inquiryRounds.id, roundId));
  await logActivity(projectId, "INFO", `Krog ${round?.roundNumber ?? ""} zaprt.`);
  revalidatePath(`/projects/${projectId}/rounds/${roundId}`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/activities");
}

export async function addNote(projectId: string, message: string) {
  if (!message.trim()) return;
  await logActivity(projectId, "NOTE", message.trim());
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/activities");
}

export async function addQuote(roundId: string, projectId: string, formData: FormData) {
  const supplierId = String(formData.get("supplierId") || "").trim() || null;
  const supplierNameFreeText = String(formData.get("supplierNameFreeText") || "").trim() || null;

  if (!supplierId && !supplierNameFreeText) {
    throw new Error("Izberi dobavitelja ali vnesi ime");
  }

  let homologated = true;
  if (supplierId) {
    const [s] = await db.select().from(suppliers).where(eq(suppliers.id, supplierId));
    homologated = s?.homologated ?? true;
  } else {
    homologated = false; // dobavitelj, ki ni v bazi, obravnavamo kot nehomologiran
  }

  await db.insert(quotes).values({
    roundId,
    supplierId,
    supplierNameFreeText,
    lineItems: JSON.stringify([
      { label: "Ponudba", value: "", includeInTotal: true },
    ]),
    notes: homologated ? null : "Nehomologiran dobavitelj – preveri posredništvo",
  });

  const displayName = supplierId
    ? (await db.select().from(suppliers).where(eq(suppliers.id, supplierId)))[0]?.name
    : supplierNameFreeText;
  await logActivity(projectId, "QUOTE", `Dodana ponudba: ${displayName || "dobavitelj"}.`);

  revalidatePath(`/projects/${projectId}/rounds/${roundId}`);
  revalidatePath("/activities");
}

export async function deleteQuote(quoteId: string, projectId: string, roundId: string) {
  await db.delete(quotes).where(eq(quotes.id, quoteId));
  revalidatePath(`/projects/${projectId}/rounds/${roundId}`);
}

export type LineItem = { label: string; value: string; includeInTotal: boolean };

export async function updateQuote(
  quoteId: string,
  projectId: string,
  roundId: string,
  data: {
    lineItems: LineItem[];
    applyBrokerage: boolean;
    brokerageSchedule?: string;
    technicallyConfirmed: boolean;
    commerciallyConfirmed: boolean;
    finalPrice: number | null;
    notes: string | null;
  },
) {
  const subtotal = data.lineItems
    .filter((li) => li.includeInTotal)
    .reduce((sum, li) => sum + (Number(li.value.toString().replace(",", ".")) || 0), 0);

  let brokerageAmount = 0;
  if (data.applyBrokerage && data.brokerageSchedule) {
    const schedules = await getBrokerageSchedules();
    const tiers = schedules[data.brokerageSchedule] || [];
    brokerageAmount = computeBrokerageFee(subtotal, tiers);
  }

  const totalWithBrokerage = subtotal + brokerageAmount;

  await db
    .update(quotes)
    .set({
      lineItems: JSON.stringify(data.lineItems),
      subtotal,
      brokerageAmount,
      totalWithBrokerage,
      technicallyConfirmed: data.technicallyConfirmed,
      commerciallyConfirmed: data.commerciallyConfirmed,
      finalPrice: data.finalPrice,
      notes: data.notes,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(quotes.id, quoteId));

  // ESDC: naročila nad 5.000 EUR potrebujejo potrditev izbora dobavitelja
  if (data.finalPrice && data.finalPrice > 5000) {
    await db.update(projects).set({ esdcRequired: true }).where(eq(projects.id, projectId));
    await logActivity(projectId, "INFO", `Končna cena ${data.finalPrice.toFixed(2)} € presega 5.000 € — potreben ESDC.`);
  }

  revalidatePath(`/projects/${projectId}/rounds/${roundId}`);
  revalidatePath("/activities");
}

export async function markWinner(quoteId: string, projectId: string, roundId: string) {
  const roundQuotes = await db.select().from(quotes).where(eq(quotes.roundId, roundId));
  for (const q of roundQuotes) {
    await db
      .update(quotes)
      .set({ isWinner: q.id === quoteId })
      .where(eq(quotes.id, q.id));
  }
  const winner = roundQuotes.find((q) => q.id === quoteId);
  const [s] = winner?.supplierId ? await db.select().from(suppliers).where(eq(suppliers.id, winner.supplierId)) : [];
  await logActivity(projectId, "WINNER", `Izbran dobavitelj: ${s?.name || winner?.supplierNameFreeText || "?"}.`);
  revalidatePath(`/projects/${projectId}/rounds/${roundId}`);
  revalidatePath("/activities");
}
