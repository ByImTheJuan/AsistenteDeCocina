-- Base de datos aislada para pruebas de integración y base "shadow" que
-- `prisma migrate dev` necesita para calcular las migraciones.
CREATE DATABASE IF NOT EXISTS cocina_test;
GRANT ALL PRIVILEGES ON cocina_test.* TO 'cocina'@'%';
GRANT CREATE, ALTER, DROP, REFERENCES ON *.* TO 'cocina'@'%';
FLUSH PRIVILEGES;
