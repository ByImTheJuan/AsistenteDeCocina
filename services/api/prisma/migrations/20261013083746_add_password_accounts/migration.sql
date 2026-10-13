-- One account per email: stored emails are normalised before the unique
-- index is created. The migration fails if two accounts share an email.
UPDATE `users` SET `email` = LOWER(TRIM(`email`));

-- AlterTable
ALTER TABLE `users` ADD COLUMN `passwordHash` VARCHAR(255) NULL,
    MODIFY `googleSub` VARCHAR(255) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `users_email_key` ON `users`(`email`);

