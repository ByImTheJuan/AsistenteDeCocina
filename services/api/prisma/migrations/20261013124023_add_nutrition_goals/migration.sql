-- CreateTable
CREATE TABLE `nutrition_goals` (
    `userId` VARCHAR(191) NOT NULL,
    `kind` ENUM('DAILY_CALORIES', 'MEAL_CALORIES', 'DAILY_PROTEIN') NOT NULL,
    `value` INTEGER NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`userId`, `kind`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `nutrition_goals` ADD CONSTRAINT `nutrition_goals_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
