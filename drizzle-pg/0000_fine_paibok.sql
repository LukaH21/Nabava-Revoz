CREATE TYPE "public"."fee_type" AS ENUM('FIXED', 'PERCENT');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('ODPRTO', 'DODELJENO', 'ZAKLJUCENO');--> statement-breakpoint
CREATE TABLE "activity_log" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"type" text DEFAULT 'INFO' NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brokerage_tiers" (
	"id" text PRIMARY KEY NOT NULL,
	"schedule_name" text DEFAULT 'Standard' NOT NULL,
	"label" text NOT NULL,
	"min_amount" real NOT NULL,
	"max_amount" real NOT NULL,
	"fee_type" "fee_type" NOT NULL,
	"fee_value" real NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "family_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"sap_code" text NOT NULL,
	"domain" text,
	"category" text,
	"material_group" text,
	"description" text,
	"lead_buyer" text,
	"buyer_2" text,
	"buyer_3" text,
	"buyer_4" text,
	"c2b_status" text,
	CONSTRAINT "family_codes_sap_code_unique" UNIQUE("sap_code")
);
--> statement-breakpoint
CREATE TABLE "family_suppliers" (
	"id" text PRIMARY KEY NOT NULL,
	"family_code_id" text NOT NULL,
	"supplier_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inquiry_rounds" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"round_number" integer NOT NULL,
	"reason" text,
	"submission_deadline" text,
	"deadline_extensions" integer DEFAULT 0 NOT NULL,
	"closed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"indoc_code" text,
	"name" text NOT NULL,
	"description" text,
	"nabavnik" text DEFAULT 'Luka Hrovat' NOT NULL,
	"status" "project_status" DEFAULT 'ODPRTO' NOT NULL,
	"estimated_value" real,
	"esdc_required" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"closed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" text PRIMARY KEY NOT NULL,
	"round_id" text NOT NULL,
	"supplier_id" text,
	"supplier_name_free_text" text,
	"responded" boolean DEFAULT false NOT NULL,
	"line_items" text DEFAULT '[]' NOT NULL,
	"subtotal" real DEFAULT 0 NOT NULL,
	"brokerage_amount" real DEFAULT 0 NOT NULL,
	"total_with_brokerage" real DEFAULT 0 NOT NULL,
	"technically_confirmed" boolean DEFAULT false NOT NULL,
	"commercially_confirmed" boolean DEFAULT false NOT NULL,
	"final_price" real,
	"is_winner" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" text PRIMARY KEY NOT NULL,
	"sap_number" text,
	"name" text NOT NULL,
	"buyer_name" text,
	"supplier_type" text,
	"c2b" boolean DEFAULT false NOT NULL,
	"homologated" boolean DEFAULT true NOT NULL,
	"country" text,
	"company_code" text,
	"vat_number" text,
	"registration_number" text,
	"address" text,
	"city" text,
	"commercial_contact" text,
	"commercial_email" text,
	"commercial_phone" text,
	"general_email" text,
	"order_email" text,
	"turnover_2024" real,
	"credit_rating" text,
	"dependency_rate" real,
	"active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "suppliers_sap_number_unique" UNIQUE("sap_number")
);
--> statement-breakpoint
CREATE TABLE "zzn_items" (
	"id" text PRIMARY KEY NOT NULL,
	"internal_order" text NOT NULL,
	"item_position" integer DEFAULT 10 NOT NULL,
	"material" text,
	"material_name" text,
	"material_name_fr" text,
	"quantity" real,
	"unit" text,
	"created_by" text,
	"request_date" text,
	"launch_date" text,
	"buyer" text,
	"replacement" text,
	"unprocessed" boolean DEFAULT true NOT NULL,
	"comment" text,
	"supplier" text,
	"last_purchase_date" text,
	"processed" boolean DEFAULT false NOT NULL,
	"processed_at" text,
	"imported_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_suppliers" ADD CONSTRAINT "family_suppliers_family_code_id_family_codes_id_fk" FOREIGN KEY ("family_code_id") REFERENCES "public"."family_codes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_suppliers" ADD CONSTRAINT "family_suppliers_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_rounds" ADD CONSTRAINT "inquiry_rounds_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_round_id_inquiry_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."inquiry_rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "zzn_items_order_position_idx" ON "zzn_items" USING btree ("internal_order","item_position");