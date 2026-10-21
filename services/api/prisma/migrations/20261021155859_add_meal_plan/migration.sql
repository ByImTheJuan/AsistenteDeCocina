-- CreateTable
CREATE TABLE `meal_plan_entries` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `meal` ENUM('BREAKFAST', 'LUNCH', 'DINNER') NOT NULL,
    `recipeId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `meal_plan_entries_recipeId_idx`(`recipeId`),
    UNIQUE INDEX `meal_plan_entries_userId_date_meal_key`(`userId`, `date`, `meal`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `meal_plan_entries` ADD CONSTRAINT `meal_plan_entries_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `meal_plan_entries` ADD CONSTRAINT `meal_plan_entries_recipeId_fkey` FOREIGN KEY (`recipeId`) REFERENCES `recipes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
