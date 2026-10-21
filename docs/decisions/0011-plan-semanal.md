# 0011 — Plan semanal de comidas

- **Estado:** aceptada
- **Fecha:** 2026-10-21

## Contexto

US-018 (#36) pide un plan organizado por días de la semana, en el que el usuario asigna recetas a días y tipos de comida, las consulta, las cambia o las quita, y que se conserve al cerrar la app. Es la base de EP-04: US-019 (añadir desde las recomendaciones y elegir raciones), US-020 (reorganizar), US-021 (raciones) y US-022 (propuesta de menú). También lo será de la lista de compra (US-023).

El propietario acordó el alcance al planificar la historia, el 21-10-2026, y está en el issue:
- las comidas son desayuno, comida y cena;
- cada comida de un día tiene como mucho una receta;
- modificar una asignación incluye cambiar su día, su comida o su receta.

## Decisión

### Modelo

- Tabla `meal_plan_entries` (`MealPlanEntry`): cada fila es una receta del catálogo para una comida (`meal`: `BREAKFAST`, `LUNCH`, `DINNER`) de un día (`date`).
- **Fechas reales**, no una semana tipo. `date` es una columna `DATE` que viaja como `YYYY-MM-DD`, igual que la caducidad del inventario, para que la zona horaria no cambie el día. US-020 habla de cambiar la fecha, y la lista de compra necesitará saber qué semana se compra.
- **Una receta por comida:** clave única (`userId`, `date`, `meal`). La API la traduce a 409 `meal_slot_taken`, también cuando dos peticiones compiten por la misma comida. La clave sirve además de índice para leer el plan de un usuario por fechas.
- El orden de `MealType` es el del día; MySQL ordena los `ENUM` por su posición, así que el plan se lee ya en orden.
- Borrado en cascada con `users`, según la política de retención. Con `recipes` es `Restrict`: una receta planificada no puede salir del catálogo sin que su migración decida antes qué pasa con los planes.
- Todavía no hay raciones. Se añadirán con US-019 y US-021.

### API

Módulo `meal-plan`:
- `GET /meal-plan?from&to`: ambos días incluidos, como mucho 31 (`invalid_range`).
- `POST /meal-plan` y `PUT /meal-plan/:id` con `{date, meal, recipeId}`. El `PUT` reemplaza las tres cosas: mover y sustituir son la misma operación.
- `DELETE /meal-plan/:id`.

Como en el inventario, la entrada de otro usuario responde 404 (`meal_plan_entry_not_found`). Cada entrada devuelve el resumen de la receta (`RecipeSummaryResponse`), y el resumen se calcula con `rateRecipe`, el mismo que usa el catálogo.

### Restricciones

- **No se puede planificar una receta que choca con las restricciones** del usuario: 409 `recipe_not_allowed`. La comprobación es `hasConflicts`, la del catálogo (ADR 0003 y 0006).
- Si el usuario guarda después una restricción que choca con una receta ya planificada, **la entrada se conserva** y viene con `recipeConflicts: true`. La app lo avisa en el plan y en la entrada, y propone cambiar la receta o quitarla. Borrarla sin avisar haría desaparecer el plan del usuario sin explicación.
- Una entrada con conflicto se puede mover de día o de comida sin cambiar su receta. Solo se rechaza poner una receta nueva que choca.
- Las recetas con alérgenos sin verificar (`allergensUncertain`) se pueden planificar, marcadas igual que en el catálogo.

### App

- Pestaña «Plan», entre «Recetas» y «Mi despensa». Las pestañas nativas admiten cinco como máximo, así que **«Cuenta» pasa a ser una fila del menú de «Perfil»** (rutas `profile/account/*`).
- La pantalla del plan muestra la semana de lunes a domingo, con navegación a la anterior, la siguiente y «Volver a esta semana». Cada día va en una `Card` con sus tres comidas: una vacía abre el buscador (`plan/assign`) y una planificada abre la entrada (`plan/[id]`).
- El buscador usa el catálogo (`GET /recipes`), que ya excluye las recetas que chocan con las restricciones.
- La entrada abre la receta (`plan/recipe/[id]`, el mismo detalle), cambia el día (`DatePickerField`, ahora con `label` y `clearable`) y la comida (`SegmentedControl`), sustituye la receta o la quita. Avisa al salir sin guardar.
- Cada semana se guarda en caché aparte (`['meal-plan', desde, hasta]`). Como una entrada puede cambiar de semana, cualquier cambio invalida `['meal-plan']`. Guardar las alergias también lo invalida, para refrescar `recipeConflicts`.

## Consecuencias

- US-020 tiene ya mover, sustituir y quitar; le queda que la lista de compra refleje los cambios (US-023). Así consta en su issue (#38).
- US-019 tendrá que decidir qué hacer cuando la comida elegida ya tiene una receta (sustituirla o elegir otra). El 409 `meal_slot_taken` ya lo detecta.
- Las raciones (US-019 y US-021) requerirán una columna nueva y una migración. La lista de compra (US-023) leerá estas entradas con `combineQuantities`.
- Retirar una receta del catálogo exige una migración que resuelva antes sus entradas en los planes.
