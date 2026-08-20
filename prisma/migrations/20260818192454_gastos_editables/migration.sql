-- AlterEnum
ALTER TYPE "TipoEvento" ADD VALUE 'egreso_extra';

-- CreateTable
CREATE TABLE "egresos_extra" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "monto" DECIMAL(15,2) NOT NULL,
    "moneda" "Moneda" NOT NULL DEFAULT 'COP',
    "descripcion" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "egresos_extra_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "egresos_extra_usuario_id_fecha_idx" ON "egresos_extra"("usuario_id", "fecha");

-- AddForeignKey
ALTER TABLE "egresos_extra" ADD CONSTRAINT "egresos_extra_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

