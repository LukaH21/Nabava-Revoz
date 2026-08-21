"use server";

import { db } from "@/db";
import { zznItems } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { ZznStatus } from "./constants";

export async function toggleProcessed(itemId: string, processed: boolean) {
  await db
    .update(zznItems)
    .set({
      processed,
      processedAt: processed ? new Date().toISOString() : null,
      status: processed ? "NAROCENO" : "DODELJENO",
    })
    .where(eq(zznItems.id, itemId));
  revalidatePath("/zzn");
  revalidatePath("/activities");
}

export async function setZznStatus(itemId: string, status: ZznStatus) {
  await db
    .update(zznItems)
    .set({
      status,
      processed: status === "NAROCENO",
      processedAt: status === "NAROCENO" ? new Date().toISOString() : null,
    })
    .where(eq(zznItems.id, itemId));
  revalidatePath("/zzn");
  revalidatePath("/activities");
}

export async function bulkSetStatus(itemIds: string[], status: ZznStatus) {
  if (itemIds.length === 0) return;
  await db
    .update(zznItems)
    .set({
      status,
      processed: status === "NAROCENO",
      processedAt: status === "NAROCENO" ? new Date().toISOString() : null,
    })
    .where(inArray(zznItems.id, itemIds));
  revalidatePath("/zzn");
  revalidatePath("/activities");
}

// Nastavi seznam dobaviteljev za povpraševanje na izbranih ZZN postavkah in jih premakne
// v status "V povpraševanju" — to jih hkrati uvrsti v isto skupino povpraševanja (grupirano
// po enaki množici dobaviteljev), ki se prikaže spodaj na strani z gumbom za email.
export async function setZznInquirySuppliers(itemIds: string[], supplierIds: string[]) {
  if (itemIds.length === 0) return;
  const json = JSON.stringify([...supplierIds].sort());
  await db
    .update(zznItems)
    .set({ inquirySupplierIds: json, status: "V_POVPRASEVANJU" })
    .where(inArray(zznItems.id, itemIds));
  revalidatePath("/zzn");
}

export async function softDeleteZzn(itemId: string, reason: string) {
  await db
    .update(zznItems)
    .set({ manuallyDeleted: true, deletedReason: reason || null, deletedAt: new Date() })
    .where(eq(zznItems.id, itemId));
  revalidatePath("/zzn");
}

export async function restoreZzn(itemId: string) {
  await db
    .update(zznItems)
    .set({ manuallyDeleted: false, deletedReason: null, deletedAt: null })
    .where(eq(zznItems.id, itemId));
  revalidatePath("/zzn");
}

export async function reassignZznBuyer(itemId: string, newBuyer: string) {
  await db
    .update(zznItems)
    .set({ buyerOverride: newBuyer || null })
    .where(eq(zznItems.id, itemId));
  revalidatePath("/zzn");
}

export async function addManualZzn(formData: FormData) {
  const internalOrder = String(formData.get("internalOrder") || "").trim();
  if (!internalOrder) throw new Error("Interno naročilo je obvezno");
  const itemPosition = Number(formData.get("itemPosition") || 10) || 10;
  const material = String(formData.get("material") || "").trim() || null;
  const materialName = String(formData.get("materialName") || "").trim() || null;
  const quantity = Number(formData.get("quantity") || "") || null;
  const unit = String(formData.get("unit") || "").trim() || null;
  const comment = String(formData.get("comment") || "").trim() || null;

  await db.insert(zznItems).values({
    internalOrder,
    itemPosition,
    material,
    materialName,
    quantity,
    unit,
    comment,
    buyer: "LUKA",
    status: "DODELJENO",
  });
  revalidatePath("/zzn");
}
