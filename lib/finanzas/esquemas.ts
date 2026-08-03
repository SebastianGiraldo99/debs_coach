import { z } from "zod"

import {
  categoriasEgreso,
  categoriasIngreso,
  tiposDeuda,
} from "@/lib/finanzas/etiquetas"

/**
 * Validación de los datos financieros que entra por API.
 *
 * Los enums salen de `lib/finanzas/etiquetas`, que a su vez los deriva de
 * `@prisma/client`: así el schema de la base es la única fuente de verdad y
 * no hay una tercera lista que se desincronice.
 *
 * Todos los mensajes van en español y en el tono de DIRECTRICES_DISENO §19.
 * Sin ellos, zod responde en inglés y con los valores internos del enum
 * (`"credito_libre"|"familiar"…`), que no significan nada para el usuario.
 */

/** Tope defensivo. Un billón de pesos no es un dato, es un dedo pegado al 0. */
const MONTO_MAXIMO = 1_000_000_000_000

const monto = z
  .number()
  .finite()
  .nonnegative("Los montos no pueden ser negativos.")
  .max(MONTO_MAXIMO)

export const esquemaDeuda = z.object({
  nombre: z.string().trim().min(1, "Ponle un nombre a la deuda.").max(80),
  tipo: z.enum(tiposDeuda as [string, ...string[]], {
    error: "Elige qué tipo de deuda es.",
  }),
  saldo: monto,
  // La tasa efectiva anual se pide como porcentaje (32 = 32%), no como
  // fracción. El tope de 200 deja pasar el gota a gota colombiano sin
  // aceptar un 3200 por dedazo.
  tasaEA: z.number().finite().min(0).max(200).nullable().optional(),
  pagoMinimo: monto.nullable().optional(),
})

export const esquemaIngreso = z.object({
  descripcion: z.string().trim().max(80).optional(),
  categoria: z.enum(categoriasIngreso as [string, ...string[]], {
    error: "Elige de dónde viene este ingreso.",
  }),
  monto,
})

export const esquemaEgreso = z.object({
  descripcion: z.string().trim().max(80).optional(),
  categoria: z.enum(categoriasEgreso as [string, ...string[]], {
    error: "Elige a qué categoría pertenece este gasto.",
  }),
  monto,
})

/**
 * Las listas admiten estar vacías: no todo el mundo tiene deudas, y bloquear
 * el paso obligaría a inventarse una. El tope de 50 evita que un cliente
 * manipulado meta miles de filas de una sentada.
 */
export const esquemaListaDeudas = z.object({
  deudas: z.array(esquemaDeuda).max(50),
})

export const esquemaListaIngresos = z.object({
  ingresos: z.array(esquemaIngreso).max(50),
})

export const esquemaListaEgresos = z.object({
  egresos: z.array(esquemaEgreso).max(50),
})

export const esquemaIntencion = z.object({
  intencion: z
    .string()
    .trim()
    .min(5, "Cuéntanos un poco más sobre lo que quieres lograr.")
    .max(280),
})

export const esquemaMoneda = z.object({
  monedaBase: z.enum(["COP", "USD"]),
})
