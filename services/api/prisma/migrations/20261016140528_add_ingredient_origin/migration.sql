-- Where each food comes from, to tell which diets allow it. The column is
-- filled before it becomes required, so the catalogue keeps working.
-- Derived from the category and the allergens, with the exceptions written
-- by hand; no validated source. Criteria in
-- docs/decisions/0009-recomendaciones-personalizadas.md.

-- AlterTable
ALTER TABLE `ingredients` ADD COLUMN `origin` ENUM('PLANT', 'ANIMAL_PRODUCT', 'FISH', 'MEAT') NULL;

UPDATE `ingredients` SET `origin` = CASE `category`
    WHEN 'MEAT' THEN 'MEAT'
    WHEN 'FISH_SEAFOOD' THEN 'FISH'
    WHEN 'DAIRY_EGG' THEN 'ANIMAL_PRODUCT'
    ELSE 'PLANT'
END;

-- Processed foods made with eggs, milk, fish or seafood (mayonesa, chocolate).
UPDATE `ingredients` SET `origin` = 'ANIMAL_PRODUCT'
WHERE `origin` = 'PLANT' AND `id` IN (
    SELECT `ingredientId` FROM `ingredient_allergens`
    WHERE `allergen` IN ('EGG', 'MILK', 'LACTOSE')
);
UPDATE `ingredients` SET `origin` = 'FISH'
WHERE `origin` IN ('PLANT', 'ANIMAL_PRODUCT') AND `id` IN (
    SELECT `ingredientId` FROM `ingredient_allergens`
    WHERE `allergen` IN ('FISH', 'CRUSTACEANS', 'MOLLUSCS')
);

-- Animal products that no category or allergen gives away.
UPDATE `ingredients` SET `origin` = 'MEAT' WHERE `id` = 'ing_caldo_de_pollo';
UPDATE `ingredients` SET `origin` = 'ANIMAL_PRODUCT' WHERE `id` = 'ing_miel';

ALTER TABLE `ingredients` MODIFY `origin` ENUM('PLANT', 'ANIMAL_PRODUCT', 'FISH', 'MEAT') NOT NULL;
