// Uvoz tedenske "ZZN PHF" tabele (naročila na zalogo + rezervni deli).
// Poganjaj z: npx tsx scripts/import-zzn.ts <pot-do-xlsx>
// Varno za ponovni zagon vsak teden: vrstice se "upsertajo" po (Interno naročilo, Postavka).
// Uvažajo se SAMO vrstice, kjer je stolpec NABAVNIK = "LUKA" (za zdaj samo Lukove postavke).
// Lokalni/ročni podatki (status delovnega toka, ročno dodeljen nabavnik, izbris, dobavitelji za
// povpraševanje) se pri ponovnem uvozu OHRANIJO — le če SAP stolpec "neobdelane" pokaže "#N/A"
// (kar pomeni, da je bilo naročilo v SAP že oddano), se status samodejno postavi na "Naročeno".
import * as XLSX from "xlsx";
import { db } from "../src/db";
import { zznItems } from "../src/db/schema";
import { and, eq, ne, isNull } from "drizzle-orm";

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
// Opomba: "Kreirano" (col 10) v resnici vsebuje ime PLANERJA (npr. "Zorko Evgen",
// "MRAZ MARJANA"), ne datuma — v bazi je shranjeno kot `createdBy` in v UI prikazano kot "Planer".
const COL = {
  itemPosition: 2,
  internalOrder: 4,
  material: 5,
  materialName: 6,
  materialNameFr: 7,
  quantity: 8,
  unit: 9,
  createdBy: 10, // planer
  requestDate: 12,
  launchDate: 13,
  buyer: 14,
  replacement: 15,
  unprocessed: 16, // "neobdelane" ali "#N/A" (=> že naročeno v SAP)
  comment: 17,
  supplier: 18,
  lastPurchaseDate: 19,
};

const TARGET_BUYER = "LUKA";

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
  let skippedNoOrder = 0;
  let skippedOtherBuyer = 0;

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] as unknown[];
    if (!row || row.length === 0) continue;
    const internalOrder = s(row[COL.internalOrder]);
    if (!internalOrder) {
      skippedNoOrder++;
      continue;
    }

    const buyerRaw = s(row[COL.buyer]);
    if ((buyerRaw || "").toUpperCase() !== TARGET_BUYER) {
      skippedOtherBuyer++;
      continue;
    }

    const itemPosition = n(row[COL.itemPosition]) ?? 10;

    // "neobdelane" stolpec: besedilo "neobdelane" = še odprto, "#N/A" = SAP formula ne najde
    // več postavke v odprtih naročilih => je bila že naročena.
    const unprocessedRaw = s(row[COL.unprocessed]);
    const alreadyOrderedInSap = unprocessedRaw === "#N/A";

    const data: Record<string, unknown> = {
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
      buyer: buyerRaw,
      replacement: s(row[COL.replacement]),
      unprocessed: unprocessedRaw === "neobdelane",
      comment: s(row[COL.comment]),
      supplier: s(row[COL.supplier]),
      lastPurchaseDate: dateVal(row[COL.lastPurchaseDate]),
      updatedAt: new Date(),
    };

    if (alreadyOrderedInSap) {
      // SAP pravi, da je bilo naročeno — to je avtoritativno, prepiše ročni status.
      data.processed = true;
      data.processedAt = new Date().toISOString();
      data.status = "NAROCENO";
    }

    const existing = await db
      .select()
      .from(zznItems)
      .where(and(eq(zznItems.internalOrder, internalOrder), eq(zznItems.itemPosition, itemPosition)));

    if (existing.length > 0) {
      // lokalni status delovnega toka, ročno dodeljen nabavnik, izbris in dobavitelji za
      // povpraševanje se pri ponovnem uvozu OHRANIJO (niso v `data`, razen "naročeno v SAP" zgoraj)
      await db
        .update(zznItems)
        .set(data)
        .where(and(eq(zznItems.internalOrder, internalOrder), eq(zznItems.itemPosition, itemPosition)));
    } else {
      if (!alreadyOrderedInSap) {
        data.status = "DODELJENO";
      }
      await db.insert(zznItems).values(data as typeof zznItems.$inferInsert);
    }
    upserted++;
  }

  // Počisti postavke drugih nabavnikov, ki so bile morda uvožene prej (dokler smo uvažali vse) —
  // razen tistih, ki so bile ročno prestavljene na drugega nabavnika (buyerOverride nastavljen).
  const cleanup = await db
    .delete(zznItems)
    .where(and(ne(zznItems.buyer, TARGET_BUYER), isNull(zznItems.buyerOverride)))
    .returning({ id: zznItems.id });

  console.log(
    `ZZN PHF: uvoženih/posodobljenih ${upserted} vrstic (nabavnik ${TARGET_BUYER}), preskočenih (brez internega naročila) ${skippedNoOrder}, preskočenih (drug nabavnik) ${skippedOtherBuyer}.`,
  );
  if (cleanup.length > 0) {
    console.log(`Počiščenih ${cleanup.length} starih postavk drugih nabavnikov (brez ročne prestavitve).`);
  }
}

run().then(() => process.exit(0));
