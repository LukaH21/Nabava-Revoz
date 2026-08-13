// Enoúrni uvoz dobaviteljev iz "2026 DOBAVITELJI kontakti in nabavniki" Excela
// v tabelo suppliers. Poganjaj z: npx tsx scripts/import-suppliers.ts <pot-do-xlsx>
import * as XLSX from "xlsx";
import { db } from "../src/db";
import { suppliers } from "../src/db/schema";
import { eq } from "drizzle-orm";

const filePath = process.argv[2];
if (!filePath) {
  console.error("Uporaba: npx tsx scripts/import-suppliers.ts <pot-do-xlsx>");
  process.exit(1);
}

const wb = XLSX.readFile(filePath);
const ws = wb.Sheets["DOBAVITELJI NABAVNIKI"];
if (!ws) {
  console.error('List "DOBAVITELJI NABAVNIKI" ni najden v datoteki.');
  process.exit(1);
}

const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });

// Vrstica 4 (index 3) vsebuje slovenske naslove stolpcev.
const header: string[] = (rows[3] as unknown[]).map((h) => (h ? String(h).trim() : ""));

function col(label: string): number {
  return header.findIndex((h) => h === label);
}

const idx = {
  sapNumber: col("Številka dobavitelja"),
  name: col("Ime dobavitelja"),
  buyerName: col("Nabavnik"),
  supplierType: col("Tip dobavitelja"),
  c2b: col("C2B"),
  country: col("Država"),
  companyCode: col("Code Société"),
  vatNumber: col("Davčna številka"),
  registrationNumber: col("Matična številka"),
  turnover2024: col("Promet dobavitelja 2024"),
  creditRating: col("Boniteta 2025"),
  dependencyRate: col("Odvisnost dobavitelja 2024"),
  address: col("Naslov"),
  city: col("Mesto"),
  commercialContact: col("Komercialni kontakt"),
  commercialEmail: col("E-mail"),
  commercialPhone: col("Telefon"),
  generalEmail: col("Splošni mail"),
  orderEmail: col("Mail za naročila "),
  notes: col("Komentar"),
};

function val(row: unknown[], i: number): string | undefined {
  if (i < 0) return undefined;
  const v = row[i];
  if (v === undefined || v === null || v === "") return undefined;
  return String(v).trim();
}

function num(row: unknown[], i: number): number | undefined {
  const s = val(row, i);
  if (s === undefined) return undefined;
  const n = Number(String(s).replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

// Vrstice v Excelu, ki so dejansko oznake razdelkov / opombe in ne pravi dobavitelji.
const NON_SUPPLIER_NAMES = new Set([
  "NEHOMOLOGIRAN",
  "NOVA HOMOLOGACIJA",
  "ODHOMOLOGIRAN",
  "NEHOMOLOGIRANI / Z NJIMI POSLUJEMO",
]);

async function run() {
  let imported = 0;
  let skipped = 0;

  for (let r = 4; r < rows.length; r++) {
    const row = rows[r] as unknown[];
    if (!row || row.length === 0) continue;
    const name = val(row, idx.name);
    if (!name || NON_SUPPLIER_NAMES.has(name.toUpperCase())) {
      skipped++;
      continue;
    }

    const sapNumber = val(row, idx.sapNumber);
    const data = {
      sapNumber,
      name,
      buyerName: val(row, idx.buyerName),
      supplierType: val(row, idx.supplierType),
      c2b: val(row, idx.c2b) === "DA",
      homologated: true, // ta list je uradna tabela homologiranih dobaviteljev
      country: val(row, idx.country),
      companyCode: val(row, idx.companyCode),
      vatNumber: val(row, idx.vatNumber),
      registrationNumber: val(row, idx.registrationNumber),
      turnover2024: num(row, idx.turnover2024),
      creditRating: val(row, idx.creditRating),
      dependencyRate: num(row, idx.dependencyRate),
      address: val(row, idx.address),
      city: val(row, idx.city),
      commercialContact: val(row, idx.commercialContact),
      commercialEmail: val(row, idx.commercialEmail),
      commercialPhone: val(row, idx.commercialPhone),
      generalEmail: val(row, idx.generalEmail),
      orderEmail: val(row, idx.orderEmail),
      notes: val(row, idx.notes),
    };

    if (sapNumber) {
      const existing = await db.select().from(suppliers).where(eq(suppliers.sapNumber, sapNumber));
      if (existing.length > 0) {
        await db.update(suppliers).set(data).where(eq(suppliers.sapNumber, sapNumber));
        imported++;
        continue;
      }
    }

    await db.insert(suppliers).values(data);
    imported++;
  }

  console.log(`Uvoženih/posodobljenih dobaviteljev: ${imported}, preskočenih (brez imena): ${skipped}`);
}

run().then(() => process.exit(0));
