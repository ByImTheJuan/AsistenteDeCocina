# 0005 — Unidades de medida y alimentos equivalentes

- **Estado:** aceptada
- **Fecha:** 2026-10-15 (revisada el mismo día con US-006: sin envase y con unidades por alimento)

## Contexto

US-044 pide que la aplicación reconozca ingredientes equivalentes y sus unidades para que el inventario, las recetas y la lista de compra no mezclen cantidades incompatibles. Es la base de US-006 (inventario), US-014 (recetas según el inventario) y US-023 (lista de compra). Hasta ahora el catálogo de ingredientes no tenía unidades.

El alcance se acordó con el propietario antes de implementar y está en el issue #62.

## Decisión

- **Unidades como enum** (`Unit`), con una lista corta y estable:

  | Unidad | Magnitud | Equivale a |
  |---|---|---|
  | `GRAM` (g) | masa | unidad base |
  | `KILOGRAM` (kg) | masa | 1000 g |
  | `MILLILITER` (ml) | volumen | unidad base |
  | `LITER` (l) | volumen | 1000 ml |
  | `TABLESPOON` (cucharada) | volumen | 15 ml |
  | `TEASPOON` (cucharadita) | volumen | 5 ml |
  | `PIECE` (unidades) | recuento | — |
  | `PINCH` (pizca) | propia | — |

  Añadir una unidad exige una migración y revisar las reglas de conversión. El envase (paquete, lata o bote) se descartó al revisar US-006: su contenido es desconocido y no dice nada útil de lo que hay en casa.
- **Cada alimento tiene una medida** (`ingredients.measure`), que decide en qué unidades se registra en casa. El inventario solo acepta esas unidades (`unit_not_allowed`), y la app solo ofrece esas:

  | Medida | Unidades | Ejemplos |
  |---|---|---|
  | `WEIGHT` | g, kg | carne, pescado, arroz, legumbres, quesos, especias, hojas, bayas |
  | `VOLUME` | ml, l | leche, nata, aceite, vinagre, caldos, bebidas vegetales, vino |
  | `COUNT` | unidades | huevo, yogur, tortillas de trigo |
  | `COUNT_OR_WEIGHT` | unidades, g, kg | verduras y frutas, salchichas, pescado entero, pan |

  **Cucharada, cucharadita y pizca no pertenecen a ninguna medida:** sirven para las recetas, no para describir lo que hay en la cocina.
- **Solo se convierte dentro de la misma magnitud.** 1,5 kg y 500 g se suman; 3 tomates y 200 g de tomate no. Las equivalencias entre peso, volumen y unidades (1 huevo ≈ 60 g, 1 l de leche ≈ 1030 g) dependen del alimento y del tamaño, y no tenemos una fuente fiable: se mantienen separadas, que es lo que pide el criterio para las equivalencias dudosas. La pizca no se convierte a nada, porque su contenido es desconocido.
- **Las reglas viven en la API** (`services/api/src/units/units.ts`), como funciones puras: `convert` devuelve `null` cuando no hay una conversión válida y `combineQuantities` agrupa por alimento y magnitud, suma en la unidad base y deja aparte lo incompatible. El resultado se expresa en g o ml, o en kg o l a partir de 1000, redondeado a 3 decimales.
- **Unidad sugerida por alimento** (`ingredients.defaultUnit`), sembrada por la migración `seed_ingredient_default_units`. Siempre es una de las unidades de su medida (lo comprueba una prueba). La app la propone al registrar un alimento, y se puede elegir otra de su medida.
- **Equivalentes = sinónimos.** La tabla `ingredient_aliases` asocia nombres alternativos (variantes regionales y plurales habituales: papa, banana, palta, huevos…) a un alimento del catálogo. El buscador encuentra el alimento por cualquiera de ellos y las cantidades se agrupan por el alimento del catálogo, así que dos sinónimos nunca generan dos líneas. Las sustituciones entre alimentos distintos (mozzarella por queso) son otra cosa y corresponden a US-017.

## Criterio y límites de los datos

Las medidas, las unidades sugeridas y los sinónimos los ha elaborado el equipo de desarrollo y **no proceden de una fuente validada**.

- **Medida** (migración `seed_ingredient_measures`): verduras y frutas, por unidades o peso; el resto, por peso. Las excepciones son las hojas, setas, legumbres frescas, aceitunas, bayas y frutas secas, solo por peso; los embutidos que se cuentan, el pescado entero y el pan, por unidades o peso; el huevo, el yogur y las tortillas, solo por unidades; y los líquidos, por volumen.
- **Unidad sugerida:** un valor por categoría con excepciones.
  - Verduras y frutas en unidades, salvo las hojas, las setas, las legumbres frescas y las bayas, en gramos.
  - Carne, pescado, cereales, legumbres, frutos secos y especias en gramos, salvo las piezas que se cuentan (salchichas, pescado entero, pan).
  - Los líquidos en litros o mililitros, y el huevo y el yogur en unidades.

  Un error en la unidad sugerida solo cambia la propuesta inicial del formulario. Un error en la medida, en cambio, impide usar una unidad razonable, así que conviene revisarla. Se corrige con otra migración.
- **Sinónimos:** la lista no es exhaustiva. Un sinónimo no puede coincidir con el nombre de otro alimento del catálogo ni apuntar a dos alimentos (`alias` es la clave primaria). Se han evitado los nombres ambiguos: «frijoles» o «porotos» no se asocian a ningún tipo de alubia concreto.

## Consecuencias

- US-006 guarda cada cantidad con una de estas unidades y usa `defaultUnit` como propuesta.
- US-014 y US-023 deben usar `combineQuantities` para comparar y sumar cantidades, y mostrar por separado lo que no se pueda combinar.
- Si en el futuro se añaden equivalencias entre magnitudes por alimento, deberán marcarse como aproximadas y no aplicarse sin revisión del usuario.
