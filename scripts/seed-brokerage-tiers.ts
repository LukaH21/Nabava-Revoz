// Uvoz stopenj provizije za posredništvo (nehomologirani dobavitelji), iz
// "Posredništvo provizija.xlsx" -> list "Posredništvo - provizije".
// Poganjaj z: npx tsx scripts/seed-brokerage-tiers.ts
// Vrednosti so prepisane iz Excela (odstotkovne stopnje glede na znesek).
// Preveri/popravi jih po potrebi v aplikaciji (Nastavitve > Posredništvo).
import { db } from "../src/db";
import { brokerageTiers } from "../src/db/schema";

type Tier = {
  scheduleName: string;
  label: string;
  minAmount: number;
  maxAmount: number;
  feeType: "FIXED" | "PERCENT";
  feeValue: number;
  sortOrder: number;
};

const tiers: Tier[] = [
  // Standard: LUKI, Jeklotehna, Eventus, Gazvoda, Strehca, Haberkorn (min. 12 EUR SLO)
  { scheduleName: "Standard (SLO)", label: "0–400 €", minAmount: 0, maxAmount: 400, feeType: "FIXED", feeValue: 12, sortOrder: 1 },
  { scheduleName: "Standard (SLO)", label: "400–1.000 €", minAmount: 400, maxAmount: 1000, feeType: "PERCENT", feeValue: 3, sortOrder: 2 },
  { scheduleName: "Standard (SLO)", label: "1.000–5.000 €", minAmount: 1000, maxAmount: 5000, feeType: "PERCENT", feeValue: 2, sortOrder: 3 },
  { scheduleName: "Standard (SLO)", label: "5.000–10.000 €", minAmount: 5000, maxAmount: 10000, feeType: "PERCENT", feeValue: 1.7, sortOrder: 4 },
  { scheduleName: "Standard (SLO)", label: "10.000–50.000 €", minAmount: 10000, maxAmount: 50000, feeType: "PERCENT", feeValue: 1.5, sortOrder: 5 },
  { scheduleName: "Standard (SLO)", label: "50.000–100.000 €", minAmount: 50000, maxAmount: 100000, feeType: "PERCENT", feeValue: 1, sortOrder: 6 },
  { scheduleName: "Standard (SLO)", label: "nad 100.000 €", minAmount: 100000, maxAmount: 999999999, feeType: "PERCENT", feeValue: 0.5, sortOrder: 7 },

  // Plačilo z avansom (marža posrednika, min. 18 EUR tujina)
  { scheduleName: "Plačilo z avansom", label: "0–400 €", minAmount: 0, maxAmount: 400, feeType: "FIXED", feeValue: 18, sortOrder: 1 },
  { scheduleName: "Plačilo z avansom", label: "400–1.000 €", minAmount: 400, maxAmount: 1000, feeType: "PERCENT", feeValue: 4, sortOrder: 2 },
  { scheduleName: "Plačilo z avansom", label: "1.000–5.000 €", minAmount: 1000, maxAmount: 5000, feeType: "PERCENT", feeValue: 3, sortOrder: 3 },
  { scheduleName: "Plačilo z avansom", label: "5.000–10.000 €", minAmount: 5000, maxAmount: 10000, feeType: "PERCENT", feeValue: 2.3, sortOrder: 4 },
  { scheduleName: "Plačilo z avansom", label: "10.000–50.000 €", minAmount: 10000, maxAmount: 50000, feeType: "PERCENT", feeValue: 2, sortOrder: 5 },
  { scheduleName: "Plačilo z avansom", label: "50.000–100.000 €", minAmount: 50000, maxAmount: 100000, feeType: "PERCENT", feeValue: 1.5, sortOrder: 6 },
  { scheduleName: "Plačilo z avansom", label: "nad 100.000 €", minAmount: 100000, maxAmount: 999999999, feeType: "PERCENT", feeValue: 1, sortOrder: 7 },

  // Pagras - posredništvo z nadzorom delovišč
  { scheduleName: "Pagras (nadzor delovišč)", label: "0–5.000 €", minAmount: 0, maxAmount: 5000, feeType: "PERCENT", feeValue: 3.5, sortOrder: 1 },
  { scheduleName: "Pagras (nadzor delovišč)", label: "5.000–50.000 €", minAmount: 5000, maxAmount: 50000, feeType: "PERCENT", feeValue: 3, sortOrder: 2 },
  { scheduleName: "Pagras (nadzor delovišč)", label: "50.000–300.000 €", minAmount: 50000, maxAmount: 300000, feeType: "PERCENT", feeValue: 2, sortOrder: 3 },
  { scheduleName: "Pagras (nadzor delovišč)", label: "300.000–500.000 €", minAmount: 300000, maxAmount: 500000, feeType: "PERCENT", feeValue: 1.5, sortOrder: 4 },
  { scheduleName: "Pagras (nadzor delovišč)", label: "500.000–1.000.000 €", minAmount: 500000, maxAmount: 1000000, feeType: "PERCENT", feeValue: 1, sortOrder: 5 },
  { scheduleName: "Pagras (nadzor delovišč)", label: "nad 1.000.000 €", minAmount: 1000000, maxAmount: 999999999, feeType: "PERCENT", feeValue: 0.8, sortOrder: 6 },
];

async function run() {
  await db.delete(brokerageTiers);
  for (const t of tiers) {
    await db.insert(brokerageTiers).values(t);
  }
  console.log(`Vstavljenih ${tiers.length} stopenj provizije (3 sheme).`);
}

run().then(() => process.exit(0));
