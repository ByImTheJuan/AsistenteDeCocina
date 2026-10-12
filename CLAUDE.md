# CLAUDE.md — Asistente personal de cocina

Este archivo define el contexto del producto, el stack tecnológico, las reglas de ingeniería y el flujo de trabajo que Claude Code debe seguir al trabajar en este repositorio.

Estas instrucciones son obligatorias salvo que el usuario indique explícitamente lo contrario. Si una instrucción entra en conflicto con el estado real del repositorio, inspecciona primero el proyecto y explica el conflicto antes de modificar archivos.

---

## 1. Contexto y objetivo del producto

Estamos desarrollando una aplicación móvil multiplataforma para iOS y Android que actúa como asistente personal de cocina.

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

## 6. Configuración inicial del repositorio

Antes de la primera implementación, inspecciona el estado real del repositorio y determina qué existe y qué falta. No presupongas que la estructura ya está creada.

Una estructura objetivo posible —orientativa, no obligatoria si el repositorio ya tiene una organización razonable— es:

```text
.
├── CLAUDE.md
├── ProductBacklog.md
├── apps/
│   └── mobile/             # React Native + Expo
├── services/
│   └── api/                # NestJS
├── packages/
│   └── shared/             # Tipos/contratos compartidos si aportan valor
├── docs/
│   ├── architecture/
│   └── decisions/
├── .github/
│   └── workflows/
├── .env.example
└── README.md
```

No introduzcas un monorepo ni un paquete compartido si el tamaño inicial del proyecto no lo justifica. Si eliges una estructura diferente, explica la razón en el plan.

Antes de crear archivos de configuración:

1. Inspecciona los archivos existentes.
2. Identifica el gestor de paquetes y las versiones.
3. Comprueba si hay código o convenciones que deban conservarse.
4. Evita reemplazar archivos completos cuando sea suficiente una modificación localizada.
5. Actualiza el `README.md` con instrucciones reproducibles de instalación, ejecución y pruebas cuando se establezca el proyecto.

---

## 7. Regla final

Ante cada solicitud de implementación de una US, el orden por defecto es:

**Leer `ProductBacklog.md` → inspeccionar el repositorio → analizar dependencias y dudas → presentar el plan → obtener aprobación → crear rama `feature/us-xxx-xxxxx` → implementar → probar → revisar commits y diff → crear Pull Request a `main` → informar de resultados.**

No te saltes las fases de análisis, planificación, pruebas o revisión del diff para acelerar una tarea. La prioridad es entregar incrementos funcionales verificables, seguros y mantenibles.
