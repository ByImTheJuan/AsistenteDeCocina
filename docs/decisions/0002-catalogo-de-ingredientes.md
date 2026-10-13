# 0002 — Catálogo inicial de ingredientes

- **Estado:** aceptada
- **Fecha:** 2026-10-13

## Contexto

US-003 pide que el usuario seleccione los alimentos que le gustan y los que prefiere evitar. Para que esas preferencias sirvan después a las recomendaciones (US-015) deben referirse a ingredientes concretos y no a texto libre. El catálogo de ingredientes estaba previsto para US-044, que aún no se ha empezado.

## Decisión

- Se crea ya la tabla `ingredients` con lo mínimo: identificador, nombre en español (único) y categoría. **No** modela unidades, equivalencias ni alérgenos; eso sigue perteneciendo a US-044 y US-005.
- Las filas iniciales (175 alimentos comunes) viajan en una **migración de datos** (`seed_ingredient_catalog`), no en un script de seed. Son datos de referencia que deben existir en todos los entornos, y así llegan a desarrollo, pruebas, CI y producción con `prisma migrate deploy`, sin un paso adicional que pueda olvidarse ni dependencias nuevas para ejecutar TypeScript fuera de Nest.
- Los identificadores sembrados son fijos y legibles (`ing_tomate`), de modo que migraciones e historias posteriores pueden referirse a ellos. Las filas que se creen más adelante desde la aplicación usarán el `cuid()` por defecto.
- La búsqueda (`GET /ingredients?search=`) usa `LIKE` sobre el nombre. La intercalación de la columna (`utf8mb4_unicode_ci`) ignora mayúsculas y tildes, así que «platano» encuentra «Plátano» sin normalizar nada en el código. Devuelve como máximo 50 resultados.
- Las preferencias se guardan en `ingredient_preferences` con clave primaria (`userId`, `ingredientId`): un ingrediente no puede estar a la vez en las dos listas. La dieta es una columna opcional de `users`.

## Consecuencias

- Ampliar o corregir el catálogo exige otra migración hasta que US-044 defina cómo se gestiona.
- La intercalación también afecta a la unicidad del nombre: dos ingredientes que solo se diferencien en tildes o mayúsculas no pueden coexistir.
- `prisma migrate dev` reproduce todas las migraciones en una base «shadow», incluidas las que insertan o actualizan datos. El usuario local de MySQL necesita por ello permisos de lectura y escritura globales (`docker/mysql/init/01-test-database.sql`). El script solo se ejecuta al crear el volumen: en un contenedor ya existente hay que aplicar el `GRANT` a mano una vez o recrear el volumen.
- Si el catálogo crece mucho, `LIKE '%texto%'` no usa índice; habrá que revisar la búsqueda entonces.
