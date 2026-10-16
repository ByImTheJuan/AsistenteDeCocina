# 0010 — Búsqueda y filtros de recetas

- **Estado:** aceptada
- **Fecha:** 2026-10-16

## Contexto

US-016 (#34) pide buscar recetas por nombre o ingrediente, filtrarlas, combinar los filtros y poder retirarlos, siempre respetando las restricciones del usuario. También cubre un criterio trasladado de US-015 (#33): ordenar o filtrar por tiempo de preparación y calorías.

El filtro por tipo de plato se retiró de la historia con el propietario, porque las recetas no tienen esa clasificación. El resto del alcance se acordó también con él y está en el issue.

## Decisión

### Dónde se filtra

**Filtra la API.** `GET /recipes` y `GET /recipes/pantry` aceptan estos parámetros (`RecipeFiltersQuery`), todos opcionales:
- `search`;
- `maxMinutes`;
- `maxCalories`;
- `diet`: `VEGETARIAN`, `VEGAN` o `PESCATARIAN`;
- `sort`: `NAME`, `TIME` o `CALORIES`.

Los filtros dependen de datos que solo tiene la API: los sinónimos, el origen de cada alimento y la nutrición estimada. Así no se repite lógica en la app.

Las recomendaciones (`GET /recipes/recommendations`) no aceptan filtros y responden 400 si se les pasan.

### Cómo filtra

Las funciones puras están en `src/recipes/recipe-filters.ts`.
- **Primero las restricciones.** Los filtros solo reducen las recetas aptas. Una búsqueda nunca devuelve una receta oculta por las alergias, y `hiddenCount` sigue contando las ocultas en todo el catálogo.
- **Búsqueda:**
  - cada palabra tiene que aparecer en el nombre, en un ingrediente o en un sinónimo de él (papa → Patata);
  - no distingue mayúsculas ni tildes (`normalize`, con NFD).
- **Calorías:**
  - se comparan las calorías por ración estimadas con `recipeNutrition` (ADR 0007);
  - con un límite, se excluyen las recetas sin datos suficientes, porque no se puede comprobar que lo cumplan;
  - al ordenar por calorías, van al final.
- **Dieta:** `dietAllows` y `ingredients.origin`, los mismos que las recomendaciones (ADR 0009). La flexitariana no se ofrece porque lo permite todo.
- **Orden:**
  - por defecto, por nombre;
  - por tiempo o por calorías, de menos a más;
  - los empates van por nombre (orden estable).
- La búsqueda es en memoria sobre las 24 recetas. Si el catálogo crece mucho, habrá que llevarla a la consulta SQL.

**Todo resumen de receta incluye `caloriesPerServing`**, estimado o `null`. La lista lo muestra: «45 min · 678 kcal · Sin valoraciones».

### Interfaz (app)

**Bajo el selector «Ver»:**
- el campo «Buscar recetas», que busca cuando se deja de escribir durante 300 ms;
- el botón «Filtros», o «Filtros (n)» con filtros activos;
- con filtros activos, su resumen («Filtros: Vegana · Menos tiempo») y «Quitar filtros», que también borra la búsqueda.

**Pantalla de filtros** (`recipes/filters`, en modal):
- un `SegmentedControl` por grupo:
  - Tiempo: hasta 15, 30 o 60 min;
  - Calorías por ración: hasta 300, 500 o 700 kcal, o el objetivo por comida si está activo;
  - Dieta;
  - Ordenar por.
- Se edita un borrador: «Ver resultados» lo aplica y «Quitar filtros» lo vacía.

**Las dos vistas, «Todas» y «Con mi despensa», usan los mismos filtros.** En la de la despensa, cada sección conserva su criterio (la fecha de caducidad, lo que falta) y el orden elegido decide los empates.

**Sin resultados por la búsqueda o los filtros:** «No hay recetas que coincidan», con «Quitar filtros». Se distingue de «No hay recetas aptas para ti» (todo oculto por las alergias) y del estado de la despensa vacía.

**Estado:** la búsqueda y los filtros están en un contexto del layout de la pestaña (`RecipeFiltersProvider`). Duran mientras la pestaña está montada y no se guardan en el servidor.

**`SegmentedControl` reparte las opciones en varias filas.** Cada opción mide al menos 120 pt de ancho. Dos opciones se ven como antes; cuatro o cinco, o con el texto grande, ocupan varias filas.

## Consecuencias

- Añadir un filtro es añadir un parámetro al DTO y una condición en `matchesFilters`, sin migraciones.
- Los límites de calorías dependen de datos sin fuente validada (ADR 0007), así que la pantalla de filtros recuerda que son estimaciones.
- La caché de la app guarda cada combinación de búsqueda y filtros con su propia clave bajo `['recipes']`, así que las invalidaciones por prefijo siguen funcionando.
