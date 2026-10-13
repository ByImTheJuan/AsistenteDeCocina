# 0003 — Alérgenos y restricciones de seguridad

- **Estado:** aceptada
- **Fecha:** 2026-10-13

## Contexto

US-005 pide que el usuario registre sus alergias e intolerancias y que la aplicación las trate como restricciones estrictas, distintas de los gustos de US-003. Para poder excluir recetas más adelante (US-015) hace falta saber qué contiene cada ingrediente.

## Decisión

- **Lista de alérgenos como enum** (`Allergen`): los 14 de declaración obligatoria en la UE (Reglamento 1169/2011) y cuatro intolerancias habituales (lactosa, fructosa, histamina y sorbitol). Es una lista regulada y estable; añadir uno exige una migración.
- **El usuario puede restringir alérgenos y también ingredientes concretos** del catálogo (por ejemplo kiwi o melocotón), en `allergen_restrictions` e `ingredient_restrictions`. Son tablas distintas de `ingredient_preferences`: gusto y seguridad no comparten almacenamiento ni endpoints.
- **Una sola lista**, sin distinguir alergia de intolerancia. Todo se trata como restricción estricta.
- **Mapeo ingrediente → alérgeno** en `ingredient_allergens`, sembrado por la migración `seed_ingredient_allergens` (162 relaciones). Toda respuesta de la API que devuelve un ingrediente incluye sus `allergens`.
- **`ingredients.allergensUncertain`** marca los 22 productos elaborados cuya composición depende de la marca (embutidos, caldos, pan, pasta, salsas, bebidas vegetales, chocolate…). Para ellos los alérgenos listados son los habituales, no todos los posibles.
- **La restricción manda sobre la preferencia.** Si un alimento de «Me gustan» está restringido o contiene un alérgeno restringido, la API lo devuelve en `conflictingLikedIngredients` y la app lo avisa. No se borra: quitarlo es decisión del usuario.

## Criterio y límites del mapeo

El mapeo lo ha elaborado el equipo de desarrollo y **no procede de una fuente validada**. Debe revisarse antes de usarlo para excluir recetas.

- Los 14 alérgenos de la UE siguen la naturaleza de cada alimento. Los piñones y el coco no se consideran frutos de cáscara, como en la lista del reglamento.
- `LACTOSE` marca todos los lácteos, incluidos los que apenas tienen (quesos curados, mantequilla). Se prefiere excluir de más.
- `FRUCTOSE` marca todas las frutas y los azúcares añadidos; `HISTAMINE` y `SORBITOL`, los alimentos que suelen citarse como altos en ellos. Las tres son aproximaciones: la tolerancia real varía entre personas y no se han incluido, por ejemplo, las verduras con fructanos.
- Ningún ingrediente del catálogo contiene altramuces.
- **Que un ingrediente no tenga un alérgeno asociado no demuestra que sea seguro.** El mapeo no contempla trazas ni contaminación cruzada, y la app lo advierte en la pantalla.

## Consecuencias para las historias de recetas

- US-015 debe tratar como no apta una receta con un ingrediente restringido o con un alérgeno restringido.
- Una receta con un ingrediente `allergensUncertain`, o con ingredientes sin enlazar al catálogo, no puede presentarse como segura para un usuario con restricciones (criterio 3 de US-005).
- Corregir el mapeo exige otra migración.
- La app rechaza una respuesta con un alérgeno que no conoce en lugar de ignorarlo: guardar desde una pantalla que no puede mostrar una restricción la borraría.
