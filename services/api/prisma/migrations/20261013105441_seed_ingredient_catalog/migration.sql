-- Initial ingredient catalogue. Reference data that every environment needs,
-- so it travels with the migrations. The ids are stable: later migrations and
-- stories can refer to them.

-- VEGETABLE
INSERT INTO `ingredients` (`id`, `name`, `category`) VALUES
    ('ing_tomate', 'Tomate', 'VEGETABLE'),
    ('ing_cebolla', 'Cebolla', 'VEGETABLE'),
    ('ing_ajo', 'Ajo', 'VEGETABLE'),
    ('ing_zanahoria', 'Zanahoria', 'VEGETABLE'),
    ('ing_patata', 'Patata', 'VEGETABLE'),
    ('ing_pimiento_rojo', 'Pimiento rojo', 'VEGETABLE'),
    ('ing_pimiento_verde', 'Pimiento verde', 'VEGETABLE'),
    ('ing_calabacin', 'Calabacín', 'VEGETABLE'),
    ('ing_berenjena', 'Berenjena', 'VEGETABLE'),
    ('ing_pepino', 'Pepino', 'VEGETABLE'),
    ('ing_lechuga', 'Lechuga', 'VEGETABLE'),
    ('ing_espinacas', 'Espinacas', 'VEGETABLE'),
    ('ing_acelgas', 'Acelgas', 'VEGETABLE'),
    ('ing_brocoli', 'Brócoli', 'VEGETABLE'),
    ('ing_coliflor', 'Coliflor', 'VEGETABLE'),
    ('ing_col', 'Col', 'VEGETABLE'),
    ('ing_calabaza', 'Calabaza', 'VEGETABLE'),
    ('ing_puerro', 'Puerro', 'VEGETABLE'),
    ('ing_apio', 'Apio', 'VEGETABLE'),
    ('ing_champinones', 'Champiñones', 'VEGETABLE'),
    ('ing_setas', 'Setas', 'VEGETABLE'),
    ('ing_esparragos', 'Espárragos', 'VEGETABLE'),
    ('ing_alcachofa', 'Alcachofa', 'VEGETABLE'),
    ('ing_judias_verdes', 'Judías verdes', 'VEGETABLE'),
    ('ing_guisantes', 'Guisantes', 'VEGETABLE'),
    ('ing_maiz', 'Maíz', 'VEGETABLE'),
    ('ing_remolacha', 'Remolacha', 'VEGETABLE'),
    ('ing_rucula', 'Rúcula', 'VEGETABLE'),
    ('ing_boniato', 'Boniato', 'VEGETABLE'),
    ('ing_coles_de_bruselas', 'Coles de Bruselas', 'VEGETABLE'),
    ('ing_nabo', 'Nabo', 'VEGETABLE'),
    ('ing_rabano', 'Rábano', 'VEGETABLE'),
    ('ing_aguacate', 'Aguacate', 'VEGETABLE'),
    ('ing_aceitunas', 'Aceitunas', 'VEGETABLE');

-- FRUIT
INSERT INTO `ingredients` (`id`, `name`, `category`) VALUES
    ('ing_manzana', 'Manzana', 'FRUIT'),
    ('ing_platano', 'Plátano', 'FRUIT'),
    ('ing_naranja', 'Naranja', 'FRUIT'),
    ('ing_limon', 'Limón', 'FRUIT'),
    ('ing_mandarina', 'Mandarina', 'FRUIT'),
    ('ing_fresa', 'Fresa', 'FRUIT'),
    ('ing_uva', 'Uva', 'FRUIT'),
    ('ing_pera', 'Pera', 'FRUIT'),
    ('ing_melocoton', 'Melocotón', 'FRUIT'),
    ('ing_pina', 'Piña', 'FRUIT'),
    ('ing_melon', 'Melón', 'FRUIT'),
    ('ing_sandia', 'Sandía', 'FRUIT'),
    ('ing_kiwi', 'Kiwi', 'FRUIT'),
    ('ing_mango', 'Mango', 'FRUIT'),
    ('ing_cereza', 'Cereza', 'FRUIT'),
    ('ing_arandanos', 'Arándanos', 'FRUIT'),
    ('ing_frambuesa', 'Frambuesa', 'FRUIT'),
    ('ing_higo', 'Higo', 'FRUIT'),
    ('ing_coco', 'Coco', 'FRUIT'),
    ('ing_granada', 'Granada', 'FRUIT'),
    ('ing_ciruela', 'Ciruela', 'FRUIT'),
    ('ing_albaricoque', 'Albaricoque', 'FRUIT'),
    ('ing_pomelo', 'Pomelo', 'FRUIT'),
    ('ing_pasas', 'Pasas', 'FRUIT'),
    ('ing_datiles', 'Dátiles', 'FRUIT');

-- MEAT
INSERT INTO `ingredients` (`id`, `name`, `category`) VALUES
    ('ing_pollo', 'Pollo', 'MEAT'),
    ('ing_pavo', 'Pavo', 'MEAT'),
    ('ing_ternera', 'Ternera', 'MEAT'),
    ('ing_cerdo', 'Cerdo', 'MEAT'),
    ('ing_cordero', 'Cordero', 'MEAT'),
    ('ing_conejo', 'Conejo', 'MEAT'),
    ('ing_pato', 'Pato', 'MEAT'),
    ('ing_jamon_serrano', 'Jamón serrano', 'MEAT'),
    ('ing_jamon_cocido', 'Jamón cocido', 'MEAT'),
    ('ing_chorizo', 'Chorizo', 'MEAT'),
    ('ing_beicon', 'Beicon', 'MEAT'),
    ('ing_salchichas', 'Salchichas', 'MEAT'),
    ('ing_carne_picada', 'Carne picada', 'MEAT'),
    ('ing_higado', 'Hígado', 'MEAT'),
    ('ing_morcilla', 'Morcilla', 'MEAT');

-- FISH_SEAFOOD
INSERT INTO `ingredients` (`id`, `name`, `category`) VALUES
    ('ing_salmon', 'Salmón', 'FISH_SEAFOOD'),
    ('ing_atun', 'Atún', 'FISH_SEAFOOD'),
    ('ing_merluza', 'Merluza', 'FISH_SEAFOOD'),
    ('ing_bacalao', 'Bacalao', 'FISH_SEAFOOD'),
    ('ing_sardinas', 'Sardinas', 'FISH_SEAFOOD'),
    ('ing_boquerones', 'Boquerones', 'FISH_SEAFOOD'),
    ('ing_dorada', 'Dorada', 'FISH_SEAFOOD'),
    ('ing_lubina', 'Lubina', 'FISH_SEAFOOD'),
    ('ing_trucha', 'Trucha', 'FISH_SEAFOOD'),
    ('ing_caballa', 'Caballa', 'FISH_SEAFOOD'),
    ('ing_gambas', 'Gambas', 'FISH_SEAFOOD'),
    ('ing_langostinos', 'Langostinos', 'FISH_SEAFOOD'),
    ('ing_mejillones', 'Mejillones', 'FISH_SEAFOOD'),
    ('ing_almejas', 'Almejas', 'FISH_SEAFOOD'),
    ('ing_calamares', 'Calamares', 'FISH_SEAFOOD'),
    ('ing_sepia', 'Sepia', 'FISH_SEAFOOD'),
    ('ing_pulpo', 'Pulpo', 'FISH_SEAFOOD'),
    ('ing_anchoas', 'Anchoas', 'FISH_SEAFOOD');

-- DAIRY_EGG
INSERT INTO `ingredients` (`id`, `name`, `category`) VALUES
    ('ing_huevo', 'Huevo', 'DAIRY_EGG'),
    ('ing_leche', 'Leche', 'DAIRY_EGG'),
    ('ing_yogur', 'Yogur', 'DAIRY_EGG'),
    ('ing_queso', 'Queso', 'DAIRY_EGG'),
    ('ing_queso_fresco', 'Queso fresco', 'DAIRY_EGG'),
    ('ing_queso_de_cabra', 'Queso de cabra', 'DAIRY_EGG'),
    ('ing_queso_azul', 'Queso azul', 'DAIRY_EGG'),
    ('ing_mozzarella', 'Mozzarella', 'DAIRY_EGG'),
    ('ing_parmesano', 'Parmesano', 'DAIRY_EGG'),
    ('ing_mantequilla', 'Mantequilla', 'DAIRY_EGG'),
    ('ing_nata', 'Nata', 'DAIRY_EGG'),
    ('ing_requeson', 'Requesón', 'DAIRY_EGG');

-- GRAIN
INSERT INTO `ingredients` (`id`, `name`, `category`) VALUES
    ('ing_arroz', 'Arroz', 'GRAIN'),
    ('ing_arroz_integral', 'Arroz integral', 'GRAIN'),
    ('ing_pasta', 'Pasta', 'GRAIN'),
    ('ing_pan', 'Pan', 'GRAIN'),
    ('ing_pan_integral', 'Pan integral', 'GRAIN'),
    ('ing_avena', 'Avena', 'GRAIN'),
    ('ing_quinoa', 'Quinoa', 'GRAIN'),
    ('ing_cuscus', 'Cuscús', 'GRAIN'),
    ('ing_harina_de_trigo', 'Harina de trigo', 'GRAIN'),
    ('ing_fideos', 'Fideos', 'GRAIN'),
    ('ing_tortillas_de_trigo', 'Tortillas de trigo', 'GRAIN'),
    ('ing_bulgur', 'Bulgur', 'GRAIN');

-- LEGUME
INSERT INTO `ingredients` (`id`, `name`, `category`) VALUES
    ('ing_lentejas', 'Lentejas', 'LEGUME'),
    ('ing_garbanzos', 'Garbanzos', 'LEGUME'),
    ('ing_alubias_blancas', 'Alubias blancas', 'LEGUME'),
    ('ing_alubias_rojas', 'Alubias rojas', 'LEGUME'),
    ('ing_alubias_negras', 'Alubias negras', 'LEGUME'),
    ('ing_soja', 'Soja', 'LEGUME'),
    ('ing_tofu', 'Tofu', 'LEGUME'),
    ('ing_edamame', 'Edamame', 'LEGUME'),
    ('ing_habas', 'Habas', 'LEGUME'),
    ('ing_tempeh', 'Tempeh', 'LEGUME');

-- NUT_SEED
INSERT INTO `ingredients` (`id`, `name`, `category`) VALUES
    ('ing_almendras', 'Almendras', 'NUT_SEED'),
    ('ing_nueces', 'Nueces', 'NUT_SEED'),
    ('ing_avellanas', 'Avellanas', 'NUT_SEED'),
    ('ing_cacahuetes', 'Cacahuetes', 'NUT_SEED'),
    ('ing_pistachos', 'Pistachos', 'NUT_SEED'),
    ('ing_anacardos', 'Anacardos', 'NUT_SEED'),
    ('ing_pinones', 'Piñones', 'NUT_SEED'),
    ('ing_semillas_de_sesamo', 'Semillas de sésamo', 'NUT_SEED'),
    ('ing_semillas_de_chia', 'Semillas de chía', 'NUT_SEED'),
    ('ing_pipas_de_girasol', 'Pipas de girasol', 'NUT_SEED'),
    ('ing_pipas_de_calabaza', 'Pipas de calabaza', 'NUT_SEED');

-- HERB_SPICE
INSERT INTO `ingredients` (`id`, `name`, `category`) VALUES
    ('ing_perejil', 'Perejil', 'HERB_SPICE'),
    ('ing_cilantro', 'Cilantro', 'HERB_SPICE'),
    ('ing_albahaca', 'Albahaca', 'HERB_SPICE'),
    ('ing_oregano', 'Orégano', 'HERB_SPICE'),
    ('ing_romero', 'Romero', 'HERB_SPICE'),
    ('ing_tomillo', 'Tomillo', 'HERB_SPICE'),
    ('ing_menta', 'Menta', 'HERB_SPICE'),
    ('ing_comino', 'Comino', 'HERB_SPICE'),
    ('ing_pimenton', 'Pimentón', 'HERB_SPICE'),
    ('ing_pimienta_negra', 'Pimienta negra', 'HERB_SPICE'),
    ('ing_canela', 'Canela', 'HERB_SPICE'),
    ('ing_curry', 'Curry', 'HERB_SPICE'),
    ('ing_jengibre', 'Jengibre', 'HERB_SPICE'),
    ('ing_curcuma', 'Cúrcuma', 'HERB_SPICE'),
    ('ing_guindilla', 'Guindilla', 'HERB_SPICE'),
    ('ing_laurel', 'Laurel', 'HERB_SPICE'),
    ('ing_azafran', 'Azafrán', 'HERB_SPICE'),
    ('ing_nuez_moscada', 'Nuez moscada', 'HERB_SPICE'),
    ('ing_eneldo', 'Eneldo', 'HERB_SPICE');

-- OTHER
INSERT INTO `ingredients` (`id`, `name`, `category`) VALUES
    ('ing_aceite_de_oliva', 'Aceite de oliva', 'OTHER'),
    ('ing_vinagre', 'Vinagre', 'OTHER'),
    ('ing_miel', 'Miel', 'OTHER'),
    ('ing_azucar', 'Azúcar', 'OTHER'),
    ('ing_chocolate', 'Chocolate', 'OTHER'),
    ('ing_cacao', 'Cacao', 'OTHER'),
    ('ing_mostaza', 'Mostaza', 'OTHER'),
    ('ing_mayonesa', 'Mayonesa', 'OTHER'),
    ('ing_salsa_de_soja', 'Salsa de soja', 'OTHER'),
    ('ing_tomate_frito', 'Tomate frito', 'OTHER'),
    ('ing_caldo_de_pollo', 'Caldo de pollo', 'OTHER'),
    ('ing_caldo_de_verduras', 'Caldo de verduras', 'OTHER'),
    ('ing_seitan', 'Seitán', 'OTHER'),
    ('ing_bebida_de_avena', 'Bebida de avena', 'OTHER'),
    ('ing_bebida_de_soja', 'Bebida de soja', 'OTHER'),
    ('ing_bebida_de_almendras', 'Bebida de almendras', 'OTHER'),
    ('ing_cafe', 'Café', 'OTHER'),
    ('ing_vino_blanco', 'Vino blanco', 'OTHER'),
    ('ing_vino_tinto', 'Vino tinto', 'OTHER');
