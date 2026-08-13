CREATE TABLE `brokerage_tiers` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`min_amount` real NOT NULL,
	`max_amount` real NOT NULL,
	`fee_type` text NOT NULL,
	`fee_value` real NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `family_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`sap_code` text NOT NULL,
	`domain` text,
	`category` text,
	`material_group` text,
	`description` text,
	`lead_buyer` text,
	`buyer_2` text,
	`buyer_3` text,
	`buyer_4` text,
	`c2b_status` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `family_codes_sap_code_unique` ON `family_codes` (`sap_code`);--> statement-breakpoint
CREATE TABLE `family_suppliers` (
	`id` text PRIMARY KEY NOT NULL,
	`family_code_id` text NOT NULL,
	`supplier_id` text NOT NULL,
	FOREIGN KEY (`family_code_id`) REFERENCES `family_codes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `inquiry_rounds` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`round_number` integer NOT NULL,
	`reason` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`indoc_code` text,
	`name` text NOT NULL,
	`description` text,
	`nabavnik` text DEFAULT 'Luka Hrovat' NOT NULL,
	`status` text DEFAULT 'ODPRTO' NOT NULL,
	`estimated_value` real,
	`esdc_required` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`closed_at` text
);
--> statement-breakpoint
CREATE TABLE `quotes` (
	`id` text PRIMARY KEY NOT NULL,
	`round_id` text NOT NULL,
	`supplier_id` text,
	`supplier_name_free_text` text,
	`responded` integer DEFAULT false NOT NULL,
	`line_items` text DEFAULT '[]' NOT NULL,
	`subtotal` real DEFAULT 0 NOT NULL,
	`brokerage_amount` real DEFAULT 0 NOT NULL,
	`total_with_brokerage` real DEFAULT 0 NOT NULL,
	`technically_confirmed` integer DEFAULT false NOT NULL,
	`commercially_confirmed` integer DEFAULT false NOT NULL,
	`final_price` real,
	`is_winner` integer DEFAULT false NOT NULL,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`round_id`) REFERENCES `inquiry_rounds`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` text PRIMARY KEY NOT NULL,
	`sap_number` text,
	`name` text NOT NULL,
	`buyer_name` text,
	`supplier_type` text,
	`c2b` integer DEFAULT false NOT NULL,
	`homologated` integer DEFAULT true NOT NULL,
	`country` text,
	`company_code` text,
	`vat_number` text,
	`registration_number` text,
	`address` text,
	`city` text,
	`commercial_contact` text,
	`commercial_email` text,
	`commercial_phone` text,
	`general_email` text,
	`order_email` text,
	`turnover_2024` real,
	`credit_rating` text,
	`dependency_rate` real,
	`active` integer DEFAULT true NOT NULL,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `suppliers_sap_number_unique` ON `suppliers` (`sap_number`);