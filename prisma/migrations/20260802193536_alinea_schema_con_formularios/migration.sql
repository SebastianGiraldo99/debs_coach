-- AlterEnum
BEGIN;
CREATE TYPE "CategoriaEgreso_new" AS ENUM ('impuestos', 'arriendo', 'servicios', 'mercado', 'transporte', 'salud', 'colegiaturas', 'otro');
ALTER TABLE "egresos" ALTER COLUMN "categoria" TYPE "CategoriaEgreso_new" USING ("categoria"::text::"CategoriaEgreso_new");
ALTER TYPE "CategoriaEgreso" RENAME TO "CategoriaEgreso_old";
ALTER TYPE "CategoriaEgreso_new" RENAME TO "CategoriaEgreso";
DROP TYPE "public"."CategoriaEgreso_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "CategoriaIngreso_new" AS ENUM ('salario', 'independiente', 'negocio', 'arriendo', 'pension', 'otro');
ALTER TABLE "ingresos" ALTER COLUMN "categoria" TYPE "CategoriaIngreso_new" USING ("categoria"::text::"CategoriaIngreso_new");
ALTER TYPE "CategoriaIngreso" RENAME TO "CategoriaIngreso_old";
ALTER TYPE "CategoriaIngreso_new" RENAME TO "CategoriaIngreso";
DROP TYPE "public"."CategoriaIngreso_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "TipoDeuda_new" AS ENUM ('tarjeta_credito', 'credito_vehiculo', 'credito_libre', 'credito_hipotecario', 'familiar', 'otro');
ALTER TABLE "deudas" ALTER COLUMN "tipo" TYPE "TipoDeuda_new" USING ("tipo"::text::"TipoDeuda_new");
ALTER TYPE "TipoDeuda" RENAME TO "TipoDeuda_old";
ALTER TYPE "TipoDeuda_new" RENAME TO "TipoDeuda";
DROP TYPE "public"."TipoDeuda_old";
COMMIT;

-- AlterTable
ALTER TABLE "deudas" ADD COLUMN     "nombre" TEXT NOT NULL,
ADD COLUMN     "pago_minimo" DECIMAL(15,2);

-- AlterTable
ALTER TABLE "egresos" ADD COLUMN     "descripcion" TEXT;

-- AlterTable
ALTER TABLE "ingresos" ADD COLUMN     "descripcion" TEXT;

