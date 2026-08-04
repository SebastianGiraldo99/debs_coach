import { z } from "zod"

import { prisma } from "@/lib/db/prisma"

/**
 * El historial de progreso por check-in (RF-017): la lista de "12 jul ·
 * Pagaste $780.000 · Avance 34%" del dashboard y la gráfica de progreso.
 *
 * Sale de `eventos` y no de `check_ins` porque el dato que se pinta es el
 * avance, y `Evento.progresoPct` es una columna hecha para eso —`CheckIn`
 * guarda el snapshot crudo del formulario, que es otra cosa—. De paso, es la
 * misma fuente que ya lee `lib/ia/contexto.ts` para el prompt: el usuario y el
 * modelo ven la misma historia.
 *
 * CONTRATO CON EL SPRINT 5: el flujo de check-in tiene que escribir su evento
 * con `progresoPct` y con este payload. Si cambia el nombre de un campo, esta
 * pantalla se queda en blanco sin romperse, que es justo por lo que el parseo
 * es tolerante y no lanza.
 */

const esquemaPayload = z.object({
  /** Cuánto abonó a deudas en el periodo. */
  pagado: z.number().finite().nonnegative().optional(),
  /** Deuda total al cerrar el check-in. Da el "bajó $X" de las cifras clave. */
  deudaTotal: z.number().finite().nonnegative().optional(),
})

export type PuntoCheckin = {
  id: string
  fecha: Date
  pago: number
  /** Porcentaje 0-100. `null` si el evento se guardó sin progreso calculado. */
  avance: number | null
  deudaTotal: number | null
}

/** Cuántos se traen. El dashboard pinta 4; la gráfica de progreso, todos. */
const LIMITE = 8

export async function leerHistorialCheckins(
  usuarioId: string,
  limite: number = LIMITE,
): Promise<PuntoCheckin[]> {
  const eventos = await prisma.evento.findMany({
    where: { usuarioId, tipo: "check_in" },
    orderBy: { createdAt: "desc" },
    take: limite,
    select: { id: true, createdAt: true, progresoPct: true, payload: true },
  })

  return eventos.map((evento) => {
    const payload = esquemaPayload.safeParse(evento.payload)
    const datos = payload.success ? payload.data : {}
    return {
      id: evento.id,
      fecha: evento.createdAt,
      pago: datos.pagado ?? 0,
      avance: evento.progresoPct === null ? null : Number(evento.progresoPct.toString()),
      deudaTotal: datos.deudaTotal ?? null,
    }
  })
}
