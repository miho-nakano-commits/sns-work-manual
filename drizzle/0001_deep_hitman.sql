PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_user_progress` (
	`user_id` text PRIMARY KEY NOT NULL,
	`current_step` integer DEFAULT 1 NOT NULL,
	`completed_steps` text DEFAULT '[]' NOT NULL,
	`positions` text DEFAULT '{}' NOT NULL,
	`checks` text DEFAULT '{}' NOT NULL,
	`form_values` text DEFAULT '{}' NOT NULL,
	`last_worked_step` integer DEFAULT 1 NOT NULL,
	`updated_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_user_progress`("user_id", "current_step", "completed_steps", "positions", "checks", "form_values", "last_worked_step", "updated_at") SELECT "user_id", "current_step", "completed_steps", "positions", "checks", "form_values", "last_worked_step", "updated_at" FROM `user_progress`;--> statement-breakpoint
DROP TABLE `user_progress`;--> statement-breakpoint
ALTER TABLE `__new_user_progress` RENAME TO `user_progress`;--> statement-breakpoint
PRAGMA foreign_keys=ON;