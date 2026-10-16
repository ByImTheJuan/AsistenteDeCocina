# 0009 — Recomendaciones personalizadas

- **Estado:** aceptada
- **Fecha:** 2026-10-16

## Contexto

US-015 (#33) pide recomendar recetas adaptadas a los gustos, las restricciones y los objetivos del usuario. También debe cubrir criterios trasladados de otras historias:
- US-003: las preferencias guardadas.
- US-004: los objetivos, cuando hay datos suficientes.
- US-005: excluir las recetas con alérgenos restringidos y no presentar como segura una receta sin información suficiente.

El propietario quiere ver las recomendaciones como tarjetas de una en una, al estilo de Tinder. El alcance se acordó con él antes de implementar y está en el issue. Ordenar y filtrar por tiempo y calorías se trasladó a US-016 (#34).

## Decisión

### Qué se recomienda (API)

**`GET /recipes/recommendations?today=YYYY-MM-DD`** devuelve las recetas recomendadas, en orden. `today` es el día del dispositivo, como en las recetas según la despensa (ADR 0008). La respuesta incluye:
- `hiddenCount`: las recetas ocultas por las restricciones;
- `excludedCount`: las descartadas por la dieta o por los gustos.

Las recetas pasan por tres filtros, en este orden:
1. **Las restricciones, que son obligatorias.** `recipeSafety` deja fuera toda receta con un conflicto, igual que el catálogo.
2. **La dieta**, con la nueva columna `ingredients.origin`:
   - vegana: solo `PLANT`;
   - vegetariana: sin `MEAT` ni `FISH`;
   - pescetariana: sin `MEAT`;
   - flexitariana o sin dieta: todo (`dietAllows`).
3. **Los alimentos de «No me gustan».**

La dieta y los gustos solo excluyen de las recomendaciones: la receta sigue en el catálogo, porque son preferencias y no restricciones.

**Columna `ingredients.origin`** (`PLANT`, `ANIMAL_PRODUCT`, `FISH`, `MEAT`), sembrada en la migración `add_ingredient_origin`:
- se parte de la categoría;
- pasan a `ANIMAL_PRODUCT` los elaborados con el alérgeno huevo o leche (mayonesa, chocolate);
- pasan a `FISH` los que tienen pescado, crustáceos o moluscos;
- `ing_caldo_de_pollo` pasa a `MEAT` y `ing_miel` a `ANIMAL_PRODUCT`, porque nada en el catálogo los delata.

Esta clasificación no tiene fuente validada. Los ingredientes nuevos tienen que traer su `origin` en la migración que los añada.

**Orden (`recommendationScore`, en `src/recipes/recommendations.ts`):** puntos fijos que se pueden explicar en la tarjeta.

| Señal | Puntos |
|---|---|
| Cada alimento de «Me gustan» (cuentan como mucho 3) | +3 |
| Se puede preparar con la despensa (`pantryMatch`) | +3 |
| Usa algo de la despensa y le faltan como mucho 3 ingredientes | +1 |
| Usa algo que caduca en los próximos 3 días | +2 |
| Una ración cabe en el objetivo por comida (`nutritionGoalsFit`) | +2 |
| Una ración supera el objetivo por comida | −4 |
| Algún ingrediente tiene alérgenos sin verificar | −1 |

- Los empates se deshacen por el nombre.
- Los 3 días son el mismo umbral que «Caducan pronto» en la app (`EXPIRING_SOON_DAYS`, repetido en los dos lados). Si cambia, hay que cambiarlo en ambos.
- Sin datos nutricionales suficientes, el objetivo no suma ni resta.

**Cada receta trae lo que explica su puesto:**
- `likedIngredients`;
- `pantry`;
- `perServing`, la nutrición estimada;
- `goals`;
- `allergensUncertain`.

### Cómo se muestra (app)

**Pestaña «Para ti»**, la primera, en lugar de la «Home» de la plantilla. Tiene su propio Stack, así que la receta se abre encima de las tarjetas.

**`SwipeDeck`**, componente compartido de `src/components`:
- muestra una tarjeta, con la siguiente asomando por detrás;
- deslizar a la derecha acepta y a la izquierda rechaza;
- se decide al pasar del 30 % del ancho o con un gesto rápido; si no, la tarjeta vuelve a su sitio;
- los botones de debajo y las acciones de accesibilidad de la tarjeta hacen lo mismo, para quien no pueda deslizar;
- usa react-native-gesture-handler y Reanimated, que vienen con Expo y funcionan en Expo Go;
- con «reducir movimiento» activado, Reanimated se salta la animación.

**Aceptar abre el detalle de la receta.** Guardarla desde el detalle será de US-029.

**Rechazar solo dura la sesión.** Las recetas vistas, aceptadas o rechazadas, se guardan en el estado de la pantalla. No vuelven a salir mientras la pestaña siga montada, aunque se recarguen los datos. Al reabrir la app o al cerrar sesión, vuelven a proponerse. No se guarda nada en el servidor.

**La tarjeta explica la recomendación** con `describeRecommendation`:
- «Lleva huevo, que te gusta»;
- «Puedes prepararla con lo que tienes en casa» o «Te falta: …»;
- «Usa Tomate · Caduca mañana»;
- «520 kcal por ración · Dentro de tu objetivo por comida».

Si los alérgenos no se pueden verificar, muestra la etiqueta «Revisa los alérgenos», y la receta nunca se presenta como segura.

**Cuando hay pocas recetas que encajan:**
- sin ninguna, se dice por qué, con cuántas se ocultaron por alergias y cuántas por dieta o gustos, y se ofrece el catálogo;
- con menos de 3, un aviso lo dice;
- al terminar el mazo, «No hay más recomendaciones» con «Ver el catálogo».

**Caché:** las recomendaciones dependen de todo el perfil.
- Guardar las alergias o los objetivos ya invalida `['recipes']`.
- Ahora guardar las preferencias y cambiar la despensa invalidan también `['recipes', 'recommendations']`.

## Consecuencias

- Lo descartado no se recuerda entre sesiones. Si hiciera falta, sería una historia nueva con su tabla.
- Con 24 recetas y una dieta estricta, quedan pocas. La pantalla lo dice en lugar de proponer recetas que no encajan.
- La puntuación es deliberadamente simple. Cambiarla es cambiar `SCORE` y sus pruebas, sin migraciones.
- US-016 (filtros) puede reutilizar `dietAllows` si añade un filtro por dieta.
