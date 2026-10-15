-- Other names of catalogue foods: regional variants and the plurals of foods
-- whose catalogue name is singular (searching "tomates" does not contain
-- "Tomate"). Not exhaustive. Ambiguous names that could mean several foods
-- (frijoles, porotos, chile) are left out. Criteria in
-- docs/decisions/0005-unidades-y-equivalencias.md.
INSERT INTO `ingredient_aliases` (`alias`, `ingredientId`) VALUES
    -- VEGETABLE
    ('Tomates', 'ing_tomate'),
    ('Jitomate', 'ing_tomate'),
    ('Cebollas', 'ing_cebolla'),
    ('Ajos', 'ing_ajo'),
    ('Zanahorias', 'ing_zanahoria'),
    ('Patatas', 'ing_patata'),
    ('Papa', 'ing_patata'),
    ('Papas', 'ing_patata'),
    ('Calabacines', 'ing_calabacin'),
    ('Calabacita', 'ing_calabacin'),
    ('Zapallito', 'ing_calabacin'),
    ('Zucchini', 'ing_calabacin'),
    ('Berenjenas', 'ing_berenjena'),
    ('Pepinos', 'ing_pepino'),
    ('Zapallo', 'ing_calabaza'),
    ('Puerros', 'ing_puerro'),
    ('Alcachofas', 'ing_alcachofa'),
    ('Ejotes', 'ing_judias_verdes'),
    ('Vainitas', 'ing_judias_verdes'),
    ('Arvejas', 'ing_guisantes'),
    ('Chícharos', 'ing_guisantes'),
    ('Choclo', 'ing_maiz'),
    ('Elote', 'ing_maiz'),
    ('Betabel', 'ing_remolacha'),
    ('Camote', 'ing_boniato'),
    ('Batata', 'ing_boniato'),
    ('Aguacates', 'ing_aguacate'),
    ('Palta', 'ing_aguacate'),
    -- FRUIT
    ('Manzanas', 'ing_manzana'),
    ('Plátanos', 'ing_platano'),
    ('Banana', 'ing_platano'),
    ('Banano', 'ing_platano'),
    ('Naranjas', 'ing_naranja'),
    ('Limones', 'ing_limon'),
    ('Fresas', 'ing_fresa'),
    ('Frutilla', 'ing_fresa'),
    ('Peras', 'ing_pera'),
    ('Durazno', 'ing_melocoton'),
    ('Melocotones', 'ing_melocoton'),
    ('Ananá', 'ing_pina'),
    ('Toronja', 'ing_pomelo'),
    ('Damasco', 'ing_albaricoque'),
    ('Chabacano', 'ing_albaricoque'),
    -- MEAT
    ('Jamón york', 'ing_jamon_cocido'),
    ('Bacon', 'ing_beicon'),
    ('Carne molida', 'ing_carne_picada'),
    -- DAIRY_EGG
    ('Huevos', 'ing_huevo'),
    ('Yogurt', 'ing_yogur'),
    ('Crema de leche', 'ing_nata'),
    -- LEGUME
    ('Soya', 'ing_soja'),
    -- NUT_SEED
    ('Maní', 'ing_cacahuetes'),
    ('Cacahuates', 'ing_cacahuetes'),
    -- HERB_SPICE
    ('Paprika', 'ing_pimenton'),
    -- OTHER
    ('Salsa de soya', 'ing_salsa_de_soja'),
    ('Leche de avena', 'ing_bebida_de_avena'),
    ('Leche de soja', 'ing_bebida_de_soja'),
    ('Leche de almendras', 'ing_bebida_de_almendras');
