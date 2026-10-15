-- The "package" unit is dropped: its content is unknown, so it says nothing
-- useful about what is at home. Every food also gets the way it is measured,
-- which decides the units offered for it (seed_ingredient_measures).

-- The two foods suggested in packages move to units of their measure.
UPDATE `ingredients` SET `defaultUnit` = 'PIECE' WHERE `id` = 'ing_tortillas_de_trigo';
UPDATE `ingredients` SET `defaultUnit` = 'GRAM' WHERE `id` = 'ing_anchoas';

-- Inventory quantities in packages, spoons or pinches have no unit left in
-- the inventory: the food stays, without a quantity.
UPDATE `inventory_items` SET `quantity` = NULL, `unit` = NULL
    WHERE `unit` IN ('PACKAGE', 'TABLESPOON', 'TEASPOON', 'PINCH');

ALTER TABLE `ingredients`
    MODIFY `defaultUnit` ENUM('GRAM', 'KILOGRAM', 'MILLILITER', 'LITER', 'TABLESPOON', 'TEASPOON', 'PIECE', 'PINCH') NOT NULL;
ALTER TABLE `inventory_items`
    MODIFY `unit` ENUM('GRAM', 'KILOGRAM', 'MILLILITER', 'LITER', 'TABLESPOON', 'TEASPOON', 'PIECE', 'PINCH') NULL;

-- Added with a temporary default that is dropped straight away: the next
-- migration gives every food its real measure, and new foods must state it.
ALTER TABLE `ingredients`
    ADD COLUMN `measure` ENUM('WEIGHT', 'VOLUME', 'COUNT', 'COUNT_OR_WEIGHT') NOT NULL DEFAULT 'WEIGHT';
ALTER TABLE `ingredients` ALTER COLUMN `measure` DROP DEFAULT;
