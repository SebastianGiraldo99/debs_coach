import { prisma } from "@/lib/db/prisma"
import {
  construirContexto,
  ContextoIncompletoError,
  type OpcionesContexto,
  type Trigger,
} from "@/lib/ia/contexto"
import { generarPlan } from "@/lib/ia/motor"
import { leerPlan, normalizarPlan, type OrigenPlan, type PlanGuardado } from "@/lib/ia/schema"

/**
 * Generar un plan y dejarlo escrito: el único punto por el que se dispara el
 * Motor IA (RF-034).
 *
 * Es una función de servidor y no solo un endpoint porque los otros dos
 * disparadores —check-in e ingreso extra— la van a llamar desde su propia
 * transacción en los Sprints 4 y 5. Que ellos tengan que hacerse un fetch a
 * su propia API sería una vuelta innecesaria.
 *
 * El `usuarioId` es un parámetro y jamás se lee del cuerpo de una petición:
 * quien llama es responsable de sacarlo de la sesión.
 */

export type ResultadoGeneracion =
  | { ok: true; planId: string; plan: PlanGuardado; origen: OrigenPlan; reutilizado?: true }
  | { ok: false; mensaje: string }

/**
 * Ventana en la que un segundo intento devuelve el plan recién hecho en vez
 * de generar otro. El caso real es el doble envío —doble clic, un efecto que
 * corre dos veces en desarrollo—, que si no cuesta dos llamadas al proveedor
 * y deja dos planes casi idénticos en el historial.
 */
const VENTANA_REPETICION_MS = 20_000

export async function generarYGuardarPlan(
  usuarioId: string,
  trigger: Trigger,
  ingresoExtraId?: string,
  opciones: OpcionesContexto = {},
): Promise<ResultadoGeneracion> {
  const reciente = await prisma.planIa.findFirst({
    where: {
      usuarioId,
      trigger,
      createdAt: { gte: new Date(Date.now() - VENTANA_REPETICION_MS) },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, contenido: true },
  })

  if (reciente) {
    const plan = leerPlan(reciente.contenido)
    if (plan) {
      return { ok: true, planId: reciente.id, plan, origen: plan.origen, reutilizado: true }
    }
  }

  let contexto
  try {
    contexto = await construirContexto(usuarioId, trigger, ingresoExtraId, opciones)
  } catch (error) {
    if (error instanceof ContextoIncompletoError) {
      return { ok: false, mensaje: error.message }
    }
    throw error
  }

  const resultado = await generarPlan(contexto)

  const plan = normalizarPlan(resultado.plan, {
    origen: resultado.origen,
    cifras: {
      moneda: contexto.moneda,
      capacidadReal: contexto.capacidad.capacidadReal,
      deudaTotal: contexto.capacidad.deudaTotal,
      pagosMinimos: contexto.capacidad.pagosMinimos,
    },
  })

  // Plan y evento se escriben juntos: un plan sin su evento rompe el
  // historial del dashboard, que es lo que da la sensación de continuidad.
  const planId = await prisma.$transaction(async (tx) => {
    const guardado = await tx.planIa.create({
      data: { usuarioId, trigger, contenido: plan },
      select: { id: true },
    })

    await tx.evento.create({
      data: {
        usuarioId,
        tipo: "plan_generado",
        payload: {
          planIaId: guardado.id,
          trigger,
          origen: plan.origen,
          motivo: resultado.motivo ?? null,
          // Distingue el plan del check-in del que se pidió a mano después
          // (RF-068). Los dos llevan trigger `check_in`.
          ...(opciones.recalculo && { recalculo: true }),
        },
      },
    })

    return guardado.id
  })

  return { ok: true, planId, plan, origen: plan.origen }
}
