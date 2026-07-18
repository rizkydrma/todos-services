ALTER TABLE `users` ADD `email_verified_at` text;
--> statement-breakpoint
CREATE TABLE `email_verification_challenges` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `code_hash` text NOT NULL,
  `expires_at` text NOT NULL,
  `attempt_count` integer DEFAULT 0 NOT NULL,
  `created_at` text NOT NULL,
  `consumed_at` text,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `email_verification_challenges_user_id_idx` ON `email_verification_challenges` (`user_id`);
