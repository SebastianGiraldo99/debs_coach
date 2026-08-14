import "dotenv/config"

import { prisma } from "@/lib/db/prisma"
import { hashearPassword } from "@/lib/auth/password"

/**
 * Monta el escenario de la prueba IDOR (RNF-005): dos cuentas reales, con
 * datos propios, para poder pedir desde la sesión de una los recursos de la
 * otra por su id verdadero.
 *
 * Ambas usan @local.test, así que `scripts/limpiar-datos-prueba.mts` se las
 * lleva con todo lo que cuelga de ellas.
 */

const CUENTAS = [
  { email: "atacante@local.test", nombre: "Ana Atacante", password: "idor-atacante-2026" },
  { email: "victima@local.test", nombre: "Beto Victima", password: "idor-victima-2026" },
]

const salida: Record<string, unknown> = {}

for (const cuenta of CUENTAS) {
  await prisma.usuario.deleteMany({ where: { email: cuenta.email } })

  const usuario = await prisma.usuario.create({
    data: {
      nombre: cuenta.nombre,
      email: cuenta.email,
      passwordHash: await hashearPassword(cuenta.password),
      estado: "activo",
      monedaBase: "COP",
      onboardingCompletadoEn: new Date(),
      objetivos: {
        create: [
          {
            intencion: `Intencion original de ${cuenta.nombre}`,
            montoObjetivo: 40_000_000,
            montoAcumulado: 6_000_000,
            editableDesde: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          },
        ],
      },
      ingresos: {
        create: [{ descripcion: `Salario de ${cuenta.nombre}`, categoria: "salario", montoMensual: 4_200_000 }],
      },
      egresos: {
        create: [
          { descripcion: "Retención en la fuente", categoria: "impuestos", montoMensual: 400_000 },
          { descripcion: "Arriendo", categoria: "arriendo", montoMensual: 1_500_000 },
        ],
      },
      deudas: {
        create: [
          {
            nombre: `Tarjeta de ${cuenta.nombre}`,
            tipo: "tarjeta_credito",
            montoOriginal: 8_200_000,
            montoActual: 8_200_000,
            tasaInteres: 32,
            pagoMinimo: 520_000,
          },
        ],
      },
      ingresosExtra: {
        create: [
          {
            monto: 3_333_333,
            moneda: "COP",
            descripcion: `Bono secreto de ${cuenta.nombre}`,
            fecha: new Date("2026-08-01T00:00:00Z"),
          },
        ],
      },
    },
    select: {
      id: true,
      objetivos: { select: { id: true } },
      ingresos: { select: { id: true } },
      deudas: { select: { id: true } },
      ingresosExtra: { select: { id: true } },
    },
  })

  salida[cuenta.email] = {
    password: cuenta.password,
    usuarioId: usuario.id,
    objetivoId: usuario.objetivos[0].id,
    ingresoId: usuario.ingresos[0].id,
    deudaId: usuario.deudas[0].id,
    ingresoExtraId: usuario.ingresosExtra[0].id,
  }
}

console.log(JSON.stringify(salida, null, 2))

await prisma.$disconnect()
