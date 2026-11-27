import { z } from "zod"

import { tiposDeuda } from "@/lib/finanzas/etiquetas"
import { esquemaDeuda } from "@/lib/finanzas/esquemas"

export const MAXIMA_CONTRASENA_EXTRACTO = 256
export const MAXIMO_EXTRACTO_BYTES = 1024 * 1024

export const esquemaExtracto = z.object({
  nombre: esquemaDeuda.shape.nombre.nullable(),
  tipo: z.enum(tiposDeuda).nullable(),
  moneda: z.enum(["COP", "USD", "otra", "multiple"]).nullable(),
  saldo: esquemaDeuda.shape.saldo.nullable(),
  pagoMinimo: esquemaDeuda.shape.pagoMinimo.unwrap(),
  tasaEA: esquemaDeuda.shape.tasaEA.unwrap(),
})

export type DatosExtracto = z.infer<typeof esquemaExtracto>
