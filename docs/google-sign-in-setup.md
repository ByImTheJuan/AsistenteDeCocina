# Configurar el inicio de sesión con Google

Guía para dar de alta las credenciales del inicio de sesión con Google. No hace falta para usar la app: se puede crear una cuenta con email y contraseña sin nada de lo que se describe aquí.

## Cómo funciona

1. La app muestra el selector de cuentas nativo de Google y recibe un **ID token**.
2. La app envía ese token a `POST /auth/google`.
3. La API comprueba la firma, la caducidad y que el token va dirigido a ella (`GOOGLE_CLIENT_ID`), crea la cuenta si es el primer acceso y devuelve su propia sesión: un JWT de acceso de 15 minutos y un refresh token de un solo uso.

La API nunca recibe la contraseña de Google ni guarda tokens de Google. No hay ningún *client secret*: los client ID son identificadores públicos.

## Relación con las cuentas de email y contraseña

Hay una sola cuenta por email, y la contraseña y Google son dos métodos de acceso de esa misma cuenta.

- Si alguien entra con Google usando el email de una cuenta creada con contraseña, la cuenta queda vinculada a Google. La contraseña y las sesiones abiertas siguen funcionando: se puede entrar con cualquiera de los dos métodos.
- Una cuenta creada con Google no tiene contraseña. Añadirla, cambiarla o quitar un método se hará desde la gestión de la cuenta (US-002).

**Riesgo conocido:** el email de las cuentas con contraseña no se verifica. Si alguien se registra con el email de otra persona y esa persona entra después con Google, los dos tienen acceso a la misma cuenta. Desaparece cuando exista verificación de email.

## Credenciales necesarias

Se crean tres client ID de OAuth **en el mismo proyecto** de Google Cloud:

| Tipo | Para qué sirve | Dónde se configura |
|---|---|---|
| Aplicación web | Audiencia del ID token. Lo usan la app y la API. | `GOOGLE_CLIENT_ID` (API) y `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (app) |
| Android | Autoriza a la app Android por paquete y firma. | No se copia a ningún sitio |
| iOS | Autoriza a la app iOS por identificador. | `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` (app) |

## Pasos en Google Cloud

Los nombres de los menús de la consola cambian con frecuencia; lo importante son los valores.

1. Entra en <https://console.cloud.google.com> y crea un proyecto, por ejemplo «Asistente de Cocina».
2. Configura la pantalla de consentimiento de OAuth (*Google Auth Platform*):
   - Tipo de usuario: **Externo**.
   - Nombre de la app y correo de asistencia.
   - No hacen falta permisos adicionales: basta con los básicos (`openid`, `email`, `profile`).
   - Mientras la app esté en estado **Testing**, solo pueden iniciar sesión las cuentas añadidas como usuarios de prueba. Añade las tuyas.
3. Crea el client ID de tipo **Aplicación web**. No necesita orígenes ni URI de redirección. Copia el client ID.
4. Crea el client ID de tipo **Android**:
   - Nombre del paquete: `com.hyd.asistentedecocina`.
   - Huella SHA-1 del certificado de firma. Se obtiene con `eas credentials -p android` desde `apps/mobile`, una vez que EAS haya generado el almacén de claves (lo crea la primera build de Android).
5. Crea el client ID de tipo **iOS** con el identificador de paquete `com.hyd.asistentedecocina`. Copia el client ID.

## Dónde poner cada valor

**API** (`services/api/.env`):

```bash
GOOGLE_CLIENT_ID="<client ID de tipo Aplicación web>"
JWT_ACCESS_SECRET="<secreto aleatorio de al menos 32 caracteres>"
```

Genera el secreto con:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Usa un secreto distinto en cada entorno. Cambiarlo invalida los JWT de acceso emitidos; las sesiones se recuperan solas con el refresh token.

**App** (`apps/mobile/.env`):

```bash
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<client ID de tipo Aplicación web>
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<client ID de tipo iOS>
```

**Builds de EAS.** El archivo `.env` no se sube a EAS. Las mismas variables, junto con `EXPO_PUBLIC_API_URL`, deben existir en el entorno de EAS que use cada perfil de build; se crean con `eas env:set` o desde expo.dev.

`EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` se lee también al compilar: `apps/mobile/app.config.ts` deriva de él el esquema de URL que iOS necesita para volver a la app. Si falta, la build de iOS se genera sin ese esquema y el inicio de sesión no funcionará en iOS.

## Probarlo en un teléfono

El selector nativo de Google no está incluido en Expo Go: hace falta una **development build**.

1. `eas build --platform android --profile development` desde `apps/mobile` (consume una build del cupo mensual).
2. Registra en Google Cloud la huella SHA-1 de esa build (paso 4 de arriba).
3. Arranca la API y el servidor de desarrollo (`npm run start -w mobile`) con `EXPO_PUBLIC_API_URL` apuntando a la IP del ordenador.

iOS requiere además la suscripción a Apple Developer Program.

## Problemas habituales

| Síntoma | Causa probable |
|---|---|
| `DEVELOPER_ERROR` en Android | La huella SHA-1 o el nombre del paquete del client ID de Android no coinciden con la build instalada. |
| La API responde 401 en `/auth/google` | `GOOGLE_CLIENT_ID` de la API no es el mismo client ID web que usa la app. El log de la API indica el motivo del rechazo. |
| «Access blocked» al elegir cuenta | La cuenta no está en la lista de usuarios de prueba de la pantalla de consentimiento. |
| En iOS no vuelve a la app | Falta `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` al compilar la build. |
