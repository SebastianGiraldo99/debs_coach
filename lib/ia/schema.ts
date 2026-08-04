import { z } from "zod"

import type { Moneda } from "@/lib/formato"

/**
 * El contrato del plan: lo único que la app acepta como salida del Motor IA.
 *
 * La forma NO es la que describe `docs/plan.md` (`mensaje_motivacional`,
 * `plan_pagos[]`…). Es la que ya renderizan `components/dashboard/` sobre
 * `lib/mock/plan.ts`: `siguientePaso`, `pasos[]`, `mensaje`. El mock es el
 * contrato visual y las vistas no se rehacen, así que es el JSON el que se
 * adapta a la pantalla y no al revés.
 *
 * Diferencia deliberada con la propuesta del plan: la IA no devuelve
 * `plan_pagos` con cifras por deuda. Devuelve prosa accionable —"Abona
 * $850.000 a la Tarjeta Visa"— porque es lo que el dashboard muestra, y una
 * cifra suelta en un campo aparte sería un segundo número que mantener
 * coherente con el texto. Las cifras duras (capacidad, deuda total) salen de
 * `calcularCapacidadReal`, no del modelo: no se le pide aritmética a algo que
 * la aproxima.
 */

/** Sube cuando el shape cambie de forma incompatible. Ver `leerPlan`. */
export const VERSION_PLAN = 1

/** Tope de pasos además del siguiente. Un plan de 12 puntos no se ejecuta. */
const MAX_PASOS = 4

const esquemaPaso = z.object({
  accion: z.string().trim().min(1).max(180),
  porque: z.string().trim().min(1).max(320),
})

/**
 * Un texto opcional donde el modelo se toma libertades: a veces omite la
 * clave, a veces manda `""`, a veces `"ninguna"`. Todo eso es "sin alerta".
 */
function textoOpcional(max: number) {
  return z.preprocess((valor) => {
    if (typeof valor !== "string") return valor ?? null
    const limpio = valor.trim()
    if (limpio === "" || limpio.toLowerCase() === "null" || limpio.toLowerCase() === "ninguna") {
      return null
    }
    return limpio
  }, z.string().max(max).nullable())
}

/**
 * Meses hasta la libertad financiera. Se admite `"14"` o `14.3` porque llegan
 * así de vez en cuando y descartar el plan entero por el formato de un número
 * sería desproporcionado; lo que no se admite es un valor absurdo.
 */
const esquemaMeses = z.preprocess((valor) => {
  if (valor === null || valor === undefined || valor === "") return null
  const numero = typeof valor === "string" ? Number(valor.replace(/[^\d.-]/g, "")) : valor
  return typeof numero === "number" && Number.isFinite(numero) ? Math.round(numero) : numero
}, z.number().int().min(0).max(600).nullable())

/** Lo que se le exige a la respuesta cruda del modelo. */
export const esquemaRespuestaIa = z.object({
  siguientePaso: esquemaPaso,
  pasos: z.array(esquemaPaso).max(MAX_PASOS),
  mesesLibertad: esquemaMeses,
  mensaje: z.object({
    titulo: z.string().trim().min(1).max(90),
    cuerpo: z.string().trim().min(1).max(600),
  }),
  alerta: textoOpcional(240),
})

export type RespuestaIa = z.infer<typeof esquemaRespuestaIa>

/**
 * Cifras del momento en que se generó el plan. Se congelan dentro del plan
 * —no se releen— porque el consejo se dio sobre estos números: mostrarlo
 * meses después junto a la capacidad de hoy convertiría un plan coherente en
 * una contradicción.
 */
export type CifrasPlan = {
  moneda: Moneda
  capacidadReal: number
  deudaTotal: number
  pagosMinimos: number
}

export type PasoPlan = {
  id: string
  accion: string
  porque: string
}

/**
 * `origen` distingue el plan del modelo del que calcula la app sola. No es
 * telemetría: si la IA no respondió, el usuario ve un plan igual de válido
 * pero más conservador, y quien depure un caso raro necesita saber cuál vio.
 */
export type OrigenPlan = "ia" | "local"

/** Lo que se guarda en `planes_ia.contenido` y lee el dashboard. */
export type PlanGuardado = {
  version: number
  generadoEn: string
  origen: OrigenPlan
  cifras: CifrasPlan
  siguientePaso: Omit<PasoPlan, "id">
  pasos: PasoPlan[]
  mesesLibertad: number | null
  mensaje: { titulo: string; cuerpo: string }
  alerta: string | null
}

/**
 * Numeración de los pasos: el siguiente paso es el 1 aunque viva en su propio
 * campo, así que la lista arranca en `paso_02`. Coincide con `lib/mock/plan.ts`
 * a propósito — conectar la pantalla debe ser cambiar el import, nada más.
 */
export function normalizarPlan(
  respuesta: RespuestaIa,
  datos: { origen: OrigenPlan; cifras: CifrasPlan; generadoEn?: Date },
): PlanGuardado {
  const fecha = datos.generadoEn ?? new Date()
  return {
    version: VERSION_PLAN,
    generadoEn: fecha.toISOString().slice(0, 10),
    origen: datos.origen,
    cifras: datos.cifras,
    siguientePaso: respuesta.siguientePaso,
    pasos: respuesta.pasos.map((paso, indice) => ({
      id: `paso_${String(indice + 2).padStart(2, "0")}`,
      ...paso,
    })),
    mesesLibertad: respuesta.mesesLibertad,
    mensaje: respuesta.mensaje,
    alerta: respuesta.alerta,
  }
}

const esquemaPlanGuardado = z.object({
  version: z.number().int(),
  generadoEn: z.string(),
  origen: z.enum(["ia", "local"]),
  cifras: z.object({
    moneda: z.enum(["COP", "USD"]),
    capacidadReal: z.number(),
    deudaTotal: z.number(),
    pagosMinimos: z.number(),
  }),
  siguientePaso: esquemaPaso,
  pasos: z.array(esquemaPaso.extend({ id: z.string() })),
  mesesLibertad: z.number().int().nullable(),
  mensaje: z.object({ titulo: z.string(), cuerpo: z.string() }),
  alerta: z.string().nullable(),
})

/**
 * Lee un plan de la columna `Json`. Devuelve null en vez de lanzar: un plan
 * viejo con otro shape no puede tumbar el dashboard entero, y la pantalla ya
 * tiene que saber pintar "todavía no tienes plan".
 */
export function leerPlan(contenido: unknown): PlanGuardado | null {
  const resultado = esquemaPlanGuardado.safeParse(contenido)
  if (!resultado.success) return null
  if (resultado.data.version > VERSION_PLAN) return null
  return resultado.data as PlanGuardado
}
