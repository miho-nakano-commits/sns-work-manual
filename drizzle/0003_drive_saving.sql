CREATE TABLE `drive_save_progress` (
	`user_id` text NOT NULL,
	`content_id` text NOT NULL,
	`saved` integer DEFAULT false NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_id`, `content_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "drive_saved_boolean" CHECK("drive_save_progress"."saved" IN (0,1))
);
--> statement-breakpoint
CREATE TABLE `user_drive_settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`folder_url` text,
	`updated_by` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
