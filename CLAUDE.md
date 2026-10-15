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

**El Product Backlog vive en GitHub y es la fuente de verdad** para las épicas, las historias de usuario (US), sus prioridades y sus criterios de aceptación:

- Cada épica y cada US es un issue del repositorio `ByImTheJuan/AsistenteDeCocina`, titulado `[EP-xx] Nombre` o `[US-xxx] Nombre`. Cada US es un sub-issue de su épica.
- Todos están en el Project [AsistenteDeCocina](https://github.com/users/ByImTheJuan/projects/4), cuyo campo `Status` vale `Todo`, `In Progress` o `Done`.
- `ProductBacklog.md` es la especificación inicial a partir de la cual se crearon los issues. Conserva la visión del producto, los principios y las convenciones de prioridad, pero **no se mantiene al día con los cambios de las historias**. Si un issue y el archivo discrepan, manda el issue.

Las reglas para leer y actualizar el backlog están en la sección 3 («Backlog en GitHub»).

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
2. Localiza el issue de la historia por su identificador, por ejemplo, `US-006`: `gh issue list --state all --search "US-006 in:title"`.
3. Lee el issue completo con sus comentarios (`gh issue view <número> --comments`): descripción, prioridad, criterios de aceptación, notas y cambios acordados después de crearlo. Lee también su épica y los issues de las historias de las que depende o que le han trasladado criterios.
4. Comprueba que el issue está abierto y en `Todo` en el Project. Si está cerrado o en `In Progress`, averigua por qué antes de seguir.
5. No te bases exclusivamente en una descripción parcial del usuario cuando el issue contiene la especificación oficial. `ProductBacklog.md` solo sirve como contexto general (visión y prioridades).
6. Si la US no tiene issue, el issue contradice lo que pide el usuario o no puedes acceder a GitHub, detente y pregunta. No inventes una especificación sustitutiva ni uses `ProductBacklog.md` en su lugar sin avisar.

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
6. Pasa el issue de la US a `In Progress` en el Project (comandos en «Backlog en GitHub»).
7. Si el plan aprobado cambia la definición de la US (criterios, alcance o criterios trasladados a otra historia), actualiza el issue antes de implementar, como se indica en «Backlog en GitHub».

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
- Toda pantalla o componente nuevo, y toda pantalla existente que se modifique, sigue el sistema de diseño de la sección 5 («Sistema de diseño»). Una interfaz sin aplicarlo no está terminada.

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
- **Validación móvil:** dispositivo, sistema operativo y recorrido probado, si se ha podido verificar; de lo contrario, indicarlo como pendiente. Mientras el propietario no indique otra cosa, sus validaciones son en **Expo Go en iOS**: anótalas así y deja Android y las builds como pendientes. **Un PR que el propietario aprueba y fusiona en `main` se da por validado de esa forma**, aunque no lo diga expresamente.
- **Capturas o vídeo:** incluirlos cuando aporten valor y estén disponibles.
- **Riesgos y limitaciones:** dependencias externas, decisiones pendientes o aspectos no validados.
- **Relación con el backlog:** `Closes #<número>` con el issue de la US, para que al fusionar el PR se cierre el issue y el Project lo pase a `Done`. Si quedan criterios diferidos a otras historias, enlaza también esos issues.

Antes de crear el PR, comprueba que el issue refleja la definición final de la US: lo que se acordó durante el desarrollo tiene que estar en el issue, no solo en el PR.

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
- Issues de GitHub actualizados (definición, criterios trasladados, estado en el Project).
- Limitaciones o tareas pendientes.

No declares la historia completada si quedan criterios de aceptación sin cubrir o comprobaciones obligatorias fallidas.

### Backlog en GitHub

Los issues de GitHub son la fuente de verdad del backlog (sección 1). Mantenlos al día durante todo el trabajo.

**Cuándo actualizar un issue.** Siempre que cambie la definición de una US o de una épica, por ejemplo:

- se añade, se quita o se reformula un criterio de aceptación;
- se acota o amplía el alcance, o se fija una decisión de producto que lo concreta (por ejemplo, «una sola dieta por usuario»);
- un criterio se difiere a otra historia;
- cambia la prioridad o la épica;
- una historia se divide, se fusiona con otra o se descarta;
- aparece una historia nueva.

Los cambios de definición son decisiones de producto: acuérdalos antes con el usuario (sección 1) y actualiza el issue en cuanto estén aprobados, sin esperar al PR. Los detalles de implementación no cambian la definición y van en el PR, no en el issue.

**Cómo actualizarlo.**

1. Edita la descripción del issue para que siempre muestre la definición vigente, conservando su formato (épica, prioridad, historia de usuario y criterios de aceptación). Usa `gh issue edit <número> --body-file <archivo>`, con el archivo en un directorio temporal fuera del repositorio.
2. Añade un comentario (`gh issue comment`) que explique qué cambió, por qué y quién lo acordó, con la fecha. La descripción dice cómo está la historia; los comentarios, cómo llegó a estarlo.
3. **Criterio diferido:** añádelo al issue de la historia de destino, en el apartado «Criterios trasladados de otras historias», indicando de dónde procede (`*(Procede de US-004, #22.)*`). El issue de origen no se modifica y puede cerrarse cuando el resto de sus criterios esté cubierto.
4. **Historia nueva o dividida:** crea el issue con el mismo formato y título (`[US-xxx] Nombre`, con el siguiente número libre), añádelo como sub-issue de su épica y al Project, y actualiza la lista de historias de la épica. Una historia descartada se cierra como `not planned` con un comentario del motivo; no se borra.
5. **Épica:** su descripción enumera sus historias. Actualízala cuando cambie esa lista.

**Estado en el Project.** `Todo` al crearse, `In Progress` al empezar la rama y `Done` al fusionar el PR. El Project pasa a `Done` los issues cerrados y cierra los que se marcan `Done`, pero comprueba el estado después de cerrar un issue: EP-01 se cerró a mano y se quedó en `Todo`. El paso a `In Progress` se hace a mano:

```bash
# id del elemento del Project que corresponde al issue
gh project item-list 4 --owner ByImTheJuan --limit 200 --format json \
  --jq '.items[] | select(.content.number == <número>) | .id'
# pasarlo a In Progress
gh project item-edit --project-id PVT_kwHOBuoE2M4BnCT7 --id <id del elemento> \
  --field-id PVTSSF_lAHOBuoE2M4BnCT7zhlowuQ --single-select-option-id 47fc9ee4
```

Opciones de `Status`: `Todo` `f75ad846`, `In Progress` `47fc9ee4` y `Done` `98236657`.

**Límites.**

- Edita solo los issues afectados por el cambio acordado; no reescribas otros issues por iniciativa propia.
- No cierres, reabras ni descartes issues sin que lo justifique un PR fusionado o una decisión del usuario.
- No copies en los issues secretos, datos personales ni registros de error con información sensible.
- Si no tienes acceso a GitHub, no digas que el issue está actualizado: deja preparado el texto y los comandos e indica el impedimento.

---

## 4. Definition of Done

Una US solo se considera terminada cuando se cumplen todas las condiciones aplicables:

- [ ] La implementación satisface todos los criterios de aceptación acordados.
- [ ] La funcionalidad móvil está implementada para iOS y Android, y se ha indicado qué se validó en cada plataforma (dispositivo físico, simulador/emulador o solo pruebas automatizadas).
- [ ] Las pantallas nuevas o modificadas siguen el sistema de diseño (sección 5): tokens, componentes compartidos y reglas de accesibilidad.
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
- [ ] El issue de la US (y los de las historias a las que se hayan trasladado criterios) refleja la definición final, y el PR lo cierra con `Closes #<número>`.
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

### Sistema de diseño (obligatorio)

Todas las implementaciones de la app móvil, presentes y futuras, siguen el sistema de diseño definido en `docs/decisions/0004-sistema-de-diseno.md`. Antes de crear o modificar una pantalla, lee ese documento y revisa los componentes de `src/components`.

- **Tokens, nunca valores sueltos.** Colores con `useTheme()` o `themeColor`; espaciado con `Spacing`, radios con `Radius`, texto con las variantes de `ThemedText` (`title`, `heading`, `defaultBold`, `default`, `small`, `smallBold`, `label`), altura de controles con `ControlHeight` y sombra de tarjeta con `CardShadow`, todo de `src/constants/theme.ts`. Si falta un token, añádelo allí, comprueba su contraste en `theme-contrast.test.ts` y documéntalo en el ADR; no lo resuelvas con un literal en la pantalla. `no-hardcoded-colors.test.ts` falla si aparece un color hexadecimal fuera de los tokens.
- **Reutiliza los componentes compartidos** antes de crear otros: `PrimaryButton` (variantes `primary`, `secondary`, `danger`), `TextField`, `FormScreen`, `Card`, `Notice` (error, éxito o aviso), `ScreenState` (carga, error con reintento y vacío, con una acción opcional), `Badge` (etiqueta destacada de aviso o peligro, con icono), `SegmentedControl` (formas excluyentes de ver un mismo contenido) y `FloatingActionButton` (acción principal de una lista, en un botón redondo flotante). Un patrón nuevo que se vaya a repetir se convierte en componente de `src/components`.
- **Estructura de pantalla:** fondo `background`, título `title` y una descripción en `textSecondary`, el contenido agrupado en `Card` con su cabecera `heading`, y márgenes y separaciones de la escala de `Spacing`. Las listas de categorías o de navegación usan filas en `Card` con icono, nombre (`defaultBold`), resumen (`small`) y chevron, como la pestaña «Perfil».
- **Color:** la mostaza (`primary`) se usa como fondo con texto o icono `onPrimary` encima, nunca como texto ni como único indicador de estado. `accent` es solo decorativo. Los bordes de los controles usan `borderStrong`; `border` es solo para separadores y contornos decorativos.
- **Estados:** toda pantalla con datos del servidor contempla carga, error, vacío y éxito con `ScreenState` y `Notice`. Los controles deshabilitados usan los tokens `disabled*`. El estado presionado cambia el fondo (`primaryPressed`, `surfaceSecondary`).
- **Accesibilidad:** los errores y estados llevan texto e icono además del color; los mensajes de error tienen `accessibilityRole="alert"`; las áreas táctiles miden al menos 44 pt; las alturas son mínimas (`minHeight`), nunca fijas; no se desactiva el escalado de texto.
- **Iconos:** `SymbolView` de `expo-symbols` con nombre para iOS (SF Symbols) y Android/web (Material Symbols), en el color de un token.
- **Plataformas:** el mismo diseño en iOS y Android. Solo modo claro mientras no se implemente el oscuro; no uses `useColorScheme` en las pantallas.
- **Validación:** al cerrar una historia con interfaz, indica en el PR si se revisó visualmente en dispositivo o simulador. Las pruebas automatizadas no demuestran que la pantalla se vea bien.

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

> **Estado a 15-10-2026.** Esta sección describe lo que existe realmente. Actualízala al cerrar cada historia o cambio de infraestructura, y comprueba el repositorio antes de fiarte de ella: si el código y esta sección discrepan, manda el código.

### Estructura

```text
.
├── CLAUDE.md
├── ProductBacklog.md         # especificación inicial; el backlog vigente está en los issues
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
- **App móvil:** Expo SDK 57 (React Native 0.86, React 19.2, TypeScript 6), Expo Router, TanStack Query, React Hook Form, Zod, `expo-dev-client`, Jest y React Native Testing Library. El código propio vive en `src/features/<funcionalidad>` y `src/lib`; las rutas privadas están en `src/app/(app)`, con cuatro pestañas: «Home» (todavía la pantalla de ejemplo de la plantilla de Expo), «Mi despensa», «Perfil» y «Cuenta».
- **API:** NestJS 12 (proyecto ESM), OpenAPI en `/docs`, `ValidationPipe` global, `GET /health`, módulo `auth` y Prisma 7.10 con proveedor MySQL a través de `@prisma/adapter-mariadb` (`PrismaService` global). Modelos `User` y `RefreshToken` con su migración. Las variables de entorno se validan al arrancar (`src/config/env.validation.ts`).
- **US-001 (registro e inicio de sesión, con email y contraseña o con Google) está terminada**; el propietario validó en Expo Go (iOS) el acceso con email y contraseña. El de Google sigue sin validar: necesita las credenciales de Google Cloud y una development build.
- **US-002 (gestión de la cuenta) está implementada y cubierta con pruebas automatizadas, pendiente de validar en dispositivo.**
- **US-003 (preferencias alimentarias) está implementada, cubierta con pruebas automatizadas y validada por el propietario en Expo Go (iOS), con un criterio diferido:** «Las recomendaciones tienen en cuenta las preferencias guardadas» se cubrirá en US-015, cuando existan recetas.
- **US-005 (alergias e intolerancias) está implementada, cubierta con pruebas automatizadas y validada por el propietario en Expo Go (iOS), con dos criterios diferidos:** excluir o marcar las recetas con un alérgeno, y no presentar como segura una receta sin información suficiente. Ambos dependen de las recetas (US-012, US-013 y US-015).
- **US-004 (objetivos nutricionales) está implementada y cubierta con pruebas automatizadas, pendiente de validar en dispositivo y con un criterio diferido:** que las recomendaciones y los detalles nutricionales reflejen los objetivos, que depende de las recetas (US-013 y US-015).
- **US-044 (ingredientes y unidades coherentes) está implementada y cubierta con pruebas automatizadas.** Solo cambia la API; sus reglas se ven en la app con US-006 (unidades y unidad sugerida) y después en US-014 y US-023.
- **US-006 (registrar alimentos manualmente) está implementada, cubierta con pruebas automatizadas y validada por el propietario en Expo Go (iOS).**
- **US-007 (caducidad y ubicación) está implementada, cubierta con pruebas automatizadas y validada por el propietario en Expo Go (iOS).** Los retoques de diseño posteriores (botón flotante, secciones plegables, separador y etiqueta de aviso) también están validados.
- **US-011 (alimentos que conviene consumir pronto) está implementada, cubierta con pruebas automatizadas y validada por el propietario en Expo Go (iOS).** Cubre la vista por fecha y el aviso de revisar el alimento; sus criterios de recetas pasaron a US-014 (#32) y el de fechas estimadas a US-008 (#26). Las siguientes según el backlog son US-012 y US-013 (catálogo y detalle de recetas).
- **Perfil alimentario:** pestaña «Perfil» de la app (menú en `src/features/profile`, rutas en `src/app/(app)/profile`), separada de «Cuenta». Tiene tres secciones: «Preferencias alimentarias» (`src/features/food-preferences`), «Alergias e intolerancias» (`src/features/dietary-restrictions`) y «Objetivos nutricionales» (`src/features/nutrition-goals`). El buscador de alimentos que comparten está en `src/features/ingredients`. En la API, módulo `food-preferences` (`GET` y `PUT /food-preferences`; el `PUT` reemplaza la dieta y las dos listas a la vez) y módulo `ingredients` (`GET /ingredients?search=`, máximo 50 resultados). Quien no ha configurado nada recibe valores vacíos, no un error. La dieta es única (`Diet`: vegetariana, vegana, pescetariana, flexitariana o ninguna). Estas preferencias son gustos, no restricciones.
- **Restricciones de seguridad:** módulo `dietary-restrictions` de la API (`GET` y `PUT /dietary-restrictions`; el `PUT` reemplaza los alérgenos y los ingredientes a la vez). El usuario marca alérgenos de una lista fija (`Allergen`: los 14 de la UE más lactosa, fructosa, histamina y sorbitol) e ingredientes concretos del catálogo, en una sola lista sin distinguir alergia de intolerancia. Se guardan en `allergen_restrictions` e `ingredient_restrictions`, aparte de las preferencias. **La restricción manda sobre el gusto:** los alimentos de «Me gustan» que chocan se devuelven en `conflictingLikedIngredients` y la app lo avisa, sin borrarlos. Cualquier funcionalidad que use recetas debe tratar estas restricciones como obligatorias.
- **Objetivos nutricionales:** módulo `nutrition-goals` de la API (`GET` y `PUT /nutrition-goals`; el `PUT` reemplaza los tres a la vez y `null` elimina uno). Hay tres objetivos opcionales: calorías al día, calorías por comida y proteínas al día (`NutritionGoalKind`), guardados en `nutrition_goals`, una fila por objetivo. Cada uno tiene `value` y `enabled`: **un objetivo con `enabled` a `false` conserva su valor pero no debe aplicarse.** Los rangos admitidos (500–10 000 kcal al día, 50–5 000 kcal por comida, 1–500 g de proteínas) solo evitan erratas y están repetidos en la app (`nutrition-goals-form.ts`); si cambian, hay que cambiarlos en los dos sitios. Con ambos objetivos calóricos activos, el de por comida no puede superar el diario. Añadir otro nutriente es un valor nuevo del enum.
- **Formularios con «Guardar»:** las pantallas de preferencias, de alergias y de objetivos guardan un borrador y avisan antes de salir si hay cambios sin guardar, con `useUnsavedChangesWarning(isDirty)` (`src/hooks/use-unsaved-changes-warning.ts`). Usar el mismo hook en los formularios nuevos de este tipo. Cambiar de pestaña no avisa porque conserva la pantalla y su borrador.
- **Catálogo de ingredientes:** tabla `ingredients` (nombre en español y categoría), sembrada por una migración de datos con ids fijos (`ing_tomate`). Para ampliarlo, otra migración. Detalles en `docs/decisions/0002-catalogo-de-ingredientes.md`.
- **Unidades y sinónimos (US-044, revisado con US-006):** enum `Unit` (g, kg, ml, l, cucharada, cucharadita, unidades y pizca). Cada alimento tiene una medida (`ingredients.measure`: peso, volumen, unidades, o unidades o peso) que decide sus unidades (`MEASURE_UNITS`), y una unidad sugerida de esa medida (`defaultUnit`). Toda respuesta con ingredientes incluye `units` y `defaultUnit`. **Cucharada, cucharadita y pizca son solo para recetas:** ninguna medida las incluye. **Solo se convierte dentro de la misma magnitud** (peso, volumen o recuento); la pizca no se convierte a nada. Las reglas están en `services/api/src/units/units.ts`: `convert` devuelve `null` si no hay conversión válida y `combineQuantities` suma por alimento y deja aparte lo incompatible. **Toda funcionalidad que compare o sume cantidades debe usar estas funciones.** Los sinónimos (`ingredient_aliases`: papa → Patata) los encuentra `GET /ingredients`. Medidas, unidades sugeridas y sinónimos están sembrados a mano, sin fuente validada. Detalles en `docs/decisions/0005-unidades-y-equivalencias.md`.
- **Alérgenos de los ingredientes:** tabla `ingredient_allergens`, sembrada por migración, y columna `ingredients.allergensUncertain` para los elaborados de composición variable. Toda respuesta con ingredientes incluye `allergens` y `allergensUncertain` (usar `withAllergens` de `src/ingredients/ingredient-with-allergens.ts`). **El mapeo no procede de una fuente validada** y un ingrediente sin alérgenos asociados no es por ello seguro. Criterio y límites en `docs/decisions/0003-alergenos-y-restricciones.md`.
- **Cuenta:** módulo `account` de la API (`GET /account`, `PUT`/`DELETE /account/password`, `PUT`/`DELETE /account/google`, `POST /account/delete`) y pestaña «Cuenta» en la app (`src/features/account`, rutas en `src/app/(app)/account`). Las acciones sensibles piden la contraseña actual si la cuenta tiene una y responden 403 (no 401) cuando es incorrecta; no se puede quitar el último método de acceso; solo se vincula el Google con el mismo email. Los errores de negocio llevan un `code` que la app traduce a mensajes (`ApiError.code`).
- **Eliminación de datos:** `docs/data-retention-policy.md`. Toda tabla nueva con datos de un usuario debe borrarse en cascada con `users` (`onDelete: Cascade`), salvo el contenido público, que se anonimiza (`onDelete: SetNull`), e incluir una prueba de qué ocurre al eliminar la cuenta.
- **Inventario (US-006):** módulo `inventory` de la API (`GET` y `POST /inventory`, `PUT` y `DELETE /inventory/:id`) y pestaña «Mi despensa» en la app (en los textos de la app se dice «despensa», nunca «inventario»; en el código, `inventory`) (`src/features/inventory`, rutas en `src/app/(app)/inventory`: lista, `new` y `[id]`). Tabla `inventory_items`: cada registro es un alimento del catálogo con una cantidad opcional (`Decimal(10,3)`) y su unidad, que debe ser de la medida del alimento (`unit_not_allowed`). **Sin cantidad (cantidad y unidad `null`), el alimento está siempre disponible en la cocina** (sal, aceite…), y US-010 no debe descontar nada de él. Una sin la otra se rechaza (`incomplete_quantity`). Puede haber varios registros del mismo alimento, que no se fusionan. **Fecha y ubicación (US-007):** cada registro tiene una fecha opcional (`expiresOn`, columna `DATE`, que viaja como `YYYY-MM-DD` para que la zona horaria no cambie el día) con su tipo (`dateKind`: `USE_BY` caducidad o `BEST_BEFORE` consumo preferente; los dos o ninguno, `incomplete_date`) y una ubicación opcional (`location`: `FRIDGE`, `FREEZER`, `PANTRY`). La app agrupa «Mi despensa» por ubicación, en el orden Nevera, Despensa, Congelador y Sin ubicación (`storageLocations`), y muestra primero «Caducan pronto»: caducados y los que vencen en 3 días, calculado con el día del dispositivo (`src/features/inventory/expiry.ts`). La fecha se elige con `@react-native-community/datetimepicker` (`date-picker-field.tsx`: calendario en línea en iOS, diálogo en Android). Un selector «Ver por: Ubicación · Fecha» (US-011, componente `SegmentedControl`) cambia a la vista por fecha: todos los alimentos con fecha del más próximo al más lejano (`byExpiry`) y después los que no tienen. **Hoy todas las fechas las registra el usuario;** si una historia propone fechas estimadas (US-008), debe distinguirlas de las registradas. Máximo de 500 por usuario (`inventory_full`). El registro de otro usuario responde 404 (`inventory_item_not_found`). En la app, las operaciones actualizan la caché `['inventory']` con la respuesta de la API; la unidad se elige dentro del campo «Cantidad» («1,5 kg», con `TextField` y su `trailing`) entre las `units` del alimento, empezando por su `defaultUnit`, y el buscador de alimentos tiene un modo de selección única (`mode="single"`). Las etiquetas de las unidades y el formato de las cantidades («1,5 kg») están en `src/features/units`.
- **Datos del servidor en la app:** TanStack Query, con las llamadas autenticadas a través de `useSession().request`; la caché se vacía al cerrar sesión. Los componentes compartidos están en `src/components` (`PrimaryButton`, `TextField`, `FormScreen`, `Card`, `Notice`, `ScreenState`, `Badge`, `SegmentedControl`, `FloatingActionButton`).
- **Sistema de diseño** (nombre provisional «Modern Kitchen», que no debe usarse en código, paquetes ni identificadores): tokens en `src/constants/theme.ts` (`Colors`, `Spacing`, `Radius`, `Typography`, `FontFamily`, `ControlHeight`, `CardShadow`), leídos con `useTheme()` y `ThemedText`. **Ninguna pantalla usa colores literales**; lo comprueba `no-hardcoded-colors.test.ts`, y `theme-contrast.test.ts` comprueba el contraste de cada par de colores. La app está **solo en modo claro** (`userInterfaceStyle: "light"`); `Colors.dark` existe con los mismos valores para añadir el oscuro después. Fuente Nunito Sans (400, 600 y 700), cargada con `useFonts` en el layout raíz e importada por peso. Mostaza (`primary`) solo como fondo con texto oscuro encima, nunca como texto; los errores y estados llevan texto e icono además del color (`Notice`); los estados de carga, error y vacío de pantalla completa usan `ScreenState`. Detalles en `docs/decisions/0004-sistema-de-diseno.md`; reglas obligatorias en la sección 5 («Sistema de diseño»).
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

### Backlog y seguimiento

- Issues `[EP-01]`…`[EP-10]` (#9–#18) y `[US-001]`…`[US-047]` (#19–#65), cada US como sub-issue de su épica, en el Project [AsistenteDeCocina](https://github.com/users/ByImTheJuan/projects/4) (`Status`: `Todo`, `In Progress`, `Done`). Sin etiquetas ni milestones por ahora.
- EP-01 (#9) está cerrada y en `Done`, como US-001 a US-005. Los criterios que estas historias dejaron aplazados están como «Criterios trasladados de otras historias» en US-013 (#31) y US-015 (#33).
- Automatizaciones activas del Project: añadir los sub-issues, pasar a `Done` los issues cerrados o con el PR fusionado y cerrar los que se marcan `Done`.
- Reglas de uso en la sección 3 («Backlog en GitHub»).

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

Detalladas en `docs/decisions/0001-estructura-y-gestor-de-paquetes.md` (el catálogo de ingredientes, en `0002-catalogo-de-ingredientes.md`; los alérgenos y las restricciones, en `0003-alergenos-y-restricciones.md`; el sistema de diseño, en `0004-sistema-de-diseno.md`; las unidades y los sinónimos, en `0005-unidades-y-equivalencias.md`):

- La API usa **Vitest y oxlint**, los valores por defecto del generador de NestJS 12. Jest y React Native Testing Library se usan en la app móvil.
- **Prisma fijado en 7.10.0**: el dist-tag `latest` de npm apuntaba a una versión candidata 8.0.0-rc.
- `overrides` en el `package.json` raíz: `react` y `react-dom` (una sola copia, la que exige el SDK de Expo) y `mysql2`, `deepmerge-ts` y `mariadb` (versiones corregidas que la CLI de Prisma y su adaptador de MySQL fijan por debajo). Al actualizar el SDK de Expo hay que revisar los de React y la versión de `test-renderer`.
- **Auditoría de seguridad por niveles:** el CI bloquea con severidad `high` en las dependencias de producción de la API y con `critical` en todo el árbol, porque las herramientas de compilación de Expo/Metro arrastran avisos `high` sin corrección publicada.

### Pendiente

- **US-014 y US-023 deben usar `combineQuantities`** para comparar el inventario con las recetas y sumar la lista de compra, mostrando por separado las cantidades que no se puedan combinar.
- **Validar US-002 en dispositivo.** En Expo Go se puede probar todo salvo vincular y desvincular Google.
- **Validar US-004 en dispositivo.** Se puede probar entera en Expo Go.
- **Validar US-006 en Android.** En iOS (Expo Go) ya está validada.
- **Validar US-007 en Android**, donde el selector de fecha es un diálogo distinto.
- **Validar US-011 en Android:** el selector «Ver por» y la vista por fecha.
- **Validar el sistema de diseño en Expo Go, en iOS y en Android:** acceso, cuenta, perfil y sus tres secciones, con el texto grande del sistema activado. Comprobar en Android que la fuente no muestra negritas sintéticas. Solo tiene pruebas automatizadas y bundles de `expo export`.
- La pestaña «Home», el icono y la pantalla de inicio (`app.json`) siguen siendo los de la plantilla y quedan fuera del sistema de diseño hasta que se construya la pantalla principal y se decida la marca.
- **US-013 y US-015 deben cubrir el criterio 4 de US-004:** comparar las recetas y las recomendaciones con los objetivos activos cuando haya datos nutricionales suficientes.
- **Validar en Expo Go el aviso al salir sin guardar** de las pantallas de preferencias y de alergias (botón atrás de Android, flecha de la cabecera y gesto de iOS). Se añadió después de la validación de US-003 y US-005 y solo tiene pruebas automatizadas.
- **Revisar el mapeo de alérgenos** (`seed_ingredient_allergens`) con una fuente fiable antes de usarlo para excluir recetas; fructosa, histamina y sorbitol son aproximaciones.
- **US-014 debe cubrir los criterios trasladados de US-011:** recetas para aprovechar los alimentos próximos a caducar, y que esas sugerencias no sustituyan comprobar que el alimento es apto. **US-008** debe distinguir las fechas estimadas de las registradas si propone alguna.
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
- **Todas las validaciones del propietario son en Expo Go en iOS** (US-001 con email y contraseña, US-003, US-005, US-006, US-007 y US-011; un PR fusionado en `main` cuenta como validado), y así seguirá mientras no indique otra cosa. No se ha validado nada en Android, ni en una development build ni en una build `preview`.
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

**Leer el issue de la US en GitHub → inspeccionar el repositorio → analizar dependencias y dudas → presentar el plan → obtener aprobación → crear rama `feature/us-xxx-xxxxx` y pasar el issue a `In Progress` → implementar → probar → revisar commits y diff → actualizar el issue si cambió la definición → crear Pull Request a `main` con `Closes #<número>` → informar de resultados.**

No te saltes las fases de análisis, planificación, pruebas o revisión del diff para acelerar una tarea. La prioridad es entregar incrementos funcionales verificables, seguros y mantenibles.
