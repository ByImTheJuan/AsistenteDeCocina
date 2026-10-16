-- AlterTable
ALTER TABLE `ingredients` ADD COLUMN `gramsPerMilliliter` DECIMAL(5, 3) NULL,
    ADD COLUMN `gramsPerPiece` DECIMAL(7, 1) NULL,
    ADD COLUMN `kcalPer100g` DECIMAL(6, 1) NULL,
    ADD COLUMN `proteinPer100g` DECIMAL(5, 1) NULL;
