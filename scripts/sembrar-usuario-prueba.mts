import "dotenv/config"

import { prisma } from "../lib/db/prisma.ts"
import { hashearPassword } from "../lib/auth/password.ts"

/**
 * Crea un usuario de prueba con datos financieros completos, para verificar el
 * dashboard contra la base real sin pasar por las cinco pantallas del
 * onboarding a mano.
 *
 * Usa el dominio `@local.test` (RFC 2606), así que
 * `scripts/limpiar-datos-prueba.mts` lo borra después con todo lo que cuelga
 * de él por el `onDelete: Cascade`.
 *
 * Uso:
 *   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/sembrar-usuario-prueba.mts
 */

const EMAIL = "dashboard@local.test"
const PASSWORD = "prueba-dashboard-2026"

await prisma.usuario.deleteMany({ where: { email: EMAIL } })

const usuario = await prisma.usuario.create({
  data: {
    nombre: "Camila Restrepo",
    email: EMAIL,
    passwordHash: await hashearPassword(PASSWORD),
    estado: "activo",
    monedaBase: "COP",
    onboardingCompletadoEn: new Date(),
    objetivos: {
      create: [
        {
          intencion: "Quiero saldar mis deudas lo más rápido posible",
          editableDesde: new Date(),
        },
        {
          intencion: "Quiero ahorrar para la cuota inicial de un apartamento",
          editableDesde: new Date(),
        },
      ],
    },
    ingresos: {
      create: [
        { descripcion: "Salario en la agencia", categoria: "salario", montoMensual: 4_200_000 },
        { descripcion: "Clases de diseño", categoria: "independiente", montoMensual: 600_000 },
      ],
    },
    egresos: {
      create: [
        { descripcion: "Retención en la fuente", categoria: "impuestos", montoMensual: 400_000 },
        { descripcion: "Arriendo", categoria: "arriendo", montoMensual: 1_500_000 },
        { descripcion: "Mercado", categoria: "mercado", montoMensual: 800_000 },
        { descripcion: "Servicios", categoria: "servicios", montoMensual: 400_000 },
      ],
    },
    deudas: {
      create: [
        {
          nombre: "Tarjeta Visa",
          tipo: "tarjeta_credito",
          montoOriginal: 8_200_000,
          montoActual: 8_200_000,
          tasaInteres: 32,
          pagoMinimo: 520_000,
        },
        {
          nombre: "Crédito del carro",
          tipo: "credito_vehiculo",
          montoOriginal: 4_900_000,
          montoActual: 4_900_000,
          tasaInteres: 19,
          pagoMinimo: 610_000,
        },
        {
          nombre: "Préstamo de mi hermano",
          tipo: "familiar",
          montoOriginal: 1_500_000,
          montoActual: 1_500_000,
          pagoMinimo: 200_000,
        },
      ],
    },
  },
  select: { id: true },
})

console.log(`Usuario  : ${EMAIL}`)
console.log(`Password : ${PASSWORD}`)
console.log(`Id       : ${usuario.id}`)

await prisma.$disconnect()
