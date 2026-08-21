// Uvoz tedenske "ZZN PHF" tabele (naročila na zalogo + rezervni deli).
// Poganjaj z: npx tsx scripts/import-zzn.ts <pot-do-xlsx>
// Varno za ponovni zagon vsak teden: vrstice se "upsertajo" po (Interno naročilo, Postavka),
// lokalni status "naročeno v SAP" (processed) se pri ponovnem uvozu ohrani.
import * as XLSX from "xlsx";
import { db } from "../src/db";
import { zznItems } from "../src/db/schema";
import { and, eq } from "drizzle-orm";

const filePath = process.argv[2];
if (!filePath) {
  console.error("Uporaba: npx tsx scripts/import-zzn.ts <pot-do-xlsx>");
  process.exit(1);
}

const wb = XLSX.readFile(filePath);
const ws = wb.Sheets["ZZN PHF 2026"] || wb.Sheets[wb.SheetNames[0]];
const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });

// Header je v vrstici 1 (index 0):
// [' ', 'Zaporedna št', 'Postavka intern. nar.', 'Oznaka kreiranja', 'Interno naročilo',
//  'Material', 'NAZIV', 'NAZIV FR', 'Zahtevana količina', 'ENOTA MERE', 'Kreirano',
//  'Spremenjeno dne', 'Datum zahteve', 'Datum lansiranja', 'NABAVNIK', 'NADOMEŠČANJE',
//  'neobdelane', 'KOMENTAR', 'dobavitelj', 'datum zadnjega nakupa', 'Nabavnik']
const COL = {
  itemPosition: 2,
  internalOrder: 4,
  material: 5,
  materialName: 6,
  materialNameFr: 7,
  quantity: 8,
  unit: 9,
  createdBy: 10,
  requestDate: 12,
  launchDate: 13,
  buyer: 14,
  replacement: 15,
  unprocessed: 16,
  comment: 17,
  supplier: 18,
  lastPurchaseDate: 19,
};

function s(v: unknown): string | null {
  if (v === undefined || v === null || v === "") return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
}

// Datumski stolpci v Excelu so mešani: pravi Date objekti, surova Excelova
// serijska števila (npr. 45951) in besedilo oblike "6.08.2025" — vse
// normaliziramo v ISO (yyyy-mm-dd) za dosledno razvrščanje/filtriranje.
function dateVal(v: unknown): string | null {
  if (v === undefined || v === null || v === "") return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") {
    // Excelov serijski datum (dnevi od 1899-12-30, upošteva znano napako s prestopnim letom 1900)
    const ms = Math.round((v - 25569) * 86400 * 1000);
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  const str = String(v).trim();
  const m = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) {
    const [, day, month, year] = m;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return str;
}

function n(v: unknown): number | null {
  const str = s(v);
  if (str === null) return null;
  const num = Number(str.replace(",", "."));
  return Number.isFinite(num) ? num : null;
}

async function run() {
  let upserted = 0;
  let skipped = 0;

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] as unknown[];
    if (!row || row.length === 0) continue;
    const internalOrder = s(row[COL.internalOrder]);
    if (!internalOrder) {
      skipped++;
      continue;
    }
    const itemPosition = n(row[COL.itemPosition]) ?? 10;

    const data = {
      internalOrder,
      itemPosition,
      material: s(row[COL.material]),
      materialName: s(row[COL.materialName]),
      materialNameFr: s(row[COL.materialNameFr]),
      quantity: n(row[COL.quantity]),
      unit: s(row[COL.unit]),
      createdBy: s(row[COL.createdBy]),
      requestDate: dateVal(row[COL.requestDate]),
      launchDate: dateVal(row[COL.launchDate]),
      buyer: s(row[COL.buyer]),
      replacement: s(row[COL.replacement]),
      unprocessed: s(row[COL.unprocessed]) === "neobdelane",
      comment: s(row[COL.comment]),
      supplier: s(row[COL.supplier]),
      lastPurchaseDate: dateVal(row[COL.lastPurchaseDate]),
      updatedAt: new Date(),
    };

    const existing = await db
      .select()
      .from(zznItems)
      .where(and(eq(zznItems.internalOrder, internalOrder), eq(zznItems.itemPosition, itemPosition)));

    if (existing.length > 0) {
      // lokalni status "processed" se NE prepiše pri ponovnem uvozu
      await db
        .update(zznItems)
        .set(data)
        .where(and(eq(zznItems.internalOrder, internalOrder), eq(zznItems.itemPosition, itemPosition)));
    } else {
      await db.insert(zznItems).values(data);
    }
    upserted++;
  }

  console.log(`ZZN PHF: uvoženih/posodobljenih ${upserted} vrstic, preskočenih (brez internega naročila) ${skipped}.`);
}

run().then(() => process.exit(0));
