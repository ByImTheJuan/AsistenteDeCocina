-- The catalogue already has rows, so the column is added with a temporary
-- default and the default is dropped straight away: every ingredient gets its
-- real unit in the next migration (seed_ingredient_default_units), and new
-- ingredients must always state theirs.
-- AlterTable
ALTER TABLE `ingredients` ADD COLUMN `defaultUnit` ENUM('GRAM', 'KILOGRAM', 'MILLILITER', 'LITER', 'TABLESPOON', 'TEASPOON', 'PIECE', 'PINCH', 'PACKAGE') NOT NULL DEFAULT 'GRAM';
ALTER TABLE `ingredients` ALTER COLUMN `defaultUnit` DROP DEFAULT;

-- CreateTable
CREATE TABLE `ingredient_aliases` (
    `alias` VARCHAR(100) NOT NULL,
    `ingredientId` VARCHAR(191) NOT NULL,

    INDEX `ingredient_aliases_ingredientId_idx`(`ingredientId`),
    PRIMARY KEY (`alias`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ingredient_aliases` ADD CONSTRAINT `ingredient_aliases_ingredientId_fkey` FOREIGN KEY (`ingredientId`) REFERENCES `ingredients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
