# 0001 — Estructura del repositorio y gestor de paquetes

- **Estado:** aceptada
- **Fecha:** 2026-10-12

## Contexto

El repositorio contiene dos aplicaciones TypeScript (cliente Expo y API NestJS) que evolucionan juntas en cada historia de usuario y comparten un único pipeline de CI.

## Decisión

- **npm workspaces** con un único `package-lock.json` en la raíz: `apps/mobile` (workspace `mobile`) y `services/api` (workspace `api`). npm ya forma parte del entorno y Expo detecta los workspaces sin configuración adicional de Metro.
- **Sin `packages/shared`** hasta que exista un contrato compartido real entre cliente y API.
- **Node.js 24** (`.nvmrc`, `engines`).
- `overrides` de `react` y `react-dom` en la raíz, fijados a la versión que exige el SDK de Expo, para garantizar una única copia de React en todo el árbol.

## Consecuencias

- Los comandos se lanzan desde la raíz (`npm run <script> -w mobile|api`) y el CI hace un solo `npm ci`.
- Las dependencias de la app móvil se añaden con `npx expo install` desde `apps/mobile`, que resuelve versiones compatibles con el SDK.
- Al actualizar el SDK de Expo hay que actualizar a la vez los `overrides` de React y `test-renderer` (su `react-reconciler` debe corresponder a la versión de React).

## Desviaciones respecto a lo previsto

- **Pruebas de la API con Vitest y lint con oxlint.** Son los valores por defecto del generador de NestJS 12 (proyecto ESM). `CLAUDE.md` exige Jest + React Native Testing Library solo para la aplicación móvil, donde sí se usan.
- **Prisma 7.10.0 fijado de forma exacta.** El dist-tag `latest` de npm apuntaba a `8.0.0-rc`; se evita la versión candidata.
- **`overrides` de `mysql2` y `deepmerge-ts`.** La CLI de Prisma 7.10.0 fija versiones exactas con avisos `high` conocidos; se fuerzan las versiones corregidas. El CI valida que `prisma validate` y `prisma generate` siguen funcionando. Retirar los overrides cuando Prisma actualice esas dependencias.
- **Auditoría de seguridad por niveles.** El conjunto de herramientas de compilación de Expo/Metro arrastra avisos `high` sin corrección publicada (`node-forge`, `braces`) que no se empaquetan en la app. El CI bloquea con `high` en las dependencias de producción de la API y con `critical` en todo el árbol, y publica el informe completo en el resumen del job.
