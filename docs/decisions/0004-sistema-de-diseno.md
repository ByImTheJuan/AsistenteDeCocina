# 0004 — Sistema de diseño

- **Estado:** aceptada
- **Fecha:** 2026-10-14

## Contexto

La app conservaba los estilos de la plantilla de Expo: blanco y negro, modo oscuro automático, fuente del sistema y una escala tipográfica pensada para una pantalla de bienvenida. Hace falta una base visual común para las pantallas actuales y futuras, con una personalidad moderna, energética y cercana y el amarillo mostaza como color de marca.

El nombre «Modern Kitchen» es provisional: no se usa en código, paquetes, identificadores ni recursos de marca. El icono y la pantalla de inicio (`app.json`) no cambian.

## Decisión

- **Un único módulo de tokens**, `apps/mobile/src/constants/theme.ts`, con `Colors`, `Spacing`, `Radius`, `FontFamily`, `Typography`, `ControlHeight` y `CardShadow`. Ninguna pantalla usa valores hexadecimales: una prueba (`no-hardcoded-colors.test.ts`) lo comprueba, con una lista explícita de excepciones para los restos de la plantilla de la pestaña «Home».
- **Solo modo claro** en esta iteración: `userInterfaceStyle: "light"` en `app.json` y `useTheme()` devuelve siempre la paleta clara. `Colors.dark` existe con los mismos nombres de token y, por ahora, los mismos valores, para que el modo oscuro se añada solo con valores.
- **Nunito Sans** (`@expo-google-fonts/nunito-sans`), cargada en tiempo de ejecución con `useFonts` en el layout raíz. Funciona en Expo Go, a diferencia del plugin de `expo-font`. La pantalla de inicio sigue visible hasta que la fuente carga o falla; si falla, la app arranca con la fuente del sistema.
- **Un peso, una familia:** se cargan 400, 600 y 700, y cada estilo de texto elige la familia de su peso (`NunitoSans_700Bold`) en lugar de usar `fontWeight`, que en Android con fuentes propias puede sintetizar negritas.
- **Componentes compartidos** en `src/components`: `PrimaryButton`, `TextField`, `FormScreen`, `Card`, `Notice` y `ScreenState`. Se crean solo cuando un patrón ya se repite.

## Paleta y contraste

Contraste calculado con la fórmula de WCAG 2.1. Umbrales: 4,5:1 para texto, 3:1 para texto grande y para el borde de los controles. La prueba `theme-contrast.test.ts` repite estas comprobaciones.

| Token | Valor | Uso | Contraste |
|---|---|---|---|
| `primary` | `#E2B52B` | Fondo del botón principal y elementos de marca | `textPrimary` encima: 6,95 |
| `primaryPressed` | `#D4A520` | Botón principal presionado | `textPrimary` encima: 5,88 |
| `onPrimary` | `#302F29` | Texto sobre `primary` | 6,95 |
| `background` | `#FFF9EB` | Fondo de pantalla | — |
| `surface` | `#FFFFFF` | Tarjetas y campos | — |
| `surfaceSecondary` | `#F1E8D5` | Chips, opción seleccionada, botón secundario | — |
| `textPrimary` | `#302F29` | Texto | 12,79 / 13,42 / 11,02 |
| `textSecondary` | `#5E5A4F` | Texto auxiliar | 6,56 / 6,88 / 5,65 |
| `accent` | `#E47D54` | Solo decorativo | 2,72 |
| `border` | `#D8D2C5` | Separadores y contornos decorativos | 1,43 |
| `borderStrong` | `#8A8373` | Borde de campos y opciones sin marcar | 3,59 / 3,77 / 3,09 |
| `success` | `#4F6E55` | Texto e icono de confirmación | 5,41 / 5,68 / 4,67 |
| `successSurface` | `#EAF1EB` | Fondo de los mensajes de confirmación | `success` encima: 4,95 |
| `error` | `#B3261E` | Errores y acciones destructivas | 6,23 / 6,54 / 5,37 |
| `errorSurface` | `#FBEAE8` | Fondo de los mensajes de error | `error` encima: 5,61 |
| `onError` | `#FFFFFF` | Texto sobre `error` | 6,54 |
| `disabledSurface` | `#EDE7DA` | Fondo de un control deshabilitado | — |
| `disabledText` | `#7D786C` | Texto de un control deshabilitado | 3,57 sobre `disabledSurface` |
| `disabledBorder` | `#D8D2C5` | Borde de un control deshabilitado | — |
| `backdrop` | `textPrimary` al 40 % | Oscurece la pantalla detrás de un menú o diálogo propio, como el selector de unidad | — |

Los tres valores de una celda corresponden a `background`, `surface` y `surfaceSecondary`.

### Ajustes sobre la propuesta inicial

- **Texto oscuro sobre mostaza.** El blanco sobre `primary` da 1,93:1.
- **`primary` no sirve como texto ni como único indicador** (1,84:1 sobre `background`). Lo seleccionado se marca con borde `textPrimary` y un check.
- **`success` se oscurece** de `#65866B` (3,86:1 sobre `background`) a `#4F6E55`, del mismo tono.
- **`accent` es solo decorativo** (2,72:1): ni texto ni estados.
- **`border` no delimita controles** (1,43:1). Los campos y las opciones usan `borderStrong`.
- **`error` es un rojo** que se distingue del naranja de `accent`.
- `textSecondary`, `primaryPressed` y los tokens `disabled*` se han definido para esta paleta. El texto deshabilitado está exento en WCAG, pero se mantiene por encima de 3:1.

## Tipografía, espaciado y forma

- **Tipografía** (`ThemedText`):
  - `title`: 31 pt, negrita. Título de pantalla.
  - `heading`: 22 pt, seminegrita. Título de sección.
  - `default`: 16 pt.
  - `defaultBold`: 16 pt, seminegrita. Nombre de un elemento en una lista.
  - `small`: 14 pt, auxiliar.
  - `smallBold`: 14 pt, seminegrita.
  - `label`: 13 pt, seminegrita. Etiquetas y metadatos.

  No se desactiva el escalado de texto del sistema.
- **Espaciado** (`Spacing`): `xs` 4, `sm` 8, `md` 12, `lg` 16, `xl` 24 y `xxl` 32.
- **Radios** (`Radius`): `sm` 8, `md` 12, `lg` 16 y `xl` 24.
- **Controles:** botones y campos con altura mínima de 52 (`ControlHeight`), nunca fija, para que el texto grande no se recorte.
- **Tarjetas:** `surface` con un borde `border` de 1 pt y una sombra suave de un solo nivel (`CardShadow`). El blanco sobre el crema de `background` apenas se distingue: la primera versión, con un borde de 0,5 pt y sin sombra, hacía que las tarjetas desaparecieran en el teléfono y solo se viera texto apilado. No se usan sombras más marcadas.
- **Listas de categorías** (como la pestaña «Perfil»): una `Card` por categoría con un icono sobre `primary`, el nombre en `defaultBold`, el resumen en `small` y un chevron. Al presionar, el fondo pasa a `surfaceSecondary`.
- **Iconos:** `SymbolView` de `expo-symbols`, con SF Symbols en iOS y Material Symbols en Android, en el color de un token.

## Reglas de uso

- Los colores se leen con `useTheme()`, nunca con literales.
- Un error o un estado nunca se expresa solo con color: lleva texto y, en los mensajes, un icono (`Notice`).
- Los mensajes de error tienen `accessibilityRole="alert"`.
- Un control deshabilitado usa los tokens `disabled*`, no una opacidad.

## Consecuencias

- Las pantallas existentes se migraron sin cambiar su lógica, sus textos ni sus pruebas.
- La pestaña «Home» sigue siendo la pantalla de la plantilla y queda fuera del sistema hasta que se construya la pantalla principal.
- Para añadir el modo oscuro bastará con dar valores a `Colors.dark`, comprobar su contraste y volver a seguir el esquema del sistema en `useTheme()` y `app.json`.
