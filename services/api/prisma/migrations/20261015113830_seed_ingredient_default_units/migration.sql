-- Suggested unit of each catalogue food: the one it is usually measured in,
-- offered first when the user records a quantity. A value per category and
-- the exceptions below. Criteria and limits in
-- docs/decisions/0005-unidades-y-equivalencias.md.

-- Fruit and vegetables are counted; meat, fish, grains, legumes, nuts and
-- spices are weighed.
UPDATE `ingredients` SET `defaultUnit` = 'PIECE' WHERE `category` IN ('VEGETABLE', 'FRUIT');
UPDATE `ingredients` SET `defaultUnit` = 'GRAM'
    WHERE `category` IN ('MEAT', 'FISH_SEAFOOD', 'DAIRY_EGG', 'GRAIN', 'LEGUME', 'NUT_SEED', 'HERB_SPICE', 'OTHER');

-- Leaves, mushrooms, fresh legumes, olives, berries and dried fruit: by weight.
UPDATE `ingredients` SET `defaultUnit` = 'GRAM' WHERE `id` IN (
    'ing_espinacas', 'ing_acelgas', 'ing_rucula', 'ing_champinones', 'ing_setas',
    'ing_esparragos', 'ing_judias_verdes', 'ing_guisantes', 'ing_maiz',
    'ing_coles_de_bruselas', 'ing_calabaza', 'ing_aceitunas',
    'ing_fresa', 'ing_uva', 'ing_cereza', 'ing_arandanos', 'ing_frambuesa',
    'ing_pasas', 'ing_datiles'
);

-- Pieces that are counted.
UPDATE `ingredients` SET `defaultUnit` = 'PIECE' WHERE `id` IN (
    'ing_salchichas', 'ing_morcilla', 'ing_dorada', 'ing_lubina', 'ing_trucha',
    'ing_huevo', 'ing_yogur', 'ing_pan', 'ing_pan_integral'
);

-- Sold in packs or tins whose content is not weighed.
UPDATE `ingredients` SET `defaultUnit` = 'PACKAGE' WHERE `id` IN (
    'ing_tortillas_de_trigo', 'ing_anchoas'
);

-- Liquids.
UPDATE `ingredients` SET `defaultUnit` = 'LITER' WHERE `id` IN (
    'ing_leche', 'ing_aceite_de_oliva', 'ing_caldo_de_pollo', 'ing_caldo_de_verduras',
    'ing_bebida_de_avena', 'ing_bebida_de_soja', 'ing_bebida_de_almendras',
    'ing_vino_blanco', 'ing_vino_tinto'
);
UPDATE `ingredients` SET `defaultUnit` = 'MILLILITER' WHERE `id` IN (
    'ing_nata', 'ing_vinagre', 'ing_salsa_de_soja'
);
