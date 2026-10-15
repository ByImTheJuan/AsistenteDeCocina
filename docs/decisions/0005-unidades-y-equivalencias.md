# 0005 — Unidades de medida y alimentos equivalentes

- **Estado:** aceptada
- **Fecha:** 2026-10-15

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
  | `PACKAGE` (envase: paquete, lata o bote) | propia | — |

  Añadir una unidad exige una migración y revisar las reglas de conversión.
- **Solo se convierte dentro de la misma magnitud.** 1,5 kg y 500 g se suman; 3 tomates y 200 g de tomate no. Las equivalencias entre peso, volumen y unidades (1 huevo ≈ 60 g, 1 l de leche ≈ 1030 g) dependen del alimento y del tamaño, y no tenemos una fuente fiable: se mantienen separadas, que es lo que pide el criterio para las equivalencias dudosas. La pizca y el envase no se convierten a nada, porque su contenido es desconocido.
- **Las reglas viven en la API** (`services/api/src/units/units.ts`), como funciones puras: `convert` devuelve `null` cuando no hay una conversión válida y `combineQuantities` agrupa por alimento y magnitud, suma en la unidad base y deja aparte lo incompatible. El resultado se expresa en g o ml, o en kg o l a partir de 1000, redondeado a 3 decimales.
- **Unidad sugerida por alimento** (`ingredients.defaultUnit`), sembrada por la migración `seed_ingredient_default_units`. La app la propone al registrar un alimento, pero no obliga a usarla.
- **Equivalentes = sinónimos.** La tabla `ingredient_aliases` asocia nombres alternativos (variantes regionales y plurales habituales: papa, banana, palta, huevos…) a un alimento del catálogo. El buscador encuentra el alimento por cualquiera de ellos y las cantidades se agrupan por el alimento del catálogo, así que dos sinónimos nunca generan dos líneas. Las sustituciones entre alimentos distintos (mozzarella por queso) son otra cosa y corresponden a US-017.

## Criterio y límites de los datos

Las unidades sugeridas y los sinónimos los ha elaborado el equipo de desarrollo y **no proceden de una fuente validada**.

- **Unidad sugerida:** un valor por categoría con excepciones.
  - Verduras y frutas en unidades, salvo las hojas, las setas, las legumbres frescas y las bayas, en gramos.
  - Carne, pescado, cereales, legumbres, frutos secos y especias en gramos, salvo las piezas que se cuentan (salchichas, pescado entero, pan).
  - Los líquidos en litros o mililitros, y el huevo y el yogur en unidades.

  Un error solo cambia la propuesta inicial del formulario.
- **Sinónimos:** la lista no es exhaustiva. Un sinónimo no puede coincidir con el nombre de otro alimento del catálogo ni apuntar a dos alimentos (`alias` es la clave primaria). Se han evitado los nombres ambiguos: «frijoles» o «porotos» no se asocian a ningún tipo de alubia concreto.

## Consecuencias

- US-006 guarda cada cantidad con una de estas unidades y usa `defaultUnit` como propuesta.
- US-014 y US-023 deben usar `combineQuantities` para comparar y sumar cantidades, y mostrar por separado lo que no se pueda combinar.
- Si en el futuro se añaden equivalencias entre magnitudes por alimento, deberán marcarse como aproximadas y no aplicarse sin revisión del usuario.
