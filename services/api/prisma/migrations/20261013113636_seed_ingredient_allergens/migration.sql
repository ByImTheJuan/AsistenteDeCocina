-- Allergens of the ingredients of the catalogue. Reference data, like the
-- catalogue. Ingredients left out of a group are not known to contain it; that
-- is not a guarantee against traces or cross-contamination.
--
-- Criteria: the 14 EU allergens follow the nature of each food. LACTOSE marks
-- every dairy product, including those that barely have any. FRUCTOSE marks
-- every fruit and the added sugars, and HISTAMINE and SORBITOL the foods
-- usually cited as high in them: the three are approximations to review.
-- No ingredient of the catalogue contains LUPIN.

-- GLUTEN
INSERT INTO `ingredient_allergens` (`ingredientId`, `allergen`) VALUES
    ('ing_harina_de_trigo', 'GLUTEN'),
    ('ing_pan', 'GLUTEN'),
    ('ing_pan_integral', 'GLUTEN'),
    ('ing_pasta', 'GLUTEN'),
    ('ing_fideos', 'GLUTEN'),
    ('ing_cuscus', 'GLUTEN'),
    ('ing_bulgur', 'GLUTEN'),
    ('ing_tortillas_de_trigo', 'GLUTEN'),
    ('ing_seitan', 'GLUTEN'),
    ('ing_avena', 'GLUTEN'),
    ('ing_bebida_de_avena', 'GLUTEN'),
    ('ing_salsa_de_soja', 'GLUTEN');

-- CRUSTACEANS
INSERT INTO `ingredient_allergens` (`ingredientId`, `allergen`) VALUES
    ('ing_gambas', 'CRUSTACEANS'),
    ('ing_langostinos', 'CRUSTACEANS');

-- EGG
INSERT INTO `ingredient_allergens` (`ingredientId`, `allergen`) VALUES
    ('ing_huevo', 'EGG'),
    ('ing_mayonesa', 'EGG');

-- FISH
INSERT INTO `ingredient_allergens` (`ingredientId`, `allergen`) VALUES
    ('ing_salmon', 'FISH'),
    ('ing_atun', 'FISH'),
    ('ing_merluza', 'FISH'),
    ('ing_bacalao', 'FISH'),
    ('ing_sardinas', 'FISH'),
    ('ing_boquerones', 'FISH'),
    ('ing_dorada', 'FISH'),
    ('ing_lubina', 'FISH'),
    ('ing_trucha', 'FISH'),
    ('ing_caballa', 'FISH'),
    ('ing_anchoas', 'FISH');

-- PEANUTS
INSERT INTO `ingredient_allergens` (`ingredientId`, `allergen`) VALUES
    ('ing_cacahuetes', 'PEANUTS');

-- SOY
INSERT INTO `ingredient_allergens` (`ingredientId`, `allergen`) VALUES
    ('ing_soja', 'SOY'),
    ('ing_tofu', 'SOY'),
    ('ing_edamame', 'SOY'),
    ('ing_tempeh', 'SOY'),
    ('ing_salsa_de_soja', 'SOY'),
    ('ing_bebida_de_soja', 'SOY');

-- MILK
INSERT INTO `ingredient_allergens` (`ingredientId`, `allergen`) VALUES
    ('ing_leche', 'MILK'),
    ('ing_yogur', 'MILK'),
    ('ing_queso', 'MILK'),
    ('ing_queso_fresco', 'MILK'),
    ('ing_queso_de_cabra', 'MILK'),
    ('ing_queso_azul', 'MILK'),
    ('ing_mozzarella', 'MILK'),
    ('ing_parmesano', 'MILK'),
    ('ing_mantequilla', 'MILK'),
    ('ing_nata', 'MILK'),
    ('ing_requeson', 'MILK'),
    ('ing_chocolate', 'MILK');

-- TREE_NUTS
INSERT INTO `ingredient_allergens` (`ingredientId`, `allergen`) VALUES
    ('ing_almendras', 'TREE_NUTS'),
    ('ing_nueces', 'TREE_NUTS'),
    ('ing_avellanas', 'TREE_NUTS'),
    ('ing_pistachos', 'TREE_NUTS'),
    ('ing_anacardos', 'TREE_NUTS'),
    ('ing_bebida_de_almendras', 'TREE_NUTS');

-- CELERY
INSERT INTO `ingredient_allergens` (`ingredientId`, `allergen`) VALUES
    ('ing_apio', 'CELERY'),
    ('ing_caldo_de_pollo', 'CELERY'),
    ('ing_caldo_de_verduras', 'CELERY');

-- MUSTARD
INSERT INTO `ingredient_allergens` (`ingredientId`, `allergen`) VALUES
    ('ing_mostaza', 'MUSTARD'),
    ('ing_mayonesa', 'MUSTARD'),
    ('ing_curry', 'MUSTARD');

-- SESAME
INSERT INTO `ingredient_allergens` (`ingredientId`, `allergen`) VALUES
    ('ing_semillas_de_sesamo', 'SESAME');

-- SULPHITES
INSERT INTO `ingredient_allergens` (`ingredientId`, `allergen`) VALUES
    ('ing_vino_blanco', 'SULPHITES'),
    ('ing_vino_tinto', 'SULPHITES'),
    ('ing_vinagre', 'SULPHITES'),
    ('ing_pasas', 'SULPHITES'),
    ('ing_gambas', 'SULPHITES'),
    ('ing_langostinos', 'SULPHITES'),
    ('ing_salchichas', 'SULPHITES'),
    ('ing_mostaza', 'SULPHITES');

-- MOLLUSCS
INSERT INTO `ingredient_allergens` (`ingredientId`, `allergen`) VALUES
    ('ing_mejillones', 'MOLLUSCS'),
    ('ing_almejas', 'MOLLUSCS'),
    ('ing_calamares', 'MOLLUSCS'),
    ('ing_sepia', 'MOLLUSCS'),
    ('ing_pulpo', 'MOLLUSCS');

-- LACTOSE
INSERT INTO `ingredient_allergens` (`ingredientId`, `allergen`) VALUES
    ('ing_leche', 'LACTOSE'),
    ('ing_yogur', 'LACTOSE'),
    ('ing_queso', 'LACTOSE'),
    ('ing_queso_fresco', 'LACTOSE'),
    ('ing_queso_de_cabra', 'LACTOSE'),
    ('ing_queso_azul', 'LACTOSE'),
    ('ing_mozzarella', 'LACTOSE'),
    ('ing_parmesano', 'LACTOSE'),
    ('ing_mantequilla', 'LACTOSE'),
    ('ing_nata', 'LACTOSE'),
    ('ing_requeson', 'LACTOSE'),
    ('ing_chocolate', 'LACTOSE');

-- FRUCTOSE
INSERT INTO `ingredient_allergens` (`ingredientId`, `allergen`) VALUES
    ('ing_albaricoque', 'FRUCTOSE'),
    ('ing_arandanos', 'FRUCTOSE'),
    ('ing_cereza', 'FRUCTOSE'),
    ('ing_ciruela', 'FRUCTOSE'),
    ('ing_coco', 'FRUCTOSE'),
    ('ing_datiles', 'FRUCTOSE'),
    ('ing_frambuesa', 'FRUCTOSE'),
    ('ing_fresa', 'FRUCTOSE'),
    ('ing_granada', 'FRUCTOSE'),
    ('ing_higo', 'FRUCTOSE'),
    ('ing_kiwi', 'FRUCTOSE'),
    ('ing_limon', 'FRUCTOSE'),
    ('ing_mandarina', 'FRUCTOSE'),
    ('ing_mango', 'FRUCTOSE'),
    ('ing_manzana', 'FRUCTOSE'),
    ('ing_melocoton', 'FRUCTOSE'),
    ('ing_melon', 'FRUCTOSE'),
    ('ing_naranja', 'FRUCTOSE'),
    ('ing_pasas', 'FRUCTOSE'),
    ('ing_pera', 'FRUCTOSE'),
    ('ing_pina', 'FRUCTOSE'),
    ('ing_platano', 'FRUCTOSE'),
    ('ing_pomelo', 'FRUCTOSE'),
    ('ing_sandia', 'FRUCTOSE'),
    ('ing_uva', 'FRUCTOSE'),
    ('ing_miel', 'FRUCTOSE'),
    ('ing_azucar', 'FRUCTOSE'),
    ('ing_chocolate', 'FRUCTOSE'),
    ('ing_tomate_frito', 'FRUCTOSE');

-- HISTAMINE
INSERT INTO `ingredient_allergens` (`ingredientId`, `allergen`) VALUES
    ('ing_queso', 'HISTAMINE'),
    ('ing_parmesano', 'HISTAMINE'),
    ('ing_queso_azul', 'HISTAMINE'),
    ('ing_yogur', 'HISTAMINE'),
    ('ing_chorizo', 'HISTAMINE'),
    ('ing_jamon_serrano', 'HISTAMINE'),
    ('ing_salchichas', 'HISTAMINE'),
    ('ing_beicon', 'HISTAMINE'),
    ('ing_morcilla', 'HISTAMINE'),
    ('ing_atun', 'HISTAMINE'),
    ('ing_sardinas', 'HISTAMINE'),
    ('ing_caballa', 'HISTAMINE'),
    ('ing_anchoas', 'HISTAMINE'),
    ('ing_boquerones', 'HISTAMINE'),
    ('ing_gambas', 'HISTAMINE'),
    ('ing_langostinos', 'HISTAMINE'),
    ('ing_mejillones', 'HISTAMINE'),
    ('ing_almejas', 'HISTAMINE'),
    ('ing_tomate', 'HISTAMINE'),
    ('ing_tomate_frito', 'HISTAMINE'),
    ('ing_espinacas', 'HISTAMINE'),
    ('ing_berenjena', 'HISTAMINE'),
    ('ing_aguacate', 'HISTAMINE'),
    ('ing_salsa_de_soja', 'HISTAMINE'),
    ('ing_vinagre', 'HISTAMINE'),
    ('ing_vino_blanco', 'HISTAMINE'),
    ('ing_vino_tinto', 'HISTAMINE'),
    ('ing_tempeh', 'HISTAMINE'),
    ('ing_chocolate', 'HISTAMINE'),
    ('ing_cacao', 'HISTAMINE'),
    ('ing_fresa', 'HISTAMINE'),
    ('ing_naranja', 'HISTAMINE'),
    ('ing_limon', 'HISTAMINE'),
    ('ing_mandarina', 'HISTAMINE'),
    ('ing_pomelo', 'HISTAMINE'),
    ('ing_pina', 'HISTAMINE'),
    ('ing_platano', 'HISTAMINE'),
    ('ing_kiwi', 'HISTAMINE'),
    ('ing_nueces', 'HISTAMINE'),
    ('ing_cacahuetes', 'HISTAMINE');

-- SORBITOL
INSERT INTO `ingredient_allergens` (`ingredientId`, `allergen`) VALUES
    ('ing_manzana', 'SORBITOL'),
    ('ing_pera', 'SORBITOL'),
    ('ing_melocoton', 'SORBITOL'),
    ('ing_albaricoque', 'SORBITOL'),
    ('ing_ciruela', 'SORBITOL'),
    ('ing_cereza', 'SORBITOL'),
    ('ing_datiles', 'SORBITOL'),
    ('ing_pasas', 'SORBITOL'),
    ('ing_aguacate', 'SORBITOL');

-- Processed foods whose composition depends on the brand: the allergens above
-- are the usual ones, and the label may add others.
UPDATE `ingredients` SET `allergensUncertain` = true WHERE `id` IN (
    'ing_salchichas',
    'ing_chorizo',
    'ing_morcilla',
    'ing_beicon',
    'ing_jamon_cocido',
    'ing_caldo_de_pollo',
    'ing_caldo_de_verduras',
    'ing_chocolate',
    'ing_mayonesa',
    'ing_mostaza',
    'ing_salsa_de_soja',
    'ing_tomate_frito',
    'ing_pan',
    'ing_pan_integral',
    'ing_pasta',
    'ing_fideos',
    'ing_tortillas_de_trigo',
    'ing_bebida_de_avena',
    'ing_bebida_de_soja',
    'ing_bebida_de_almendras',
    'ing_seitan',
    'ing_curry'
);
