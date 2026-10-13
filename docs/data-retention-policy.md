# Política de conservación y supresión de datos

Define qué ocurre con los datos de un usuario cuando elimina su cuenta. Es la política a la que se refiere US-002 y la que deben respetar las historias que añadan datos de usuario.

## Eliminación de la cuenta

La pide el propio usuario desde la pantalla de su cuenta, después de leer las consecuencias y confirmarlo. Si la cuenta tiene contraseña, debe introducirla.

El borrado es **inmediato y definitivo**. No hay periodo de gracia ni forma de recuperar la cuenta.

## Qué se borra

Todo lo que pertenece solo al usuario:

- La cuenta: nombre, email, avatar, contraseña (su hash) y vínculo con Google.
- Sus sesiones abiertas en todos los dispositivos.
- Sus datos privados: preferencias, alergias e intolerancias, objetivos, inventario, planes de comidas, listas de compra, favoritos y recetas no publicadas.

## Qué se conserva, sin autor

El contenido que el usuario hizo público y que otras personas pueden estar usando:

- Recetas publicadas.
- Reseñas y valoraciones.

Se conservan **anonimizadas**: dejan de estar asociadas a la cuenta y se muestran como de un usuario eliminado. Así no se rompen los favoritos, los planes ni las valoraciones medias de los demás.

## Qué no cubre el borrado

- Las copias de seguridad de la base de datos conservan los datos hasta que caducan según su propio calendario, que se definirá con el despliegue.
- Eliminar la cuenta no revoca el permiso concedido a la app en la cuenta de Google del usuario; puede retirarlo desde la configuración de su cuenta de Google.

## Reglas para el desarrollo

- Toda tabla nueva con datos de un usuario se relaciona con `users` con borrado en cascada (`onDelete: Cascade`), de modo que eliminar la cuenta la limpie sin código adicional.
- La excepción es el contenido público, cuya relación con el autor debe quedar en nulo al borrar la cuenta (`onDelete: SetNull`).
- Cada historia que añada datos de usuario incluye una prueba de integración que compruebe qué ocurre con ellos al eliminar la cuenta.

## Estado actual

Las tablas con datos de usuario son `users` (que incluye la dieta elegida), `refresh_tokens`, `ingredient_preferences` (alimentos que gustan o se prefieren evitar), `allergen_restrictions` e `ingredient_restrictions` (alergias e intolerancias), y todas se borran con la cuenta. `ingredients` e `ingredient_allergens` son el catálogo común, no contienen datos de ningún usuario y no se tocan. Las reglas sobre recetas y reseñas se aplicarán cuando se implementen esas historias.
