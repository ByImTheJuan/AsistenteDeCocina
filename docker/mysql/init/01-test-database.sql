-- Base de datos aislada para pruebas de integración y base "shadow" que
-- `prisma migrate dev` necesita para calcular las migraciones.
CREATE DATABASE IF NOT EXISTS cocina_test;
GRANT ALL PRIVILEGES ON cocina_test.* TO 'cocina'@'%';
-- La base shadow se crea con un nombre aleatorio, así que los permisos son
-- globales. Incluyen lectura y escritura porque algunas migraciones modifican
-- o insertan datos, y Prisma las reproduce enteras en la shadow.
GRANT CREATE, ALTER, DROP, REFERENCES, INDEX, SELECT, INSERT, UPDATE, DELETE ON *.* TO 'cocina'@'%';
FLUSH PRIVILEGES;
