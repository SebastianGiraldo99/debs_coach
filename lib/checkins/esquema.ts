import { z } from "zod"

import { esquemaDeuda, esquemaIngresoExtra } from "@/lib/finanzas/esquemas"

/**
 * Lo que el flujo de check-in manda al servidor: las tres preguntas de RF-029
 * —qué pagaste, abriste deudas nuevas, tuviste ingresos extra— más lo que
 * apartaste para cada meta con monto.
 *
 * Ese cuarto bloque no es una cuarta pregunta: es el detalle de la tercera.
 * El dinero que entra de más va a algún sitio, y preguntarlo aquí es lo único
 * que permite medir el avance de una meta de acumulación (RF-032). Sin él,
 * `Objetivo.montoAcumulado` se quedaría en cero para siempre.
 *
 * Los ids llegan del cliente, así que TODA consulta que los use lleva además
 * el `usuarioId` de la sesión. Ver el handler.
 */

const MAX_FILAS = 50

export const esquemaCheckin = z.object({
  /** Abonos del periodo, uno por deuda. Las que no pagó no vienen. */
  pagos: z
    .array(
      z.object({
        deudaId: z.uuid(),
        monto: z.number().finite().positive("Los abonos tienen que ser mayores que cero."),
      }),
    )
    .max(MAX_FILAS),

  /** Deudas que abrió desde el último check-in (RF-030). */
  nuevasDeudas: z.array(esquemaDeuda).max(MAX_FILAS),

  /** Ingresos extraordinarios que no había registrado todavía. */
  ingresosExtra: z.array(esquemaIngresoExtra).max(MAX_FILAS),

  /** Lo apartado en el periodo para cada meta que tenga monto. */
  aportes: z
    .array(
      z.object({
        objetivoId: z.uuid(),
        monto: z.number().finite().positive("Los aportes tienen que ser mayores que cero."),
      }),
    )
    .max(MAX_FILAS),
})

export type CuerpoCheckin = z.infer<typeof esquemaCheckin>
