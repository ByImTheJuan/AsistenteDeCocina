-- AlterTable
ALTER TABLE `inventory_items` ADD COLUMN `dateKind` ENUM('USE_BY', 'BEST_BEFORE') NULL,
    ADD COLUMN `expiresOn` DATE NULL,
    ADD COLUMN `location` ENUM('FRIDGE', 'FREEZER', 'PANTRY') NULL;
