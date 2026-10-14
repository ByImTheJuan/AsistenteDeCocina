# CLAUDE.md — Asistente personal de cocina

Este archivo define el contexto del producto, el stack tecnológico, las reglas de ingeniería y el flujo de trabajo que Claude Code debe seguir al trabajar en este repositorio.

Estas instrucciones son obligatorias salvo que el usuario indique explícitamente lo contrario. Si una instrucción entra en conflicto con el estado real del repositorio, inspecciona primero el proyecto y explica el conflicto antes de modificar archivos.

---

## 1. Contexto y objetivo del producto

Estamos desarrollando una aplicación móvil multiplataforma para iOS y Android que actúa como asistente personal de cocina.

**iOS y Android son objetivos de igual prioridad.** La aplicación se desarrolla desde una única base de código y toda historia de usuario se implementa y valida para ambas plataformas, reutilizando todo el código posible. Una historia que solo funciona en una plataforma no está terminada.

La aplicación permitirá a los usuarios:

- Crear una cuenta e iniciar sesión mediante Google.
- Configurar gustos, preferencias dietéticas, alergias, intolerancias y objetivos nutricionales.
- Registrar los alimentos disponibles en casa manualmente, y en futuras iteraciones mediante códigos de barras o fotografías.
- Explorar recetas y recibir recomendaciones según sus ingredientes disponibles y su perfil.
- Consultar ingredientes, cantidades, instrucciones, tiempo de preparación, calorías, información nutricional y reseñas disponibles.
- Planificar comidas por día y tipo de comida.
- Generar y editar listas de compra a partir del plan semanal, teniendo en cuenta el inventario.
- En futuras iteraciones, comparar precios de productos entre supermercados.
- Guardar recetas favoritas y, en una fase posterior, consultarlas sin conexión.
- En futuras iteraciones, crear, publicar, valorar y reseñar recetas.

El Product Backlog funcional se encuentra en `ProductBacklog.md`. Este archivo es la fuente de verdad para las historias de usuario (US), sus prioridades y sus criterios de aceptación.

No inventes criterios de aceptación ni amplíes el alcance de una US sin justificarlo y obtener confirmación cuando la decisión afecte al producto.

## 2. Stack tecnológico acordado

Utiliza las siguientes tecnologías como stack objetivo. No sustituyas una tecnología por otra sin presentar primero una justificación y obtener aprobación del usuario.

### Arquitectura y separación de componentes

El sistema se compone de dos componentes separados e independientes: la aplicación móvil (`apps/mobile`) y el backend (`services/api`).

- La comunicación entre ambos se realiza **exclusivamente a través de la API REST** documentada con OpenAPI. La aplicación no accede a la base de datos ni a ningún servicio interno del backend por otra vía.
- El backend se desplegará en el servidor personal del propietario del proyecto. Debe poder compilarse, desplegarse y ejecutarse sin depender de la aplicación móvil ni de Expo/EAS.
- La aplicación no importa código de ejecución del backend ni al revés. Si en el futuro se comparten tipos o contratos, se hará mediante un paquete explícito y justificado, no con importaciones cruzadas.
- La URL de la API es configuración por entorno en la aplicación (`EXPO_PUBLIC_API_URL`), nunca un valor fijo en el código.
- Los detalles de despliegue del backend se documentarán a medida que las historias los necesiten. No añadir infraestructura de despliegue por adelantado.

### Aplicación móvil

- **React Native** para desarrollar las aplicaciones iOS y Android desde una base de código compartida.
- **Expo** como framework y conjunto de herramientas para desarrollo, compilación y distribución.
- **TypeScript** con configuración estricta cuando sea compatible con el proyecto.
- **Expo Router** para navegación.
- **TanStack Query** para peticiones, caché y sincronización del estado procedente del servidor.
- **React Hook Form + Zod** para formularios y validación.
- **Zustand** solo si existe una necesidad real de estado global de cliente que no encaje mejor en el estado local o TanStack Query.
- **Expo SQLite** para persistencia local estructurada cuando se implemente funcionalidad offline.
- **Jest + React Native Testing Library** para pruebas unitarias y de componentes.
- **Maestro** para automatizar flujos móviles de extremo a extremo cuando el proyecto esté preparado para ello.

### Backend y API

- **NestJS** con **TypeScript**.
- **API REST** documentada mediante **OpenAPI**.
- Arquitectura inicial de **monolito modular**. No introducir microservicios sin una necesidad demostrada y aprobación explícita.
- Validación de entradas en los límites de la API.
- Autenticación y autorización verificadas en el backend.
- Pruebas unitarias y de integración para la lógica de negocio y los endpoints relevantes.

### Base de datos y persistencia

- **MySQL** como base de datos relacional principal. Esta es una decisión explícita del proyecto; no utilizar PostgreSQL.
- **Prisma ORM** para el acceso tipado a datos y la gestión de migraciones.
- Todas las migraciones deben estar versionadas, revisadas y ser reproducibles.
- No realizar cambios manuales no documentados en los esquemas de entornos compartidos o de producción.
- Mantener los datos de desarrollo, pruebas, staging y producción separados.

### Infraestructura y calidad

- **GitHub** como repositorio y sistema de Pull Requests.
- **GitHub Actions** para integración continua (CI).
- **Expo Application Services (EAS)** para compilar y distribuir builds de desarrollo y de prueba de iOS/Android cuando corresponda.
- **Sentry** como opción de monitorización de errores cuando se incorpore.
- Almacenamiento de imágenes en un servicio compatible con **S3** cuando la funcionalidad lo requiera.
- No añadir Redis, colas, microservicios u otros componentes de infraestructura de forma preventiva. Justifica su necesidad antes de incorporarlos.

### Dependencias y versiones

- Antes de instalar o actualizar una dependencia, inspecciona las versiones existentes y verifica su compatibilidad con la versión de Expo, React Native, Node.js y demás paquetes del proyecto.
- Prefiere versiones estables y compatibles entre sí.
- Respeta el gestor de paquetes y el lockfile existentes. No cambies de gestor sin aprobación.
- No ejecutes actualizaciones masivas de dependencias como parte de una US salvo que sea necesario y esté incluido en el plan aprobado.
- No inventes versiones. Si no se conocen, inspecciona el repositorio y la documentación pertinente.

---

## 3. Flujo obligatorio para implementar una historia de usuario

Cuando el usuario solicite implementar una US, sigue las fases que se describen a continuación. No empieces a editar código antes de completar la fase de análisis y obtener aprobación del plan, salvo que el usuario te haya autorizado explícitamente a proceder sin esa pausa.

### Fase 1 — Inspeccionar el repositorio y leer la historia

1. Inspecciona la estructura actual del repositorio, el estado de Git, las ramas y los archivos de instrucciones relevantes.
2. Lee `ProductBacklog.md`.
3. Localiza la historia solicitada por su identificador, por ejemplo, `US-006`.
4. Lee la descripción completa, la prioridad, los criterios de aceptación y las notas relacionadas.
5. Comprueba si la historia existe y si el backlog está actualizado. No te bases exclusivamente en una descripción parcial del usuario cuando el archivo contiene la especificación oficial.
6. Si `ProductBacklog.md` no existe, no contiene la US solicitada o hay contradicciones importantes, detente y pregunta al usuario. No inventes una especificación sustitutiva.

### Fase 2 — Analizar dependencias, requisitos y dudas

Antes de proponer cambios, identifica:

- Dependencias funcionales con otras historias.
- Requisitos técnicos y módulos afectados.
- Cambios de esquema de MySQL o migraciones Prisma necesarios.
- Cambios de API y compatibilidad entre cliente y backend.
- Estados de carga, éxito, error, vacío y falta de conectividad relevantes.
- Requisitos de seguridad, autorización, privacidad y validación.
- Impacto en iOS y Android, incluidos permisos o dependencias nativas si corresponde.
- Pruebas necesarias y riesgos de regresión.
- Cambios en configuración, variables de entorno o infraestructura.

Inspecciona el código existente para verificar qué partes ya están implementadas. No des por hecho que una dependencia está ausente o que una funcionalidad está terminada sin comprobarlo.

**Pregunta antes de implementar** si falta información que pueda cambiar significativamente el comportamiento, el modelo de datos, la seguridad, la experiencia de usuario o el alcance. Agrupa las preguntas en un único mensaje conciso siempre que sea posible.

No preguntes por detalles que puedan resolverse con seguridad a partir del backlog, del código o de convenciones ya establecidas. Para decisiones de bajo impacto, utiliza la solución más sencilla y coherente, y documenta la suposición en el plan.

### Fase 3 — Presentar un plan de implementación

Antes de editar archivos, presenta un plan que incluya:

1. Resumen de la US y del valor que aporta.
2. Criterios de aceptación que se van a cubrir.
3. Dependencias existentes y pendientes.
4. Archivos o módulos que probablemente cambiarán.
5. Cambios previstos en base de datos, API y aplicación móvil.
6. Estrategia de pruebas.
7. Riesgos, supuestos y decisiones pendientes.
8. Criterios concretos para considerar terminada la implementación.

Espera la aprobación del usuario antes de iniciar el desarrollo. Si el usuario ya ha autorizado expresamente la ejecución inmediata y no hay dudas relevantes, puedes continuar sin pedir una aprobación redundante.

### Fase 4 — Crear la rama de trabajo

Tras la aprobación del plan:

1. Comprueba el estado del árbol de trabajo y no sobrescribas cambios ajenos a la US.
2. Actualiza la información de la rama base de forma segura.
3. Crea una rama con este patrón obligatorio:

   `feature/us-xxx-xxxxx`

   Sustituye `xxx` por el identificador de la historia y el sufijo por un slug breve en minúsculas que describa la funcionalidad. Ejemplo:

   `feature/us-006-manual-inventory`

4. La rama de destino de los Pull Requests será `main`.
5. No trabajes directamente en `main`, no elimines cambios del usuario y no hagas `git reset --hard`, `git clean` u otras operaciones destructivas sin autorización explícita.

Si la rama ya existe, comprueba su estado y reutilízala solo si corresponde inequívocamente a la misma US y no contiene trabajo ajeno. Si hay dudas, pregunta.

### Fase 5 — Implementar la historia

- Implementa todos los criterios de aceptación de la US aprobada.
- Sigue las convenciones, la arquitectura y los patrones ya establecidos en el repositorio.
- Mantén los cambios enfocados en la historia. Evita refactorizaciones ajenas, abstracciones prematuras y dependencias innecesarias.
- Mantén separadas las responsabilidades de presentación, lógica de negocio y persistencia.
- Valida los datos tanto en el cliente cuando corresponda como en el backend. La validación del cliente no sustituye a la del servidor.
- Comprueba autorización en el backend para cada recurso privado.
- No confíes en identificadores o permisos enviados por el cliente sin verificarlos.
- No guardes secretos, tokens privados ni credenciales en el repositorio.
- Utiliza variables de entorno para la configuración y actualiza los archivos de ejemplo, como `.env.example`, sin incluir secretos reales.
- Si se necesita una migración Prisma, créala mediante el flujo de migraciones del proyecto, revisa el SQL resultante y documenta cómo aplicarla.
- Evita cambios incompatibles con datos existentes sin una estrategia de migración explícita.
- Para funciones de IA, reconocimiento de imágenes o datos externos, trata los resultados como información no verificada y permite los mecanismos de revisión previstos en el producto.
- No marques como completa una funcionalidad que solo tenga una interfaz visual si el criterio de aceptación requiere persistencia, reglas de negocio o integración real.

### Fase 6 — Commits

Realiza commits pequeños, lógicos y revisables. No acumules todos los cambios en un único commit gigante.

Sigue **Conventional Commits** con este formato:

`<type>(<scope>): <imperative description>`

Tipos recomendados:

- `feat`: nueva funcionalidad.
- `fix`: corrección de un error.
- `test`: incorporación o modificación de pruebas.
- `refactor`: refactorización sin cambio funcional intencionado.
- `docs`: documentación.
- `chore`: mantenimiento o tareas de herramientas.
- `build`: cambios en compilación o dependencias.
- `ci`: configuración de integración continua.

Ejemplos:

- `feat(inventory): add manual food registration`
- `test(inventory): cover quantity validation`
- `fix(recipes): exclude incompatible allergens`
- `docs(api): document inventory endpoints`

Reglas:

- Utiliza el idioma y estilo predominantes en el repositorio; si no existe una convención previa, utiliza mensajes concisos en inglés.
- Usa scopes coherentes con los módulos del proyecto.
- No incluyas varios cambios no relacionados en un mismo commit.
- No alteres la autoría de commits previos.
- No hagas push ni crees commits que incluyan archivos o cambios ajenos a la US.
- No uses `--no-verify` para saltarte comprobaciones sin autorización explícita.

### Fase 7 — Pruebas y validación

Debes generar pruebas suficientes para cubrir todos los criterios de aceptación y los casos de error relevantes. No te limites a probar el camino feliz.

Según la historia, considera:

**Backend**
- Pruebas unitarias de reglas de negocio.
- Pruebas de validación de entradas y errores.
- Pruebas de autorización y aislamiento de datos entre usuarios.
- Pruebas de integración de endpoints y persistencia con MySQL de prueba.
- Pruebas de migraciones si se modifica el esquema.

**Aplicación móvil**
- Pruebas unitarias y de componentes con Jest y React Native Testing Library.
- Estados de carga, error, vacío y éxito.
- Validación de formularios y tratamiento de respuestas de la API.
- Pruebas de navegación y permisos cuando sean relevantes.
- Pruebas de extremo a extremo con Maestro cuando el entorno esté configurado.

**Calidad general**
- TypeScript y comprobaciones de tipos.
- Linter y formato según la configuración del proyecto.
- Suite de pruebas existente.
- Build de los componentes afectados cuando sea viable.
- Comprobación de que los cambios no rompen funcionalidades existentes.

Ejecuta las pruebas pertinentes y espera a que terminen. No afirmes que han pasado si no las has ejecutado o no puedes verificar su resultado.

Si alguna prueba no puede ejecutarse por falta de credenciales, servicios, dispositivo, permisos o infraestructura, indica exactamente cuál, por qué no se pudo ejecutar y qué validación alternativa se realizó. No ocultes fallos ni los presentes como éxitos.

No des por terminada una US mientras haya fallos relevantes atribuibles a los cambios. Si aparece un fallo preexistente, aporta evidencia, delimita su alcance y pregunta cómo proceder si afecta a la aceptación.

### Fase 8 — Pull Request a `main`

Cuando la implementación y las comprobaciones estén listas:

1. Comprueba `git status` y revisa el diff completo.
2. Confirma que no se incluyen secretos, archivos temporales, datos personales ni cambios ajenos a la US.
3. Haz push de la rama de la historia.
4. Crea un Pull Request cuyo destino sea `main`.
5. Si no tienes acceso a GitHub, no inventes que el PR se ha creado. Deja la rama preparada y proporciona el comando o los pasos necesarios, indicando claramente el impedimento.

El Pull Request debe incluir:

- **Título:** `US-xxx: descripción breve`.
- **Historia:** identificador y resumen de la US.
- **Contexto:** problema y valor para el usuario.
- **Criterios de aceptación:** lista de criterios cubiertos y su estado.
- **Implementación:** cambios funcionales y técnicos relevantes.
- **Migraciones y configuración:** cambios en MySQL/Prisma, variables de entorno, configuración o despliegue.
- **Pruebas:** comandos ejecutados y resultados reales.
- **Validación móvil:** dispositivo, sistema operativo y recorrido probado, si se ha podido verificar; de lo contrario, indicarlo como pendiente.
- **Capturas o vídeo:** incluirlos cuando aporten valor y estén disponibles.
- **Riesgos y limitaciones:** dependencias externas, decisiones pendientes o aspectos no validados.
- **Relación con el backlog:** referencia a la US o al issue correspondiente.

No afirmes que una prueba manual en un iPhone se ha realizado si no se ha probado realmente en un dispositivo. Distingue entre pruebas automatizadas, simulador y dispositivo físico.

### Fase 9 — Resumen final al usuario

Al terminar, informa de:

- Rama creada.
- Resumen de lo implementado.
- Criterios de aceptación cubiertos.
- Commits realizados.
- Pruebas ejecutadas y resultado.
- Validación en iOS/Android, diferenciando lo ejecutado de lo pendiente.
- Enlace al Pull Request, si se creó.
- Limitaciones o tareas pendientes.

No declares la historia completada si quedan criterios de aceptación sin cubrir o comprobaciones obligatorias fallidas.

---

## 4. Definition of Done

Una US solo se considera terminada cuando se cumplen todas las condiciones aplicables:

- [ ] La implementación satisface todos los criterios de aceptación acordados.
- [ ] La funcionalidad móvil está implementada para iOS y Android, y se ha indicado qué se validó en cada plataforma (dispositivo físico, simulador/emulador o solo pruebas automatizadas).
- [ ] Las dependencias funcionales y técnicas están resueltas o documentadas.
- [ ] Se han añadido pruebas para los caminos principales y los errores relevantes.
- [ ] Todas las pruebas obligatorias ejecutables pasan.
- [ ] TypeScript, lint y build relevantes no presentan errores.
- [ ] La autorización y la validación del backend son correctas.
- [ ] Las migraciones de base de datos están versionadas y verificadas, si aplican.
- [ ] No se han introducido secretos ni cambios ajenos a la US.
- [ ] Los commits siguen Conventional Commits.
- [ ] La documentación y configuración de ejemplo están actualizadas cuando corresponde.
- [ ] Se ha creado un Pull Request hacia `main`, o se ha documentado con precisión por qué no ha sido posible.
- [ ] Se ha informado al usuario de las validaciones realizadas y de las que quedan pendientes.

---

## 5. Convenciones generales de ingeniería

### Código y diseño

- Prioriza código sencillo, explícito y mantenible.
- Usa nombres descriptivos y tipos precisos.
- Evita duplicación cuando exista una abstracción clara, pero no abstraigas por anticipado.
- Mantén las funciones y módulos enfocados en una responsabilidad.
- Gestiona los errores de forma explícita; no silencies excepciones.
- No utilices `any` de forma rutinaria para evitar errores de tipos.
- Evita lógica de negocio duplicada entre cliente y backend.
- No hagas peticiones de red directamente desde componentes visuales si el proyecto utiliza una capa de servicios o TanStack Query.
- Respeta accesibilidad, navegación y comportamiento coherente en iOS y Android.
- Comparte el código entre iOS y Android por defecto. Usa código específico de plataforma (`Platform.select`, archivos `.ios.tsx`/`.android.tsx`) solo cuando exista una diferencia real entre plataformas; mantenlo aislado y justifícalo en el plan.
- No añadas dependencias que solo funcionen en una de las dos plataformas sin aprobación del usuario.
- La aplicación móvil solo obtiene y modifica datos del backend a través de la API REST.

### API y datos

- Mantén los contratos de la API documentados con OpenAPI.
- Valida entradas y devuelve errores consistentes.
- No expongas datos personales innecesarios.
- Define índices, restricciones y relaciones de MySQL de acuerdo con las consultas y reglas del dominio.
- Utiliza transacciones cuando varias modificaciones deban ser atómicas.
- Evita consultas ineficientes y cargas excesivas de relaciones.
- Las fechas, unidades y cantidades deben manejarse de manera coherente y explícita.
- Las cotizaciones de precios futuras deben distinguir valores actuales, estimados y desconocidos.

### Seguridad y privacidad

- No almacenes contraseñas de Google ni implementes un flujo OAuth propio si puede utilizarse una integración mantenida y adecuada.
- Verifica los tokens y la identidad en el backend.
- Comprueba que un usuario solo puede modificar los recursos que le pertenecen o para los que tiene permisos.
- No incluyas secretos en el código, logs, commits, capturas o mensajes de error.
- Solicita permisos móviles solo cuando sean necesarios.
- Trata alergias e intolerancias como restricciones de seguridad del producto, no como simples preferencias.
- Minimiza los datos personales almacenados y evita registrar información sensible en logs.

### Git y colaboración

- No trabajes directamente en `main`.
- No sobrescribas cambios del usuario.
- No fuerces pushes ni reescribas historia compartida sin autorización.
- Mantén los commits pequeños y enfocados.
- No declares creado un PR, una rama remota o una compilación si la acción no se ha ejecutado y confirmado.
- Si una herramienta o credencial no está disponible, explica la limitación y deja el trabajo en un estado seguro.

---

## 6. Estructura y estado actual del proyecto

> **Estado a 13-10-2026.** Esta sección describe lo que existe realmente. Actualízala al cerrar cada historia o cambio de infraestructura, y comprueba el repositorio antes de fiarte de ella: si el código y esta sección discrepan, manda el código.

### Estructura

```text
.
├── CLAUDE.md
├── ProductBacklog.md
├── README.md
├── package.json              # raíz: npm workspaces, overrides y scripts agregados
├── package-lock.json         # único lockfile
├── docker-compose.yml        # MySQL 8.4 local (cocina_dev y cocina_test)
├── apps/
│   └── mobile/               # workspace `mobile`: Expo + Expo Router
├── services/
│   └── api/                  # workspace `api`: NestJS + Prisma
├── docs/
│   ├── decisions/            # ADR
│   ├── data-retention-policy.md
│   └── google-sign-in-setup.md
└── .github/
    └── workflows/            # ci.yml y build.yml
```

No existe `packages/shared`. No lo crees hasta que haya un contrato compartido real entre la app y la API, y con aprobación.

### Qué está construido

- **Gestor de paquetes:** npm workspaces, Node.js 24 (`.nvmrc`). Los comandos se lanzan desde la raíz con `-w mobile` o `-w api`.
- **App móvil:** Expo SDK 57 (React Native 0.86, React 19.2, TypeScript 6), Expo Router, TanStack Query, React Hook Form, Zod, `expo-dev-client`, Jest y React Native Testing Library. El código propio vive en `src/features/<funcionalidad>` y `src/lib`; las rutas privadas están en `src/app/(app)`, con tres pestañas: «Home» (todavía la pantalla de ejemplo de la plantilla de Expo), «Perfil» y «Cuenta».
- **API:** NestJS 12 (proyecto ESM), OpenAPI en `/docs`, `ValidationPipe` global, `GET /health`, módulo `auth` y Prisma 7.10 con proveedor MySQL a través de `@prisma/adapter-mariadb` (`PrismaService` global). Modelos `User` y `RefreshToken` con su migración. Las variables de entorno se validan al arrancar (`src/config/env.validation.ts`).
- **US-001 (registro e inicio de sesión, con email y contraseña o con Google) está terminada**; el propietario validó en Expo Go el acceso con email y contraseña. El de Google sigue sin validar: necesita las credenciales de Google Cloud y una development build.
- **US-002 (gestión de la cuenta) está implementada y cubierta con pruebas automatizadas, pendiente de validar en dispositivo.**
- **US-003 (preferencias alimentarias) está implementada, cubierta con pruebas automatizadas y validada por el propietario en Expo Go, con un criterio diferido:** «Las recomendaciones tienen en cuenta las preferencias guardadas» se cubrirá en US-015, cuando existan recetas.
- **US-005 (alergias e intolerancias) está implementada, cubierta con pruebas automatizadas y validada por el propietario en Expo Go, con dos criterios diferidos:** excluir o marcar las recetas con un alérgeno, y no presentar como segura una receta sin información suficiente. Ambos dependen de las recetas (US-012, US-013 y US-015).
- **US-004 (objetivos nutricionales) está implementada y cubierta con pruebas automatizadas, pendiente de validar en dispositivo y con un criterio diferido:** que las recomendaciones y los detalles nutricionales reflejen los objetivos, que depende de las recetas (US-013 y US-015). Las siguientes según el backlog son US-042 y US-044.
- **Perfil alimentario:** pestaña «Perfil» de la app (menú en `src/features/profile`, rutas en `src/app/(app)/profile`), separada de «Cuenta». Tiene tres secciones: «Preferencias alimentarias» (`src/features/food-preferences`), «Alergias e intolerancias» (`src/features/dietary-restrictions`) y «Objetivos nutricionales» (`src/features/nutrition-goals`). El buscador de alimentos que comparten está en `src/features/ingredients`. En la API, módulo `food-preferences` (`GET` y `PUT /food-preferences`; el `PUT` reemplaza la dieta y las dos listas a la vez) y módulo `ingredients` (`GET /ingredients?search=`, máximo 50 resultados). Quien no ha configurado nada recibe valores vacíos, no un error. La dieta es única (`Diet`: vegetariana, vegana, pescetariana, flexitariana o ninguna). Estas preferencias son gustos, no restricciones.
- **Restricciones de seguridad:** módulo `dietary-restrictions` de la API (`GET` y `PUT /dietary-restrictions`; el `PUT` reemplaza los alérgenos y los ingredientes a la vez). El usuario marca alérgenos de una lista fija (`Allergen`: los 14 de la UE más lactosa, fructosa, histamina y sorbitol) e ingredientes concretos del catálogo, en una sola lista sin distinguir alergia de intolerancia. Se guardan en `allergen_restrictions` e `ingredient_restrictions`, aparte de las preferencias. **La restricción manda sobre el gusto:** los alimentos de «Me gustan» que chocan se devuelven en `conflictingLikedIngredients` y la app lo avisa, sin borrarlos. Cualquier funcionalidad que use recetas debe tratar estas restricciones como obligatorias.
- **Objetivos nutricionales:** módulo `nutrition-goals` de la API (`GET` y `PUT /nutrition-goals`; el `PUT` reemplaza los tres a la vez y `null` elimina uno). Hay tres objetivos opcionales: calorías al día, calorías por comida y proteínas al día (`NutritionGoalKind`), guardados en `nutrition_goals`, una fila por objetivo. Cada uno tiene `value` y `enabled`: **un objetivo con `enabled` a `false` conserva su valor pero no debe aplicarse.** Los rangos admitidos (500–10 000 kcal al día, 50–5 000 kcal por comida, 1–500 g de proteínas) solo evitan erratas y están repetidos en la app (`nutrition-goals-form.ts`); si cambian, hay que cambiarlos en los dos sitios. Con ambos objetivos calóricos activos, el de por comida no puede superar el diario. Añadir otro nutriente es un valor nuevo del enum.
- **Formularios con «Guardar»:** las pantallas de preferencias, de alergias y de objetivos guardan un borrador y avisan antes de salir si hay cambios sin guardar, con `useUnsavedChangesWarning(isDirty)` (`src/hooks/use-unsaved-changes-warning.ts`). Usar el mismo hook en los formularios nuevos de este tipo. Cambiar de pestaña no avisa porque conserva la pantalla y su borrador.
- **Catálogo de ingredientes:** tabla `ingredients` (nombre en español y categoría), sembrada por una migración de datos con ids fijos (`ing_tomate`). Sin unidades ni equivalencias, que corresponden a US-044. Para ampliarlo, otra migración. Detalles en `docs/decisions/0002-catalogo-de-ingredientes.md`.
- **Alérgenos de los ingredientes:** tabla `ingredient_allergens`, sembrada por migración, y columna `ingredients.allergensUncertain` para los elaborados de composición variable. Toda respuesta con ingredientes incluye `allergens` y `allergensUncertain` (usar `withAllergens` de `src/ingredients/ingredient-with-allergens.ts`). **El mapeo no procede de una fuente validada** y un ingrediente sin alérgenos asociados no es por ello seguro. Criterio y límites en `docs/decisions/0003-alergenos-y-restricciones.md`.
- **Cuenta:** módulo `account` de la API (`GET /account`, `PUT`/`DELETE /account/password`, `PUT`/`DELETE /account/google`, `POST /account/delete`) y pestaña «Cuenta» en la app (`src/features/account`, rutas en `src/app/(app)/account`). Las acciones sensibles piden la contraseña actual si la cuenta tiene una y responden 403 (no 401) cuando es incorrecta; no se puede quitar el último método de acceso; solo se vincula el Google con el mismo email. Los errores de negocio llevan un `code` que la app traduce a mensajes (`ApiError.code`).
- **Eliminación de datos:** `docs/data-retention-policy.md`. Toda tabla nueva con datos de un usuario debe borrarse en cascada con `users` (`onDelete: Cascade`), salvo el contenido público, que se anonimiza (`onDelete: SetNull`), e incluir una prueba de qué ocurre al eliminar la cuenta.
- **Datos del servidor en la app:** TanStack Query, con las llamadas autenticadas a través de `useSession().request`; la caché se vacía al cerrar sesión. Los componentes de formulario compartidos están en `src/components` (`PrimaryButton`, `TextField`, `FormScreen`).
- **Autenticación:** tres formas de obtener sesión: `POST /auth/register` y `POST /auth/login` (email y contraseña, con hash scrypt) y `POST /auth/google` (ID token obtenido con `@react-native-google-signin/google-signin`). En los tres casos la API emite un JWT de acceso (15 min) y un refresh token rotatorio guardado con hash. Hay una cuenta por email (guardado en minúsculas); contraseña y Google son métodos de acceso independientes de la misma cuenta: entrar con Google a una cuenta con contraseña la vincula y conserva la contraseña. Registrarse con un email que ya tiene cuenta se rechaza siempre. Esos tres endpoints tienen límite de peticiones por IP (`@nestjs/throttler`, en memoria). Para proteger un endpoint: `@UseGuards(JwtAuthGuard)` y `@CurrentUser()` (el módulo debe importar `AuthModule`). En la app, las llamadas autenticadas pasan por `sessionManager.authorizedRequest` y el estado de sesión se lee con `useSession()`.

### Comandos

```bash
npm ci                              # dependencias de todos los workspaces
npm run db:up                       # MySQL local con Docker
npm run typecheck                   # TypeScript en mobile y api
npm run lint                        # expo lint (mobile) y oxlint (api)
npm test                            # Jest (mobile) y Vitest (api)
npm run test:unit -w mobile         # archivos *.test.ts
npm run test:components -w mobile   # archivos *.test.tsx
npm run test:e2e -w api             # necesita MySQL (db:up); usa cocina_test
npm run build -w api
npm run start:dev -w api            # API en http://localhost:3000
npm run start:go -w mobile          # app en Expo Go
npm run start -w mobile             # app en la development build
```

Las dependencias de la app móvil se añaden con `npx expo install <paquete>` desde `apps/mobile`.

### Integración continua y builds

- **`.github/workflows/ci.yml`:** se ejecuta en cada Pull Request hacia `main` y en cada push a `main`. Jobs `mobile`, `api`, `dependencies` y `security`. **No genera builds de la app.**
- **`.github/workflows/build.yml`:** manual y solo desde `main`. Genera con EAS la build `preview` de iOS, Android o ambas (`gh workflow run build.yml --ref main -f platform=ios|android|all`).
- **No lances builds de EAS por iniciativa propia.** El plan gratuito permite 15 builds de iOS y 15 de Android al mes, sin excedente; el usuario decide cuándo gastar una.
- Para ver los cambios de una rama en el teléfono no hace falta build: se arranca el servidor de desarrollo y se abre en Expo Go o en la development build.

### EAS y distribución

- Proyecto de EAS vinculado: organización `hyd-co`, `projectId` en `apps/mobile/app.json`.
- Identificador de la app en ambas plataformas: `com.hyd.asistentedecocina`. No lo cambies: a él quedan atadas las credenciales de firma y, más adelante, el inicio de sesión con Google.
- Perfiles en `apps/mobile/eas.json`: `development` (cliente de desarrollo), `preview` (app autónoma de distribución interna; APK en Android) y `production` (reservado).
- Secreto `EXPO_TOKEN` configurado en el repositorio de GitHub.

### Decisiones ya tomadas

Detalladas en `docs/decisions/0001-estructura-y-gestor-de-paquetes.md` (el catálogo de ingredientes, en `0002-catalogo-de-ingredientes.md`; los alérgenos y las restricciones, en `0003-alergenos-y-restricciones.md`):

- La API usa **Vitest y oxlint**, los valores por defecto del generador de NestJS 12. Jest y React Native Testing Library se usan en la app móvil.
- **Prisma fijado en 7.10.0**: el dist-tag `latest` de npm apuntaba a una versión candidata 8.0.0-rc.
- `overrides` en el `package.json` raíz: `react` y `react-dom` (una sola copia, la que exige el SDK de Expo) y `mysql2`, `deepmerge-ts` y `mariadb` (versiones corregidas que la CLI de Prisma y su adaptador de MySQL fijan por debajo). Al actualizar el SDK de Expo hay que revisar los de React y la versión de `test-renderer`.
- **Auditoría de seguridad por niveles:** el CI bloquea con severidad `high` en las dependencias de producción de la API y con `critical` en todo el árbol, porque las herramientas de compilación de Expo/Metro arrastran avisos `high` sin corrección publicada.

### Pendiente

- **Validar US-002 en dispositivo.** En Expo Go se puede probar todo salvo vincular y desvincular Google.
- **Validar US-004 en dispositivo.** Se puede probar entera en Expo Go.
- **US-013 y US-015 deben cubrir el criterio 4 de US-004:** comparar las recetas y las recomendaciones con los objetivos activos cuando haya datos nutricionales suficientes.
- **Validar en Expo Go el aviso al salir sin guardar** de las pantallas de preferencias y de alergias (botón atrás de Android, flecha de la cabecera y gesto de iOS). Se añadió después de la validación de US-003 y US-005 y solo tiene pruebas automatizadas.
- **Revisar el mapeo de alérgenos** (`seed_ingredient_allergens`) con una fuente fiable antes de usarlo para excluir recetas; fructosa, histamina y sorbitol son aproximaciones.
- **US-015 debe cubrir los criterios 2 y 3 de US-005:** excluir o marcar las recetas con un ingrediente o alérgeno restringido, y no presentar como segura una receta con ingredientes `allergensUncertain` o sin enlazar al catálogo.
- **US-015 debe cubrir el criterio 4 de US-003:** que las recomendaciones usen la dieta y los alimentos guardados.
- Editar el nombre o el email de la cuenta: no está en ninguna historia.
- **Inicio de sesión con Google:** crear el proyecto y los client ID en Google Cloud y configurar las variables, según `docs/google-sign-in-setup.md`. No funciona en Expo Go; hace falta una development build.
- **Verificación de email y recuperación de contraseña:** sin implementar; necesitan un servicio de envío de correo. Quien olvide su contraseña no puede recuperarla.
- **Riesgo aceptado hasta que se verifique el email:** quien se registre con el email de otra persona conserva el acceso por contraseña cuando esa persona entre con Google, porque la vinculación es automática.
- El límite de peticiones de autenticación es por IP y en memoria: detrás de un proxy habrá que configurar la IP real al definir el despliegue.
- **iOS:** el propietario aún no tiene suscripción a Apple Developer Program. Sin ella no se pueden generar builds de iOS. Después habrá que registrar el iPhone (`eas device:create`) y crear las credenciales con una primera build interactiva.
- **Android:** no se ha generado ninguna build. Puede requerir una primera `eas build --platform android --profile preview` interactiva para crear la clave de firma.
- **`build.yml` no se ha ejecutado nunca.** El enlace de instalación que publica se construye a partir de la salida JSON de `eas build`, sin verificar.
- **Las validaciones hechas hasta ahora son todas en Expo Go** (acceso con email y contraseña, US-003 y US-005), sin registrar en qué plataforma. No se ha validado nada en una development build ni en una build `preview`, y falta confirmar cada historia en iOS y en Android.
- Protección de la rama `main` exigiendo los checks del CI: sin configurar.
- Despliegue del backend en el servidor del propietario: sin definir.

### Al modificar la configuración

1. Inspecciona los archivos existentes antes de crear otros nuevos.
2. Respeta el gestor de paquetes, el lockfile y las versiones fijadas.
3. Evita reemplazar archivos completos cuando baste una modificación localizada.
4. Mantén el `README.md` y esta sección al día con comandos verificados.


---

## 7. Regla final

Ante cada solicitud de implementación de una US, el orden por defecto es:

**Leer `ProductBacklog.md` → inspeccionar el repositorio → analizar dependencias y dudas → presentar el plan → obtener aprobación → crear rama `feature/us-xxx-xxxxx` → implementar → probar → revisar commits y diff → crear Pull Request a `main` → informar de resultados.**

No te saltes las fases de análisis, planificación, pruebas o revisión del diff para acelerar una tarea. La prioridad es entregar incrementos funcionales verificables, seguros y mantenibles.
