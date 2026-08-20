CREATE TABLE `activity_log` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`type` text DEFAULT 'INFO' NOT NULL,
	`message` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `zzn_items` (
	`id` text PRIMARY KEY NOT NULL,
	`internal_order` text NOT NULL,
	`item_position` integer DEFAULT 10 NOT NULL,
	`material` text,
	`material_name` text,
	`material_name_fr` text,
	`quantity` real,
	`unit` text,
	`created_by` text,
	`request_date` text,
	`launch_date` text,
	`buyer` text,
	`replacement` text,
	`unprocessed` integer DEFAULT true NOT NULL,
	`comment` text,
	`supplier` text,
	`last_purchase_date` text,
	`processed` integer DEFAULT false NOT NULL,
	`processed_at` text,
	`imported_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `zzn_items_order_position_idx` ON `zzn_items` (`internal_order`,`item_position`);--> statement-breakpoint
ALTER TABLE `inquiry_rounds` ADD `submission_deadline` text;--> statement-breakpoint
ALTER TABLE `inquiry_rounds` ADD `deadline_extensions` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `inquiry_rounds` ADD `closed` integer DEFAULT false NOT NULL;
