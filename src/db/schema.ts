// Postgres varianta sheme za produkcijo (Vercel Postgres / Neon).
// Ko si pripravljen na deploy: preimenuj to datoteko v schema.ts (in staro
// SQLite verzijo v schema.sqlite.ts), glej README.md > "Deploy na Vercel".
import { pgTable, text, integer, real, boolean, timestamp, pgEnum, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const projectStatus = pgEnum("project_status", ["ODPRTO", "DODELJENO", "ZAKLJUCENO"]);
export const feeType = pgEnum("fee_type", ["FIXED", "PERCENT"]);
export const zznStatus = pgEnum("zzn_status", [
  "DODELJENO",
  "V_POVPRASEVANJU",
  "ZA_NAROCILO",
  "V_POTRJEVANJU",
  "POTRJENO",
  "NAROCENO",
]);

export const suppliers = pgTable("suppliers", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  sapNumber: text("sap_number").unique(),
  name: text("name").notNull(),
  buyerName: text("buyer_name"),
  supplierType: text("supplier_type"),
  c2b: boolean("c2b").notNull().default(false),
  homologated: boolean("homologated").notNull().default(true),
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
  active: boolean("active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const familyCodes = pgTable("family_codes", {
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

export const familySuppliers = pgTable("family_suppliers", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  familyCodeId: text("family_code_id").notNull().references(() => familyCodes.id),
  supplierId: text("supplier_id").notNull().references(() => suppliers.id),
});

export const brokerageTiers = pgTable("brokerage_tiers", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  scheduleName: text("schedule_name").notNull().default("Standard"),
  label: text("label").notNull(),
  minAmount: real("min_amount").notNull(),
  maxAmount: real("max_amount").notNull(),
  feeType: feeType("fee_type").notNull(),
  feeValue: real("fee_value").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const projects = pgTable("projects", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  indocCode: text("indoc_code"),
  name: text("name").notNull(),
  description: text("description"),
  nabavnik: text("nabavnik").notNull().default("Luka Hrovat"),
  status: projectStatus("status").notNull().default("ODPRTO"),
  estimatedValue: real("estimated_value"),
  esdcRequired: boolean("esdc_required").notNull().default(false),
  technicalContactName: text("technical_contact_name"),
  technicalContactPhone: text("technical_contact_phone"),
  technicalContactEmail: text("technical_contact_email"),
  cdcFileUrl: text("cdc_file_url"),
  cdcFileName: text("cdc_file_name"),
  panelConfirmed: boolean("panel_confirmed").notNull().default(false),
  panelConfirmedAt: timestamp("panel_confirmed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  closedAt: timestamp("closed_at"),
});

export const projectSuppliers = pgTable("project_suppliers", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  supplierId: text("supplier_id").references(() => suppliers.id),
  supplierNameFreeText: text("supplier_name_free_text"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const inquiryRounds = pgTable("inquiry_rounds", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  roundNumber: integer("round_number").notNull(),
  reason: text("reason"),
  submissionDeadline: text("submission_deadline"),
  deadlineExtensions: integer("deadline_extensions").notNull().default(0),
  closed: boolean("closed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const activityLog = pgTable("activity_log", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["INFO", "DEADLINE", "NOTE", "STATUS", "WINNER", "QUOTE"] })
    .notNull()
    .default("INFO"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const zznItems = pgTable("zzn_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  internalOrder: text("internal_order").notNull(),
  itemPosition: integer("item_position").notNull().default(10),
  material: text("material"),
  materialName: text("material_name"),
  materialNameFr: text("material_name_fr"),
  quantity: real("quantity"),
  unit: text("unit"),
  createdBy: text("created_by"),
  requestDate: text("request_date"),
  launchDate: text("launch_date"),
  buyer: text("buyer"),
  replacement: text("replacement"),
  unprocessed: boolean("unprocessed").notNull().default(true),
  comment: text("comment"),
  supplier: text("supplier"),
  lastPurchaseDate: text("last_purchase_date"),
  processed: boolean("processed").notNull().default(false),
  processedAt: text("processed_at"),
  status: zznStatus("status").notNull().default("DODELJENO"),
  inquirySupplierIds: text("inquiry_supplier_ids").notNull().default("[]"),
  buyerOverride: text("buyer_override"),
  manuallyDeleted: boolean("manually_deleted").notNull().default(false),
  deletedReason: text("deleted_reason"),
  deletedAt: timestamp("deleted_at"),
  importedAt: timestamp("imported_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  uniqueIndex("zzn_items_order_position_idx").on(t.internalOrder, t.itemPosition),
]);

export const quotes = pgTable("quotes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  roundId: text("round_id")
    .notNull()
    .references(() => inquiryRounds.id, { onDelete: "cascade" }),
  supplierId: text("supplier_id").references(() => suppliers.id),
  supplierNameFreeText: text("supplier_name_free_text"),
  responded: boolean("responded").notNull().default(false),
  lineItems: text("line_items").notNull().default("[]"),
  subtotal: real("subtotal").notNull().default(0),
  brokerageAmount: real("brokerage_amount").notNull().default(0),
  totalWithBrokerage: real("total_with_brokerage").notNull().default(0),
  technicallyConfirmed: boolean("technically_confirmed").notNull().default(false),
  commerciallyConfirmed: boolean("commercially_confirmed").notNull().default(false),
  finalPrice: real("final_price"),
  isWinner: boolean("is_winner").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const projectsRelations = relations(projects, ({ many }) => ({
  rounds: many(inquiryRounds),
  panel: many(projectSuppliers),
}));

export const projectSuppliersRelations = relations(projectSuppliers, ({ one }) => ({
  project: one(projects, { fields: [projectSuppliers.projectId], references: [projects.id] }),
  supplier: one(suppliers, { fields: [projectSuppliers.supplierId], references: [suppliers.id] }),
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
