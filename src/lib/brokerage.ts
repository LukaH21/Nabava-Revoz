import { db } from "@/db";
import { brokerageTiers } from "@/db/schema";
import { asc } from "drizzle-orm";

export type BrokerageTierRow = typeof brokerageTiers.$inferSelect;

export async function getBrokerageSchedules(): Promise<Record<string, BrokerageTierRow[]>> {
  const all = await db.select().from(brokerageTiers).orderBy(asc(brokerageTiers.sortOrder));
  const bySchedule: Record<string, BrokerageTierRow[]> = {};
  for (const t of all) {
    if (!bySchedule[t.scheduleName]) bySchedule[t.scheduleName] = [];
    bySchedule[t.scheduleName].push(t);
  }
  return bySchedule;
}

export function computeBrokerageFee(amount: number, tiers: BrokerageTierRow[]): number {
  if (!amount || amount <= 0 || tiers.length === 0) return 0;
  const tier = tiers.find((t) => amount >= t.minAmount && amount < t.maxAmount) ?? tiers[tiers.length - 1];
  if (tier.feeType === "FIXED") return tier.feeValue;
  return Math.round(amount * (tier.feeValue / 100) * 100) / 100;
}
