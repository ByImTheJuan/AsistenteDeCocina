-- AlterTable
ALTER TABLE `users` ADD COLUMN `diet` ENUM('VEGETARIAN', 'VEGAN', 'PESCATARIAN', 'FLEXITARIAN') NULL;

-- CreateTable
CREATE TABLE `ingredients` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `category` ENUM('VEGETABLE', 'FRUIT', 'MEAT', 'FISH_SEAFOOD', 'DAIRY_EGG', 'GRAIN', 'LEGUME', 'NUT_SEED', 'HERB_SPICE', 'OTHER') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ingredients_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ingredient_preferences` (
    `userId` VARCHAR(191) NOT NULL,
    `ingredientId` VARCHAR(191) NOT NULL,
    `kind` ENUM('LIKED', 'AVOIDED') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ingredient_preferences_ingredientId_idx`(`ingredientId`),
    PRIMARY KEY (`userId`, `ingredientId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ingredient_preferences` ADD CONSTRAINT `ingredient_preferences_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ingredient_preferences` ADD CONSTRAINT `ingredient_preferences_ingredientId_fkey` FOREIGN KEY (`ingredientId`) REFERENCES `ingredients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
