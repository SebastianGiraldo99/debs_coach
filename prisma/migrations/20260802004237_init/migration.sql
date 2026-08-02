-- CreateEnum
CREATE TYPE "Moneda" AS ENUM ('COP', 'USD');

-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('usuario', 'admin');

-- CreateEnum
CREATE TYPE "EstadoUsuario" AS ENUM ('pendiente', 'activo', 'bloqueado');

-- CreateEnum
CREATE TYPE "TipoDeuda" AS ENUM ('tarjeta_credito', 'credito', 'hipoteca', 'terceros', 'otro');

-- CreateEnum
CREATE TYPE "EstadoDeuda" AS ENUM ('activa', 'saldada');

-- CreateEnum
CREATE TYPE "CategoriaIngreso" AS ENUM ('salario', 'arriendo', 'negocio', 'intereses', 'otro');

-- CreateEnum
CREATE TYPE "CategoriaEgreso" AS ENUM ('impuestos', 'mercado', 'recibos', 'colegiaturas', 'hijos', 'otro');

-- CreateEnum
CREATE TYPE "EstadoObjetivo" AS ENUM ('activo', 'logrado', 'cancelado');

-- CreateEnum
CREATE TYPE "TipoEvento" AS ENUM ('check_in', 'deuda_pagada', 'deuda_nueva', 'ingreso_actualizado', 'egreso_actualizado', 'objetivo_creado', 'objetivo_logrado', 'ingreso_extra', 'plan_generado');

-- CreateEnum
CREATE TYPE "TriggerPlan" AS ENUM ('onboarding', 'check_in', 'ingreso_extra');

-- CreateEnum
CREATE TYPE "EstadoInvitacion" AS ENUM ('pendiente', 'usado', 'expirado');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "rol" "RolUsuario" NOT NULL DEFAULT 'usuario',
    "estado" "EstadoUsuario" NOT NULL DEFAULT 'pendiente',
    "ultimo_acceso" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "moneda_base" "Moneda" NOT NULL DEFAULT 'COP',

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "objetivos" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "intencion" TEXT NOT NULL,
    "estado" "EstadoObjetivo" NOT NULL DEFAULT 'activo',
    "editable_desde" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "objetivos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deudas" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "tipo" "TipoDeuda" NOT NULL,
    "monto_original" DECIMAL(15,2) NOT NULL,
    "monto_actual" DECIMAL(15,2) NOT NULL,
    "moneda" "Moneda" NOT NULL DEFAULT 'COP',
    "tasa_interes" DECIMAL(5,2),
    "estado" "EstadoDeuda" NOT NULL DEFAULT 'activa',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deudas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingresos" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "categoria" "CategoriaIngreso" NOT NULL,
    "monto_mensual" DECIMAL(15,2) NOT NULL,
    "moneda" "Moneda" NOT NULL DEFAULT 'COP',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ingresos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "egresos" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "categoria" "CategoriaEgreso" NOT NULL,
    "monto_mensual" DECIMAL(15,2) NOT NULL,
    "moneda" "Moneda" NOT NULL DEFAULT 'COP',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "egresos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingresos_extra" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "monto" DECIMAL(15,2) NOT NULL,
    "moneda" "Moneda" NOT NULL DEFAULT 'COP',
    "descripcion" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ingresos_extra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "check_ins" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "pagos_realizados" JSONB NOT NULL,
    "nuevas_deudas" JSONB NOT NULL,
    "ingresos_extra" JSONB NOT NULL,
    "respuesta_ia" TEXT NOT NULL,
    "plan_generado" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tasa_cop_usada" DECIMAL(15,6),

    CONSTRAINT "check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planes_ia" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "contenido" JSONB NOT NULL,
    "trigger" "TriggerPlan" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "planes_ia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "tipo" "TipoEvento" NOT NULL,
    "payload" JSONB NOT NULL,
    "progreso_pct" DECIMAL(5,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tasa_cop_usada" DECIMAL(15,6),

    CONSTRAINT "eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasas_cambio" (
    "id" TEXT NOT NULL,
    "moneda" "Moneda" NOT NULL,
    "fecha" DATE NOT NULL,
    "valor_cop" DECIMAL(15,6) NOT NULL,
    "fuente" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tasas_cambio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitaciones" (
    "id" TEXT NOT NULL,
    "email_destino" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "estado" "EstadoInvitacion" NOT NULL DEFAULT 'pendiente',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "tasas_cambio_moneda_fecha_key" ON "tasas_cambio"("moneda", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "invitaciones_token_key" ON "invitaciones"("token");

-- AddForeignKey
ALTER TABLE "objetivos" ADD CONSTRAINT "objetivos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deudas" ADD CONSTRAINT "deudas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingresos" ADD CONSTRAINT "ingresos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "egresos" ADD CONSTRAINT "egresos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingresos_extra" ADD CONSTRAINT "ingresos_extra_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planes_ia" ADD CONSTRAINT "planes_ia_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
