# Asistente personal de cocina

Aplicación móvil multiplataforma para iOS y Android que ayuda a gestionar los alimentos disponibles en casa, descubrir recetas personalizadas, planificar comidas y preparar listas de compra.

> **Estado del proyecto:** entorno de desarrollo preparado y primera historia (`US-001`, inicio de sesión con Google) implementada y cubierta con pruebas automatizadas, pendiente de validar en un dispositivo. Consulta el repositorio para comprobar qué funcionalidades están realmente implementadas.

## Índice

- [Visión del producto](#visión-del-producto)
- [MVP](#mvp)
- [Stack tecnológico](#stack-tecnológico)
- [Arquitectura objetivo](#arquitectura-objetivo)
- [Estructura objetivo del repositorio](#estructura-objetivo-del-repositorio)
- [Requisitos previos](#requisitos-previos)
- [Puesta en marcha](#puesta-en-marcha)
- [Configuración y secretos](#configuración-y-secretos)
- [Flujo de trabajo con Claude Code](#flujo-de-trabajo-con-claude-code)
- [Git y Pull Requests](#git-y-pull-requests)
- [Pruebas y calidad](#pruebas-y-calidad)
- [Probar en un dispositivo](#probar-en-un-dispositivo)
- [Entornos](#entornos)
- [Seguridad y privacidad](#seguridad-y-privacidad)
- [Roadmap inicial](#roadmap-inicial)
- [Documentación del proyecto](#documentación-del-proyecto)

## Visión del producto

El asistente personal de cocina pretende ayudar a los usuarios a decidir qué cocinar aprovechando los alimentos que ya tienen en casa, respetando sus preferencias alimentarias y organizando sus comidas de forma práctica y económica.

La visión funcional incluye:

- Crear una cuenta e iniciar sesión mediante Google.
- Configurar gustos, preferencias dietéticas, alergias, intolerancias y objetivos nutricionales.
- Registrar alimentos disponibles en casa.
- Descubrir recetas según el inventario y el perfil del usuario.
- Consultar ingredientes, cantidades, instrucciones, tiempo de preparación, calorías e información nutricional disponible.
- Planificar comidas por día y tipo de comida.
- Generar y editar listas de compra a partir del plan semanal y del inventario.
- Guardar recetas favoritas y, en una fase posterior, acceder a ellas sin conexión.
- En futuras iteraciones, escanear códigos de barras, reconocer alimentos mediante fotografías, comparar precios de supermercados y crear/publicar/valorar recetas.

La especificación funcional completa se encuentra en [`ProductBacklog.md`](ProductBacklog.md). Ese archivo es la fuente de verdad para las historias de usuario y sus criterios de aceptación.

## MVP

La primera versión debe validar un flujo completo y coherente:

1. Crear una cuenta.
2. Configurar preferencias y restricciones alimentarias.
3. Registrar alimentos manualmente.
4. Consultar recetas y recibir recomendaciones compatibles con el perfil y el inventario.
5. Planificar comidas para la semana.
6. Generar y editar una lista de compra a partir del plan.
7. Guardar y consultar recetas favoritas.
8. Gestionar adecuadamente permisos, errores y persistencia de datos.

### Historias de usuario seleccionadas

El MVP inicial comprende estas **20 historias**:

- `US-001` — Registrarse e iniciar sesión con Google.
- `US-002` — Gestionar la cuenta personal.
- `US-003` — Configurar mis preferencias alimentarias.
- `US-005` — Gestionar alergias e intolerancias.
- `US-006` — Registrar alimentos manualmente.
- `US-012` — Consultar el catálogo de recetas.
- `US-013` — Consultar el detalle de una receta.
- `US-014` — Recibir recetas basadas en mi inventario.
- `US-015` — Recibir recomendaciones personalizadas.
- `US-018` — Crear un plan semanal de comidas.
- `US-019` — Añadir recetas al plan desde las recomendaciones.
- `US-020` — Modificar y reorganizar el plan semanal.
- `US-023` — Generar la lista de compra semanal.
- `US-024` — Gestionar la lista de compra manualmente.
- `US-029` — Guardar una receta como favorita.
- `US-030` — Consultar mi colección de favoritos.
- `US-042` — Gestionar los permisos del dispositivo.
- `US-043` — Gestionar los errores de conexión y sincronización.
- `US-044` — Gestionar ingredientes y unidades de medida coherentes.
- `US-047` — Mantener la coherencia entre las recetas, el plan y la compra.

No debe considerarse terminada una historia hasta cumplir sus criterios de aceptación y las condiciones de calidad aplicables.

## Stack tecnológico

Las siguientes tecnologías constituyen el stack acordado. No se deben sustituir sin justificar la decisión y obtener aprobación.

### Aplicación móvil

- **React Native** — aplicación para iOS y Android.
- **Expo** — herramientas de desarrollo, compilación y distribución.
- **TypeScript** — lenguaje principal del cliente.
- **Expo Router** — navegación.
- **TanStack Query** — peticiones, caché y sincronización del estado del servidor.
- **React Hook Form + Zod** — formularios y validación.
- **Zustand** — solo si se necesita estado global de cliente que no encaje en el estado local o en TanStack Query.
- **Expo SQLite** — persistencia local cuando se implemente funcionalidad offline.
- **Jest + React Native Testing Library** — pruebas unitarias y de componentes.
- **Maestro** — automatización de flujos móviles cuando esté configurado.

### Backend

- **NestJS + TypeScript**.
- **API REST** documentada mediante **OpenAPI**.
- Arquitectura inicial de monolito modular.
- Validación de entradas y autorización en el backend.
- Pruebas unitarias y de integración.

### Base de datos y persistencia

- **MySQL** como base de datos relacional principal.
- **Prisma ORM** para acceso a datos y migraciones versionadas.
- Datos separados entre desarrollo, pruebas, staging y producción.

> **Importante:** la base de datos elegida para este proyecto es MySQL, no PostgreSQL.

### DevOps y servicios complementarios

- **GitHub** para repositorio, Issues y Pull Requests.
- **GitHub Actions** para integración continua.
- **Expo Application Services (EAS)** para builds de desarrollo y distribución de pruebas.
- **Sentry** como opción de monitorización de errores cuando se incorpore.
- Almacenamiento compatible con **S3** para imágenes cuando sea necesario.

No añadir Redis, microservicios, colas u otros componentes de infraestructura hasta que exista una necesidad demostrada.

## Arquitectura objetivo

La arquitectura inicial está organizada en dos aplicaciones principales:

1. **Cliente móvil:** interfaz y experiencia de usuario, validación de formularios, navegación, caché y almacenamiento local cuando corresponda.
2. **API:** autenticación, autorización, reglas de negocio, acceso a datos y comunicación con servicios externos.

La API se organiza inicialmente como un monolito modular, con responsabilidades funcionales claras:

- Identity
- User Profile
- Ingredients
- Inventory
- Recipes
- Recommendations
- Meal Planning
- Shopping
- Reviews

MySQL almacena los datos relacionales. Las imágenes se almacenarán en un servicio compatible con S3 cuando esa funcionalidad se implemente. Las claves privadas de servicios externos deben permanecer en el backend.

## Estructura objetivo del repositorio

La estructura final debe adaptarse al estado real del repositorio. La siguiente es una propuesta orientativa, no una afirmación de que todos estos directorios ya existan:

```text
.
├── CLAUDE.md
├── README.md
├── ProductBacklog.md
├── apps/
│   └── mobile/             # React Native + Expo
├── services/
│   └── api/                # NestJS
├── packages/
│   └── shared/             # Solo si los contratos compartidos lo justifican
├── docs/
│   ├── architecture/
│   └── decisions/
├── .github/
│   └── workflows/
├── .env.example
└── ...
```

No introduzcas un monorepo ni un paquete compartido por inercia. La organización debe ajustarse al tamaño y las necesidades reales del proyecto.

## Requisitos previos

- Git.
- **Node.js 24** (ver `.nvmrc`; se recomienda la última 24.x) y **npm**, que es el gestor de paquetes del repositorio (npm workspaces, un único `package-lock.json` en la raíz).
- **Docker** para ejecutar MySQL 8.4 en local (`docker-compose.yml`). No hace falta instalar MySQL de forma nativa.
- **GitHub CLI** (`gh`) para Pull Requests y secretos.
- **EAS CLI** (`npm install -g eas-cli`) y una cuenta de Expo para generar builds.
- Cuenta de **Apple Developer Program** para instalar builds en un iPhone. Android no requiere cuenta para instalar un APK.
- Expo Go en el teléfono (iOS o Android) para pruebas rápidas sin build.

Versiones fijadas: Expo SDK 57 (React Native 0.86, React 19.2), NestJS 12, Prisma 7.10 y TypeScript 6. Las decisiones de estructura están en [`docs/decisions/0001-estructura-y-gestor-de-paquetes.md`](docs/decisions/0001-estructura-y-gestor-de-paquetes.md).

No instales versiones al azar. Las dependencias de la app móvil se añaden con `npx expo install <paquete>` desde `apps/mobile`, que resuelve versiones compatibles con el SDK.

## Puesta en marcha

Todos los comandos se ejecutan desde la raíz del repositorio salvo que se indique lo contrario.

```bash
# 1. Dependencias de todos los workspaces
npm ci

# 2. Configuración local (no se versiona)
cp services/api/.env.example services/api/.env
cp apps/mobile/.env.example apps/mobile/.env

# 3. MySQL de desarrollo (bases cocina_dev y cocina_test)
npm run db:up

# 4. Cliente de Prisma y migraciones
npm run prisma:generate -w api
cd services/api && npx prisma migrate dev && cd ../..

# 5. API en http://localhost:3000 (OpenAPI en /docs, salud en /health)
npm run start:dev -w api

# 6. Aplicación Expo
npm run start -w mobile
```

La API no arranca sin `GOOGLE_CLIENT_ID` y `JWT_ACCESS_SECRET` en `services/api/.env`, y la app necesita `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`. Cómo obtener esos valores está en [`docs/google-sign-in-setup.md`](docs/google-sign-in-setup.md).

### Comprobaciones de calidad

```bash
npm run typecheck          # TypeScript en mobile y api
npm run lint               # expo lint (mobile) y oxlint (api)
npm test                   # Jest (mobile) y Vitest (api)
npm run test:unit -w mobile
npm run test:components -w mobile
npm run test:e2e -w api
npm run build -w api
```

En la app móvil, las pruebas unitarias viven en archivos `*.test.ts` y las de componentes en `*.test.tsx`.

Las pruebas de integración de la API (`test:e2e`) necesitan MySQL en marcha (`npm run db:up`). Usan la base `cocina_test`, aplican antes las migraciones pendientes y se niegan a ejecutarse contra una base cuyo nombre no termine en `_test`.

## Configuración y secretos

- Mantén un `.env.example` con los nombres de las variables necesarias y valores ficticios o descriptivos.
- No incluyas secretos reales en `.env.example`, en el código, en logs ni en commits.
- No versionar archivos `.env` con credenciales reales.
- Configura las variables de CI mediante los secretos y variables de GitHub Actions.
- Las credenciales privadas de proveedores externos deben estar en el backend, nunca embebidas en la aplicación móvil.
- Documenta para cada variable qué servicio la utiliza y en qué entorno se requiere.

## Flujo de trabajo con Claude Code

`CLAUDE.md` define las instrucciones obligatorias para Claude Code. Antes de iniciar una historia de usuario, Claude Code debe:

1. Inspeccionar el repositorio y leer `ProductBacklog.md`.
2. Localizar la historia solicitada y leer sus criterios de aceptación.
3. Analizar dependencias, requisitos técnicos, riesgos y pruebas necesarias.
4. Preguntar por información faltante que pueda cambiar significativamente el comportamiento o el diseño.
5. Presentar un plan de implementación y esperar aprobación, salvo que el usuario haya autorizado expresamente proceder sin esa pausa.
6. Crear una rama `feature/us-xxx-xxxxx`.
7. Implementar la historia y realizar commits lógicos siguiendo Conventional Commits.
8. Añadir y ejecutar pruebas suficientes para cubrir los criterios de aceptación.
9. Revisar los cambios y crear un Pull Request hacia `main`.
10. Informar con precisión de las pruebas ejecutadas, sus resultados y cualquier limitación.

Claude Code no debe declarar que ha ejecutado pruebas, probado un iPhone, hecho push o creado un Pull Request si no ha podido verificarlo.

## Git y Pull Requests

### Ramas

- `main`: rama estable.
- `feature/us-xxx-xxxxx`: implementación de una historia de usuario.
- Las ramas de corrección pueden seguir el patrón `fix/...` cuando no estén vinculadas a una US.

No trabajes directamente sobre `main`. Configura protección de rama para exigir que las comprobaciones de CI pasen antes de fusionar.

### Conventional Commits

Formato:

```text
<type>(<scope>): <imperative description>
```

Tipos habituales:

- `feat`: nueva funcionalidad.
- `fix`: corrección de errores.
- `test`: pruebas.
- `refactor`: refactorización.
- `docs`: documentación.
- `chore`: mantenimiento.
- `build`: compilación o dependencias.
- `ci`: integración continua.

Ejemplos:

```text
feat(inventory): add manual food registration
test(inventory): cover quantity validation
fix(recipes): exclude incompatible allergens
docs(api): document inventory endpoints
```

### Pull Requests

Cada PR debe dirigirse a `main` e incluir:

- Historia de usuario relacionada.
- Contexto y objetivo.
- Criterios de aceptación y estado de cada uno.
- Resumen de los cambios funcionales y técnicos.
- Migraciones y cambios de configuración.
- Pruebas ejecutadas y resultados reales.
- Notas de validación en dispositivo, si aplica.
- Riesgos, limitaciones y tareas pendientes.

No integres cambios que fallen en las comprobaciones obligatorias.

## Pruebas y calidad

La estrategia de pruebas debe crecer junto con el producto.

### Aplicación móvil

- TypeScript y lint.
- Pruebas unitarias y de componentes con Jest y React Native Testing Library.
- Estados de carga, éxito, error y vacío.
- Validación de formularios y comportamiento ante errores de API.
- Pruebas de extremo a extremo con Maestro cuando esté configurado.

### Backend

- Pruebas unitarias de reglas de negocio.
- Pruebas de validación de entradas y tratamiento de errores.
- Pruebas de autorización y aislamiento de datos entre usuarios.
- Pruebas de integración de endpoints y persistencia con MySQL de prueba.
- Pruebas de migraciones cuando se modifique el esquema.

### Integración continua

El pipeline está en [`.github/workflows/ci.yml`](.github/workflows/ci.yml) y se ejecuta en cada Pull Request hacia `main` y en cada push a `main`. No genera builds de la app:

| Job | Qué comprueba |
|---|---|
| `mobile` | TypeScript, lint, pruebas unitarias y pruebas de componentes. |
| `api` | Esquema de Prisma, TypeScript, lint, pruebas unitarias, pruebas de integración (con MySQL 8.4 como servicio) y build. |
| `dependencies` | Coherencia del lockfile (`npm ci`), `expo-doctor` y alineación de versiones con el SDK de Expo. |
| `security` | `npm audit`: bloquea con severidad `high` en las dependencias de producción de la API y con `critical` en todo el árbol; publica el informe completo en el resumen. En repositorios públicos ejecuta además la revisión de dependencias de GitHub en los PR, que exige tener activado *Dependency graph* en *Settings → Advanced Security*. |

Las builds instalables se generan aparte, de forma manual y solo desde `main`, con [`.github/workflows/build.yml`](.github/workflows/build.yml) (ver [Probar en un dispositivo](#probar-en-un-dispositivo)).

Las pruebas que dependan de servicios externos deben configurarse con entornos de prueba o quedar identificadas como pendientes, nunca darse por aprobadas sin ejecutarse.

### Definition of Done

Una historia solo está terminada cuando:

- Cumple todos los criterios de aceptación.
- Tiene pruebas suficientes para los caminos principales y errores relevantes.
- Las comprobaciones obligatorias pasan.
- Las migraciones están versionadas y verificadas cuando corresponda.
- No incluye secretos ni cambios ajenos a la historia.
- La documentación afectada está actualizada.
- Existe un Pull Request hacia `main`, o se ha explicado con precisión por qué no se pudo crear.

## Probar en un dispositivo

La aplicación se desarrolla para iOS y Android. Hay tres formas de probarla en un teléfono, de menor a mayor coste:

### 1. Expo Go (sin build)

Para iterar la interfaz mientras la app solo use módulos incluidos en Expo Go:

1. Instala Expo Go desde la App Store o Google Play.
2. Arranca el servidor con `npm run start:go -w mobile`.
3. Escanea el código QR con la cámara (iOS) o desde Expo Go (Android).

Los cambios de código se recargan al instante y no se consume cupo de EAS. Limitaciones: Expo Go solo incluye sus propios módulos nativos y solo abre proyectos del SDK que soporta la versión instalada.

**El inicio de sesión con Google no funciona en Expo Go**, porque usa un módulo nativo que no incluye. Como la app exige iniciar sesión, para pasar de la primera pantalla hace falta una development build.

El teléfono y el ordenador deben estar en la misma red (o usar `npx expo start --tunnel`). `localhost` desde el teléfono es el propio teléfono: configura `EXPO_PUBLIC_API_URL` con la IP del ordenador.

### 2. Development build

Cuando una funcionalidad necesite módulos nativos que Expo Go no incluye. Es una versión propia de Expo Go con las dependencias nativas del proyecto:

1. Genera la build una vez: `eas build --platform ios|android --profile development` (desde `apps/mobile`).
2. Instálala en el teléfono desde el enlace que devuelve EAS.
3. Arranca el servidor con `npm run start -w mobile` y abre la app.

Los cambios de JavaScript/TypeScript se recargan en vivo. Solo hay que volver a compilar cuando cambian las dependencias nativas, `app.json` o el SDK de Expo.

Para revisar un Pull Request en el teléfono basta con cambiar a su rama y arrancar el servidor; no hace falta una build por PR.

### 3. Build de prueba (`preview`)

App autónoma, sin servidor de desarrollo, para validar una versión de `main`. Se lanza manualmente, desde la pestaña *Actions* de GitHub (workflow **Build**) o con:

```bash
gh workflow run build.yml --ref main -f platform=ios      # ios | android | all
```

El workflow solo acepta `main`, falla si EAS no está configurado y publica el enlace de instalación en el resumen de la ejecución. Cada ejecución consume cupo de builds de EAS (15 de iOS y 15 de Android al mes en el plan gratuito).

### Configuración inicial de EAS

Una sola vez, desde `apps/mobile` y con sesión interactiva:

1. `eas login` y `eas init` — vincula el proyecto y añade `extra.eas.projectId` a `app.json` (hay que versionar ese cambio).
2. iOS: `eas device:create` para registrar el UDID del iPhone, y una primera `eas build --platform ios --profile preview`, que pide la sesión de Apple y genera el certificado y el perfil de aprovisionamiento. Quedan guardados en EAS para las builds no interactivas.
3. Android: una primera `eas build --platform android --profile preview` para que EAS genere el almacén de claves de firma.
4. Crea un token de acceso en expo.dev y guárdalo como secreto del repositorio: `gh secret set EXPO_TOKEN`.

Cada iPhone nuevo exige registrarlo y volver a compilar para que entre en el perfil de aprovisionamiento.

La validación manual en un dispositivo físico debe distinguirse de las pruebas en simulador y de las pruebas automatizadas.

## Entornos

Mantén separados estos entornos:

| Entorno | Uso | Datos |
|---|---|---|
| Desarrollo | Trabajo diario y pruebas del agente | Datos ficticios y servicios de prueba. |
| Staging | Validación antes de aceptar una versión | Base de datos independiente y configuración cercana a producción. |
| Producción | Usuarios reales | Datos reales, accesos restringidos y copias de seguridad. |

No utilices la base de datos de producción para probar historias de usuario.

## Seguridad y privacidad

- Autentica a los usuarios mediante una integración mantenida de Google y valida la identidad en el backend.
- La autenticación no sustituye a la autorización: cada operación debe comprobar qué recursos puede consultar o modificar el usuario.
- No confíes en permisos o identificadores enviados por el cliente sin verificarlos.
- No guardes claves privadas de proveedores en la aplicación móvil.
- Minimiza los datos personales y no incluyas información sensible en logs.
- Solicita permisos móviles solo cuando sean necesarios y ofrece alternativas cuando sea posible.
- Trata alergias e intolerancias como restricciones de seguridad. No presentes una receta como segura si los datos son insuficientes para evaluarla.
- Revisa las dependencias y aplica actualizaciones de seguridad de manera controlada.
- Documenta y prueba las migraciones de datos.

## Roadmap inicial

El orden funcional de referencia es:

1. Identidad, cuenta y perfil alimentario.
2. Catálogo de ingredientes y registro manual del inventario.
3. Catálogo de recetas y detalle.
4. Recomendaciones personalizadas y basadas en inventario.
5. Planificación semanal.
6. Generación y edición de la lista de compra.
7. Favoritos.
8. Endurecimiento de errores, sincronización y calidad.
9. Evoluciones posteriores: códigos de barras, reconocimiento por imagen, recetas offline, recetas creadas por usuarios, reseñas y comparación de precios.

Este roadmap no reemplaza el orden de dependencias de `ProductBacklog.md`. Antes de iniciar cada historia, consulta el backlog y sigue el proceso definido en `CLAUDE.md`.

## Documentación del proyecto

- [`CLAUDE.md`](CLAUDE.md): contexto, stack, convenciones y flujo de trabajo obligatorio para Claude Code.
- [`ProductBacklog.md`](ProductBacklog.md): fuente de verdad para épicas, historias de usuario y criterios de aceptación.
- [`docs/google-sign-in-setup.md`](docs/google-sign-in-setup.md): alta de las credenciales de Google y variables de entorno del inicio de sesión.
- `docs/architecture/`: documentación de arquitectura, cuando exista.
- `docs/decisions/`: decisiones técnicas (ADR), cuando exista.

Las rutas se refieren a archivos que deben estar presentes en el repositorio. Si alguno aún no existe, créalo o ajusta esta documentación durante la configuración inicial; no asumas que una funcionalidad está implementada solo porque aparezca descrita aquí.

---

## Licencia

Pendiente de decidir. No añadas una licencia de código abierto hasta que el propietario del proyecto seleccione una.
