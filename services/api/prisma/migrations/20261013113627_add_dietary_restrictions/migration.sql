-- AlterTable
ALTER TABLE `ingredients` ADD COLUMN `allergensUncertain` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `ingredient_allergens` (
    `ingredientId` VARCHAR(191) NOT NULL,
    `allergen` ENUM('GLUTEN', 'CRUSTACEANS', 'EGG', 'FISH', 'PEANUTS', 'SOY', 'MILK', 'TREE_NUTS', 'CELERY', 'MUSTARD', 'SESAME', 'SULPHITES', 'LUPIN', 'MOLLUSCS', 'LACTOSE', 'FRUCTOSE', 'HISTAMINE', 'SORBITOL') NOT NULL,

    INDEX `ingredient_allergens_allergen_idx`(`allergen`),
    PRIMARY KEY (`ingredientId`, `allergen`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `allergen_restrictions` (
    `userId` VARCHAR(191) NOT NULL,
    `allergen` ENUM('GLUTEN', 'CRUSTACEANS', 'EGG', 'FISH', 'PEANUTS', 'SOY', 'MILK', 'TREE_NUTS', 'CELERY', 'MUSTARD', 'SESAME', 'SULPHITES', 'LUPIN', 'MOLLUSCS', 'LACTOSE', 'FRUCTOSE', 'HISTAMINE', 'SORBITOL') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`userId`, `allergen`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ingredient_restrictions` (
    `userId` VARCHAR(191) NOT NULL,
    `ingredientId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ingredient_restrictions_ingredientId_idx`(`ingredientId`),
    PRIMARY KEY (`userId`, `ingredientId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ingredient_allergens` ADD CONSTRAINT `ingredient_allergens_ingredientId_fkey` FOREIGN KEY (`ingredientId`) REFERENCES `ingredients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `allergen_restrictions` ADD CONSTRAINT `allergen_restrictions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ingredient_restrictions` ADD CONSTRAINT `ingredient_restrictions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ingredient_restrictions` ADD CONSTRAINT `ingredient_restrictions_ingredientId_fkey` FOREIGN KEY (`ingredientId`) REFERENCES `ingredients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
