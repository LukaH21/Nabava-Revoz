"use server";

import { db } from "@/db";
import { projects, inquiryRounds, quotes, suppliers } from "@/db/schema";
import { eq, desc, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { computeBrokerageFee, getBrokerageSchedules } from "@/lib/brokerage";

export async function createProject(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Naziv projekta je obvezen");
  const indocCode = String(formData.get("indocCode") || "").trim() || null;
  const description = String(formData.get("description") || "").trim() || null;
  const estimatedValueRaw = String(formData.get("estimatedValue") || "").trim();
  const estimatedValue = estimatedValueRaw ? Number(estimatedValueRaw) : null;

  const [project] = await db
    .insert(projects)
    .values({ name, indocCode, description, estimatedValue })
    .returning();

  // prvi krog povpraševanja se ustvari samodejno
  await db.insert(inquiryRounds).values({ projectId: project.id, roundNumber: 1 });

  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
}

export async function updateProjectStatus(projectId: string, status: "ODPRTO" | "DODELJENO" | "ZAKLJUCENO") {
  await db
    .update(projects)
    .set({ status, closedAt: status === "ZAKLJUCENO" ? new Date().toISOString() : null, updatedAt: new Date().toISOString() })
    .where(eq(projects.id, projectId));
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
}

export async function addRound(projectId: string, reason: string) {
  const [{ maxRound }] = await db
    .select({ maxRound: max(inquiryRounds.roundNumber) })
    .from(inquiryRounds)
    .where(eq(inquiryRounds.projectId, projectId));

  const nextRound = (maxRound ?? 0) + 1;
  const [round] = await db
    .insert(inquiryRounds)
    .values({ projectId, roundNumber: nextRound, reason: reason || null })
    .returning();

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}/rounds/${round.id}`);
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

  revalidatePath(`/projects/${projectId}/rounds/${roundId}`);
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
  }

  revalidatePath(`/projects/${projectId}/rounds/${roundId}`);
}

export async function markWinner(quoteId: string, projectId: string, roundId: string) {
  const roundQuotes = await db.select().from(quotes).where(eq(quotes.roundId, roundId));
  for (const q of roundQuotes) {
    await db
      .update(quotes)
      .set({ isWinner: q.id === quoteId })
      .where(eq(quotes.id, q.id));
  }
  revalidatePath(`/projects/${projectId}/rounds/${roundId}`);
}
