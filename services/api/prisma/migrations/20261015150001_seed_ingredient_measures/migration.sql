-- How each catalogue food is measured at home, which decides the units the
-- inventory offers for it:
--   WEIGHT           g, kg
--   VOLUME           ml, l
--   COUNT            units
--   COUNT_OR_WEIGHT  units, g, kg
-- A value per category and the exceptions below. Every suggested unit
-- (defaultUnit) belongs to its food's measure. Criteria and limits in
-- docs/decisions/0005-unidades-y-equivalencias.md.

-- Fruit and vegetables are counted or weighed; the rest of the catalogue is
-- weighed.
UPDATE `ingredients` SET `measure` = 'COUNT_OR_WEIGHT' WHERE `category` IN ('VEGETABLE', 'FRUIT');
UPDATE `ingredients` SET `measure` = 'WEIGHT'
    WHERE `category` IN ('MEAT', 'FISH_SEAFOOD', 'DAIRY_EGG', 'GRAIN', 'LEGUME', 'NUT_SEED', 'HERB_SPICE', 'OTHER');

-- Leaves, mushrooms, fresh legumes, olives, berries and dried fruit: only by
-- weight, nobody counts them.
UPDATE `ingredients` SET `measure` = 'WEIGHT' WHERE `id` IN (
    'ing_espinacas', 'ing_acelgas', 'ing_rucula', 'ing_champinones', 'ing_setas',
    'ing_esparragos', 'ing_judias_verdes', 'ing_guisantes', 'ing_maiz',
    'ing_coles_de_bruselas', 'ing_aceitunas',
    'ing_fresa', 'ing_uva', 'ing_cereza', 'ing_arandanos', 'ing_frambuesa',
    'ing_pasas', 'ing_datiles'
);

-- Pieces that are also weighed: sausages, whole fish, bread.
UPDATE `ingredients` SET `measure` = 'COUNT_OR_WEIGHT' WHERE `id` IN (
    'ing_salchichas', 'ing_morcilla', 'ing_chorizo',
    'ing_dorada', 'ing_lubina', 'ing_trucha',
    'ing_pan', 'ing_pan_integral'
);

-- Only counted.
UPDATE `ingredients` SET `measure` = 'COUNT' WHERE `id` IN (
    'ing_huevo', 'ing_yogur', 'ing_tortillas_de_trigo'
);

-- Liquids.
UPDATE `ingredients` SET `measure` = 'VOLUME' WHERE `id` IN (
    'ing_leche', 'ing_nata', 'ing_aceite_de_oliva', 'ing_vinagre', 'ing_salsa_de_soja',
    'ing_caldo_de_pollo', 'ing_caldo_de_verduras',
    'ing_bebida_de_avena', 'ing_bebida_de_soja', 'ing_bebida_de_almendras',
    'ing_vino_blanco', 'ing_vino_tinto'
);

-- Inventory quantities in a unit their food is no longer measured in keep
-- the food, without a quantity.
UPDATE `inventory_items` AS `item`
    JOIN `ingredients` AS `food` ON `food`.`id` = `item`.`ingredientId`
    SET `item`.`quantity` = NULL, `item`.`unit` = NULL
    WHERE `item`.`unit` IS NOT NULL AND NOT (
        (`food`.`measure` = 'WEIGHT' AND `item`.`unit` IN ('GRAM', 'KILOGRAM'))
        OR (`food`.`measure` = 'VOLUME' AND `item`.`unit` IN ('MILLILITER', 'LITER'))
        OR (`food`.`measure` = 'COUNT' AND `item`.`unit` = 'PIECE')
        OR (`food`.`measure` = 'COUNT_OR_WEIGHT' AND `item`.`unit` IN ('PIECE', 'GRAM', 'KILOGRAM'))
    );
