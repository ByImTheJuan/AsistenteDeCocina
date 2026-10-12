# Asistente personal de cocina

Aplicación móvil multiplataforma para iOS y Android que ayuda a gestionar los alimentos disponibles en casa, descubrir recetas personalizadas, planificar comidas y preparar listas de compra.

> **Estado del proyecto:** definición inicial del producto y preparación del entorno de desarrollo. Consulta el repositorio para comprobar qué funcionalidades están realmente implementadas.

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
- [Probar en un iPhone](#probar-en-un-iphone)
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

Las herramientas exactas y sus versiones deberán fijarse al configurar el repositorio. Como mínimo, el entorno de desarrollo necesitará:

- Git.
- Node.js en una versión compatible con la versión de Expo y NestJS elegida.
- El gestor de paquetes definido por el repositorio.
- Una instancia de MySQL para desarrollo y otra configuración aislada para pruebas de integración.
- Una cuenta de GitHub con permisos para el repositorio y Pull Requests.
- Expo Go en el iPhone para las primeras pruebas rápidas, o un development build cuando se necesiten módulos nativos específicos.
- Cuenta y configuración de EAS cuando se empiecen a generar builds de iOS/Android.

No instales versiones al azar. Comprueba la compatibilidad entre Expo, React Native, Node.js y las dependencias antes de fijarlas.

## Puesta en marcha

> **Nota:** los comandos definitivos de instalación y ejecución deben documentarse cuando estén creados los manifiestos del proyecto. No ejecutes comandos de una carpeta que todavía no exista.

Cuando el repositorio esté configurado, esta sección deberá incluir los pasos concretos para:

1. Clonar el repositorio.
2. Instalar dependencias usando el gestor de paquetes y los lockfiles versionados.
3. Crear los archivos de configuración locales a partir de `.env.example`.
4. Iniciar MySQL para desarrollo.
5. Aplicar las migraciones de Prisma.
6. Iniciar la API.
7. Iniciar la aplicación Expo.
8. Ejecutar las pruebas y comprobaciones de calidad.

Los comandos reales deben obtenerse de los scripts definidos en los `package.json` y de la configuración del repositorio; no deben documentarse como funcionales hasta que se hayan verificado.

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

GitHub Actions deberá ejecutar las comprobaciones aplicables a los cambios, incluyendo tipos, lint, pruebas y builds relevantes. Las pruebas que dependan de servicios externos deben configurarse con entornos de prueba o quedar identificadas como pendientes, nunca darse por aprobadas sin ejecutarse.

### Definition of Done

Una historia solo está terminada cuando:

- Cumple todos los criterios de aceptación.
- Tiene pruebas suficientes para los caminos principales y errores relevantes.
- Las comprobaciones obligatorias pasan.
- Las migraciones están versionadas y verificadas cuando corresponda.
- No incluye secretos ni cambios ajenos a la historia.
- La documentación afectada está actualizada.
- Existe un Pull Request hacia `main`, o se ha explicado con precisión por qué no se pudo crear.

## Probar en un iPhone

### Inicio rápido con Expo Go

Para las primeras pantallas y flujos compatibles:

1. Instala Expo Go desde la App Store.
2. Clona el repositorio e instala las dependencias cuando el proyecto esté preparado.
3. Arranca el servidor Expo con el script definido por el proyecto (habitualmente `npx expo start`).
4. Abre Expo Go y escanea el código QR.
5. Prueba la funcionalidad en el dispositivo y revisa los errores de consola.

El iPhone y el ordenador deben poder comunicarse con el servidor de desarrollo. Si el backend se ejecuta en el ordenador, `localhost` desde el iPhone se refiere al propio teléfono: configura una dirección de red accesible o un entorno remoto.

Expo Go es útil para empezar, pero tiene limitaciones para módulos nativos personalizados.

### Development builds con EAS

Cuando la aplicación requiera módulos nativos específicos o se necesite un entorno más parecido a producción:

1. Configura EAS en el repositorio.
2. Genera un development build para iOS.
3. Configura la firma y registra el dispositivo siguiendo el proceso de Apple/EAS correspondiente.
4. Instala la compilación en el iPhone.
5. Utiliza el servidor de desarrollo para probar los cambios compatibles.

No todos los cambios necesitan una nueva compilación nativa. Los cambios JavaScript/TypeScript suelen poder probarse con el servidor activo; los cambios en dependencias nativas o configuración nativa normalmente requieren recompilar.

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
- `docs/architecture/`: documentación de arquitectura, cuando exista.
- `docs/decisions/`: decisiones técnicas (ADR), cuando exista.

Las rutas se refieren a archivos que deben estar presentes en el repositorio. Si alguno aún no existe, créalo o ajusta esta documentación durante la configuración inicial; no asumas que una funcionalidad está implementada solo porque aparezca descrita aquí.

---

## Licencia

Pendiente de decidir. No añadas una licencia de código abierto hasta que el propietario del proyecto seleccione una.
