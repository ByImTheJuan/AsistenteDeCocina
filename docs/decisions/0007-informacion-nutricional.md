# 0007 — Información nutricional de las recetas

- **Estado:** aceptada
- **Fecha:** 2026-10-15

## Contexto

US-013 (#31) pide mostrar las calorías y los demás valores nutricionales de una receta, indicando cuándo son estimaciones y sin inventar lo que falte. También debe cubrir un criterio trasladado de US-004: que los detalles nutricionales reflejen los objetivos configurados cuando haya datos suficientes. El catálogo de recetas (ADR 0006) no tenía ningún dato nutricional.

El alcance se acordó con el propietario antes de implementar y está en el issue #31.

## Decisión

- **Calculada a partir de los ingredientes**, no escrita a mano por receta. Así se aprovecha para cualquier receta futura, incluidas las de los usuarios (EP-07).
- **Solo calorías y proteínas**, los nutrientes de los objetivos que existen (US-004). Añadir otro nutriente exige una columna por 100 g y su valor en cada ingrediente.
- **Datos por ingrediente** (columnas opcionales de `ingredients`, sembradas por `seed_ingredient_nutrition`):
  - `kcalPer100g` y `proteinPer100g`, de la parte comestible. Para cereales y legumbres secas, en crudo. Los garbanzos están cocidos, porque así los usan las recetas.
  - `gramsPerPiece`: peso medio de una unidad de los alimentos que se cuentan. Para el ajo es una cabeza; las recetas pesan los dientes (5 g cada uno), con el número en la nota.
  - `gramsPerMilliliter`: densidad, para los líquidos y para los sólidos que las recetas miden en cucharadas.
- **Cálculo** (`recipeNutrition`, `services/api/src/recipes/recipe-nutrition.ts`):
  - cada línea con cantidad se pasa a gramos: masa directa; volumen (ml, l, cucharada de 15 ml y cucharadita de 5 ml) con la densidad; unidades con el peso medio;
  - se suma y se divide entre las raciones de la receta, con las calorías redondeadas a la unidad y las proteínas a un decimal;
  - la pizca y los ingredientes «al gusto» no cuentan; la respuesta indica si hay ingredientes al gusto;
  - **si a una línea le falta un dato, ese nutriente es `null`** y el ingrediente se lista en `missingIngredients`. Nunca se presenta un total parcial como completo.
- **Siempre es una estimación** (`estimated: true`), y la app lo dice.
- **Frente a los objetivos** (`nutritionGoalsFit`, `services/api/src/recipes/nutrition-goals-fit.ts`):
  - solo cuentan los objetivos activos;
  - una ración se compara con el porcentaje de las calorías y de las proteínas diarias, y con si cabe en el objetivo de calorías por comida;
  - sin el dato de la receta, el objetivo aparece como no comparable.
  - **US-015 debe reutilizar estas funciones.**
- **Raciones:** la app recalcula las cantidades para las raciones elegidas (de 1 a 12), sin guardarlas. Los valores nutricionales son siempre por ración.

## Relación con el ADR 0005

Las equivalencias entre unidades y gramos (peso por unidad y densidad) dependen del alimento y son aproximadas. **Solo sirven para estimar la nutrición.** La regla del ADR 0005 sigue vigente: al comparar o sumar cantidades (despensa, recetas según la despensa y lista de compra), no se convierte entre magnitudes.

## Consecuencias

- Los valores son medias aproximadas escritas para el proyecto, **sin fuente validada**. Antes de usarlos para algo más que orientar, hay que revisarlos con una fuente fiable, como la Base de Datos Española de Composición de Alimentos (BEDCA).
- Los alimentos elaborados (pan, chorizo, caldo, tomate frito…) varían según la marca.
- Los aceites de fritura cuentan enteros, aunque parte no se absorba, así que algunas recetas (la tortilla) salen por encima de lo real.
- La prueba de integridad de `test/recipes.e2e-spec.ts` exige que todas las recetas del catálogo tengan nutrición completa: una receta nueva no puede usar un ingrediente sin los datos que necesita su unidad.
