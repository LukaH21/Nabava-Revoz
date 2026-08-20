"use server";

import { db } from "@/db";
import { zznItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function toggleProcessed(itemId: string, processed: boolean) {
  await db
    .update(zznItems)
    .set({ processed, processedAt: processed ? new Date().toISOString() : null })
    .where(eq(zznItems.id, itemId));
  revalidatePath("/zzn");
  revalidatePath("/activities");
}
