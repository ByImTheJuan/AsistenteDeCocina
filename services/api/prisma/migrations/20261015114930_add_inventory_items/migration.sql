-- CreateTable
CREATE TABLE `inventory_items` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `ingredientId` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(10, 3) NULL,
    `unit` ENUM('GRAM', 'KILOGRAM', 'MILLILITER', 'LITER', 'TABLESPOON', 'TEASPOON', 'PIECE', 'PINCH', 'PACKAGE') NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `inventory_items_userId_idx`(`userId`),
    INDEX `inventory_items_ingredientId_idx`(`ingredientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `inventory_items` ADD CONSTRAINT `inventory_items_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_items` ADD CONSTRAINT `inventory_items_ingredientId_fkey` FOREIGN KEY (`ingredientId`) REFERENCES `ingredients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
