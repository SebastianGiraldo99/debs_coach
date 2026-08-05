-- AlterTable
ALTER TABLE "objetivos" ADD COLUMN     "monto_acumulado" DECIMAL(15,2) NOT NULL DEFAULT 0,
ADD COLUMN     "monto_objetivo" DECIMAL(15,2);

