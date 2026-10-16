# 0008 — Recetas según la despensa

- **Estado:** aceptada
- **Fecha:** 2026-10-16

## Contexto

US-014 (#32) pide recetas que aprovechen los alimentos de «Mi despensa». Hay que distinguir las que se pueden preparar con lo disponible, indicar lo que falta y ofrecer alternativas. También debe cubrir dos criterios trasladados de US-011: descubrir recetas para los alimentos próximos a caducar, y que las sugerencias no sustituyan comprobar que un alimento es apto.

El alcance se acordó con el propietario antes de implementar y está en el issue #32.

## Decisión

- **La comparación la hace la API** con `GET /recipes/pantry?today=YYYY-MM-DD`, que devuelve las recetas aptas (las que tienen conflictos con las restricciones siguen ocultas, con `recipeSafety`) junto con su situación frente a la despensa. `today` es el día del dispositivo, porque de él depende si un alimento ha caducado, como en «Mi despensa».
- **`pantryMatch`** (`services/api/src/recipes/pantry-match.ts`, función pura) compara cada ingrediente de la receta con los registros del usuario de ese alimento:
  - Las cantidades de la receta para un mismo alimento se suman, y también las de la despensa, con `combineQuantities`. Se comparan con `convert`, **solo dentro de la misma magnitud** (ADR 0005), y con las raciones propias de la receta.
  - **Si hay menos de lo necesario**, el ingrediente falta y se indica lo que hay («tienes 200 g de 600 g»).
  - **Si las magnitudes no coinciden** (3 patatas frente a 600 g), cuenta como disponible y se pide comprobar la cantidad. Las equivalencias de la nutrición (ADR 0007) no se usan aquí.
  - **Un registro sin cantidad** está siempre disponible.
  - **Los ingredientes al gusto y en pizca** no impiden preparar la receta. Si no están en la despensa, se pide comprobar que se tienen.
  - **Un alimento cuya fecha de caducidad (`USE_BY`) es hoy o ya pasó no cuenta como disponible.** Si es lo único que hay de ese alimento, falta y se marca como caducado. El consumo preferente pasado sí cuenta.
  - Para lo que se usa de casa, devuelve la fecha más próxima de los registros que cuentan.
- **Secciones (app, `groupPantryRecipes` en `apps/mobile/src/features/recipes/pantry-recipes.ts`):**
  - Solo se sugieren las recetas que se pueden preparar o las que usan algo de la despensa y a las que les faltan como mucho 3 ingredientes (`MAX_MISSING`).
  - «Aprovecha lo que caduca pronto» reúne las que usan algún alimento que caduca pronto según `isExpiringSoon` (los mismos 3 días de «Mi despensa»), ordenadas por esa fecha. «Puedes prepararlas» va por nombre. «Te falta poco» va primero por las que necesitan menos ingredientes que no se tienen y después por las que usan más de la despensa.
  - Cada receta aparece en una sola sección, y «Aprovecha» tiene prioridad.
- **Seguridad alimentaria:** la vista recuerda siempre revisar el estado de los alimentos, porque las sugerencias se basan en las fechas que registró el usuario.
- **Sin despensa útil** (vacía o sin recetas que sugerir), se invita a añadir alimentos y a ver todas las recetas.
- Cambiar la despensa invalida la caché `['recipes', 'pantry']`.

## Consecuencias

- US-015 (recomendaciones) puede reutilizar `pantryMatch` para valorar las recetas que aprovechan la despensa, y US-023 (lista de compra) puede partir de lo que falta, que ya viene en una unidad de la receta.
- La comparación es tan buena como lo registrado: cantidades sin actualizar o alimentos sin fecha dan sugerencias optimistas. Por eso se pide comprobar la cantidad cuando no se puede comparar, y el estado del alimento siempre.
- La comparación no descuenta nada de la despensa. Eso será de US-010, al cocinar.
