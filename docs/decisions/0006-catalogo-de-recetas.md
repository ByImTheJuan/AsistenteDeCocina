# 0006 — Catálogo de recetas

- **Estado:** aceptada
- **Fecha:** 2026-10-15

## Contexto

US-012 (#30) es la primera historia de EP-03. Hasta ahora no había recetas en el sistema, y de ellas dependen el detalle (US-013), las recetas según el inventario (US-014), las recomendaciones (US-015), el buscador (US-016) y la planificación de comidas. El backlog dejaba abierta la decisión del catálogo inicial («Decisiones pendientes antes de estimar»).

El alcance se acordó con el propietario antes de implementar y está en el issue #30.

## Decisión

- **Recetas propias.** El catálogo inicial son 24 recetas caseras escritas en español para el proyecto: desayunos, ensaladas, cremas, legumbres, arroces y pasta, pescado, carne, platos vegetarianos y veganos, y postres. Se descartó una API externa (Spoonacular, Edamam…) por las claves, el coste, las licencias, el contenido en inglés y porque sus ingredientes no casan con nuestro catálogo ni con los alérgenos.
- **Sembradas por migración**, como el catálogo de ingredientes (ADR 0002): son datos de referencia que necesitan todos los entornos. Los ids son estables (`rec_tortilla_patatas`). Para añadir o corregir recetas, otra migración.
- **Modelo:**
  - `recipes`: nombre, descripción, `imageUrl` opcional, `totalMinutes` (de empezar a servir, reposo incluido) y `servings` (raciones para las que son las cantidades).
  - `recipe_ingredients`: los ingredientes en orden (`position`), siempre del catálogo de ingredientes. Cantidad y unidad van juntas; sin ellas, el ingrediente va «al gusto». Tienen una nota opcional («picada») y la marca `main`.
  - `recipe_steps`: los pasos en orden.
- **Unidades:** cada línea usa una unidad de la medida del ingrediente (ADR 0005) o una de las que son solo de receta: cucharada, cucharadita y pizca. Lo comprueba la prueba de integridad de `test/recipes.e2e-spec.ts`.
- **Ingredientes principales:** los marca a mano la siembra con `main`. Son los que el catálogo muestra en cada receta, no los que la definen nutricionalmente.
- **La sal** no estaba en el catálogo de ingredientes y casi todas las recetas la llevan, así que se añadió (`ing_sal`, migración `seed_salt`). El agua no se trata como ingrediente: los pasos la mencionan sin cantidad.
- **Valoraciones:** todavía no existen reseñas (EP-08), así que no hay tabla de reseñas. La API devuelve `rating: null` y la app muestra «Sin valoraciones». El contrato ya define `{ average, count }` para cuando las haya.
- **Imágenes:** ninguna receta tiene imagen por ahora. La app muestra un marcador neutro. Las imágenes llegarán cuando se decida su almacenamiento (un servicio compatible con S3, según el stack).
- **Restricciones de seguridad (obligatorias):**
  - `recipeSafety` (`services/api/src/recipes/recipe-safety.ts`) compara los ingredientes de una receta con las restricciones del usuario. Es conflicto un ingrediente restringido o un alérgeno restringido presente en algún ingrediente. La receta es incierta si algún ingrediente es `allergensUncertain`. **US-015 y US-016 deben usar esta función.**
  - `GET /recipes` **oculta** las recetas con conflictos y devuelve cuántas ha ocultado (`hiddenCount`). La app lo indica.
  - Las inciertas se muestran con la etiqueta «Revisa los alérgenos».
  - `GET /recipes/:id` también abre una receta oculta, con sus conflictos en `safety`, y la app avisa de que no es apta.
  - La app vuelve a pedir las recetas al guardar las alergias.
  - Como el mapeo de alérgenos no está validado (ADR 0003), el detalle recuerda que la información es orientativa.
- **Sin paginación:** con 24 recetas se devuelven todas, por nombre. El buscador y los filtros (US-016) decidirán la paginación cuando el catálogo crezca.

## Consecuencias

- Las recetas, los tiempos y las cantidades los ha escrito el proyecto **sin una fuente validada**. No hay información nutricional: la añadirá US-013, indicando que son estimaciones.
- El catálogo no contiene datos de usuarios: no se borra con la cuenta (`docs/data-retention-policy.md`).
- Las recetas publicadas por usuarios (EP-07) tendrán que decidir cómo conviven con estas tablas: autoría, publicación y anonimización al borrar la cuenta.
- Si se elimina un ingrediente del catálogo que usa una receta, la base de datos lo impide (`onDelete: Restrict`): hay que cambiar antes la receta.
