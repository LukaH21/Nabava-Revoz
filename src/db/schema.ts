// Drizzle schema — Nabavna aplikacija (Revoz)
// Local dev: SQLite (better-sqlite3). Production (Vercel): swap to Postgres —
// see README.md for the exact steps (schema stays almost identical, drizzle
// has separate sqlite-core / pg-core column builders).

import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

export const suppliers = sqliteTable("suppliers", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  sapNumber: text("sap_number").unique(),
  name: text("name").notNull(),
  buyerName: text("buyer_name"),
  supplierType: text("supplier_type"),
  c2b: integer("c2b", { mode: "boolean" }).notNull().default(false),
  homologated: integer("homologated", { mode: "boolean" }).notNull().default(true),
  country: text("country"),
  companyCode: text("company_code"),
  vatNumber: text("vat_number"),
  registrationNumber: text("registration_number"),
  address: text("address"),
  city: text("city"),
  commercialContact: text("commercial_contact"),
  commercialEmail: text("commercial_email"),
  commercialPhone: text("commercial_phone"),
  generalEmail: text("general_email"),
  orderEmail: text("order_email"),
  turnover2024: real("turnover_2024"),
  creditRating: text("credit_rating"),
  dependencyRate: real("dependency_rate"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const familyCodes = sqliteTable("family_codes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  sapCode: text("sap_code").notNull().unique(),
  domain: text("domain"),
  category: text("category"),
  materialGroup: text("material_group"),
  description: text("description"),
  leadBuyer: text("lead_buyer"),
  buyer2: text("buyer_2"),
  buyer3: text("buyer_3"),
  buyer4: text("buyer_4"),
  c2bStatus: text("c2b_status"),
});

export const familySuppliers = sqliteTable("family_suppliers", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  familyCodeId: text("family_code_id").notNull().references(() => familyCodes.id),
  supplierId: text("supplier_id").notNull().references(() => suppliers.id),
});

export const brokerageTiers = sqliteTable("brokerage_tiers", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  scheduleName: text("schedule_name").notNull().default("Standard"),
  label: text("label").notNull(),
  minAmount: real("min_amount").notNull(),
  maxAmount: real("max_amount").notNull(),
  feeType: text("fee_type", { enum: ["FIXED", "PERCENT"] }).notNull(),
  feeValue: real("fee_value").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  indocCode: text("indoc_code"),
  name: text("name").notNull(),
  description: text("description"),
  nabavnik: text("nabavnik").notNull().default("Luka Hrovat"),
  status: text("status", { enum: ["ODPRTO", "DODELJENO", "ZAKLJUCENO"] })
    .notNull()
    .default("ODPRTO"),
  estimatedValue: real("estimated_value"),
  esdcRequired: integer("esdc_required", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  closedAt: text("closed_at"),
});

export const inquiryRounds = sqliteTable("inquiry_rounds", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  roundNumber: integer("round_number").notNull(),
  reason: text("reason"),
  submissionDeadline: text("submission_deadline"), // rok oddaje ponudb (ISO datum)
  deadlineExtensions: integer("deadline_extensions").notNull().default(0),
  closed: integer("closed", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Časovnica aktivnosti po projektu (samodejni zapisi + ročne opombe)
export const activityLog = sqliteTable("activity_log", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  type: text("type", {
    enum: ["INFO", "DEADLINE", "NOTE", "STATUS", "WINNER", "QUOTE"],
  })
    .notNull()
    .default("INFO"),
  message: text("message").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ZZN PHF — tedenska tabela naročil na zalogo (uvoz iz Excela + lokalno sledenje statusu)
export const zznItems = sqliteTable("zzn_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  internalOrder: text("internal_order").notNull(), // Interno naročilo
  itemPosition: integer("item_position").notNull().default(10), // Postavka intern. nar.
  material: text("material"), // SAP koda materiala
  materialName: text("material_name"),
  materialNameFr: text("material_name_fr"),
  quantity: real("quantity"),
  unit: text("unit"),
  createdBy: text("created_by"), // Kreirano (oseba)
  requestDate: text("request_date"), // Datum zahteve
  launchDate: text("launch_date"), // Datum lansiranja
  buyer: text("buyer"), // NABAVNIK
  replacement: text("replacement"), // Nadomeščanje
  unprocessed: integer("unprocessed", { mode: "boolean" }).notNull().default(true), // neobdelane
  comment: text("comment"),
  supplier: text("supplier"),
  lastPurchaseDate: text("last_purchase_date"),
  processed: integer("processed", { mode: "boolean" }).notNull().default(false), // lokalni status: naročeno v SAP
  processedAt: text("processed_at"),
  importedAt: text("imported_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => [
  uniqueIndex("zzn_items_order_position_idx").on(t.internalOrder, t.itemPosition),
]);

export const quotes = sqliteTable("quotes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  roundId: text("round_id")
    .notNull()
    .references(() => inquiryRounds.id, { onDelete: "cascade" }),
  supplierId: text("supplier_id").references(() => suppliers.id),
  supplierNameFreeText: text("supplier_name_free_text"),
  responded: integer("responded", { mode: "boolean" }).notNull().default(false),
  lineItems: text("line_items").notNull().default("[]"), // JSON string: [{label, value, unit}]
  subtotal: real("subtotal").notNull().default(0),
  brokerageAmount: real("brokerage_amount").notNull().default(0),
  totalWithBrokerage: real("total_with_brokerage").notNull().default(0),
  technicallyConfirmed: integer("technically_confirmed", { mode: "boolean" }).notNull().default(false),
  commerciallyConfirmed: integer("commercially_confirmed", { mode: "boolean" }).notNull().default(false),
  finalPrice: real("final_price"),
  isWinner: integer("is_winner", { mode: "boolean" }).notNull().default(false),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const projectsRelations = relations(projects, ({ many }) => ({
  rounds: many(inquiryRounds),
}));

export const inquiryRoundsRelations = relations(inquiryRounds, ({ one, many }) => ({
  project: one(projects, { fields: [inquiryRounds.projectId], references: [projects.id] }),
  quotes: many(quotes),
}));

export const quotesRelations = relations(quotes, ({ one }) => ({
  round: one(inquiryRounds, { fields: [quotes.roundId], references: [inquiryRounds.id] }),
  supplier: one(suppliers, { fields: [quotes.supplierId], references: [suppliers.id] }),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  quotes: many(quotes),
  familyLinks: many(familySuppliers),
}));

export const familyCodesRelations = relations(familyCodes, ({ many }) => ({
  familyLinks: many(familySuppliers),
}));

export const familySuppliersRelations = relations(familySuppliers, ({ one }) => ({
  familyCode: one(familyCodes, { fields: [familySuppliers.familyCodeId], references: [familyCodes.id] }),
  supplier: one(suppliers, { fields: [familySuppliers.supplierId], references: [suppliers.id] }),
}));
