CREATE TYPE "public"."zzn_status" AS ENUM('DODELJENO', 'V_POVPRASEVANJU', 'ZA_NAROCILO', 'V_POTRJEVANJU', 'POTRJENO', 'NAROCENO');--> statement-breakpoint
CREATE TABLE "project_suppliers" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"supplier_id" text,
	"supplier_name_free_text" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "technical_contact_name" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "technical_contact_phone" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "technical_contact_email" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "cdc_file_url" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "cdc_file_name" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "panel_confirmed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "panel_confirmed_at" timestamp;--> statement-breakpoint
ALTER TABLE "zzn_items" ADD COLUMN "status" "zzn_status" DEFAULT 'DODELJENO' NOT NULL;--> statement-breakpoint
ALTER TABLE "zzn_items" ADD COLUMN "inquiry_supplier_ids" text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "zzn_items" ADD COLUMN "buyer_override" text;--> statement-breakpoint
ALTER TABLE "zzn_items" ADD COLUMN "manually_deleted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "zzn_items" ADD COLUMN "deleted_reason" text;--> statement-breakpoint
ALTER TABLE "zzn_items" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "project_suppliers" ADD CONSTRAINT "project_suppliers_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_suppliers" ADD CONSTRAINT "project_suppliers_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;