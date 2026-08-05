import { prisma } from "@/lib/db/prisma"
import { calcularCapacidadReal, type Capacidad } from "@/lib/finanzas/capacidad"
import type { Moneda } from "@/lib/formato"
import type { TipoDeuda } from "@/lib/finanzas/etiquetas"

/**
 * El contexto estructurado que exige RF-036: todo lo que el Motor IA sabe del
 * usuario, armado desde la base y nunca desde el cliente.
 *
 * Aquí está la mitad de la seguridad del Sprint: el endpoint recibe un
 * `trigger` y, como mucho, el id de un ingreso extra. Ni una cadena de texto
 * del usuario llega al prompt sin haber pasado antes por la base con su
 * `usuarioId` de sesión (RF-035).
 */

export type Trigger = "onboarding" | "check_in" | "ingreso_extra"

export type DeudaContexto = {
  nombre: string
  tipo: TipoDeuda
  montoActual: number
  tasaInteres: number | null
  pagoMinimo: number | null
}

/**
 * Un objetivo tal como lo lee el modelo. El monto es opcional a propósito: la
 * mayoría de las intenciones no se miden en pesos, y las que sí —"la cuota
 * inicial de un apartamento"— solo tienen cifra porque la persona la escribió.
 */
export type ObjetivoContexto = {
  intencion: string
  montoObjetivo: number | null
  montoAcumulado: number
}

export type ContextoFinanciero = {
  nombre: string
  moneda: Moneda
  /** La intención principal (RF-037): el objetivo activo más antiguo. */
  intencion: string
  /** Todos los objetivos activos, el principal primero. Máximo 3 (RF-022). */
  objetivos: ObjetivoContexto[]
  capacidad: Capacidad
  deudas: DeudaContexto[]
  historial: { tipo: string; progresoPct: number | null; fecha: Date }[]
  trigger: Trigger
  ingresoExtra?: { monto: number; descripcion: string }
}

/** Últimos eventos que se le muestran al modelo. Más es ruido y más tokens. */
const EVENTOS_HISTORIAL = 5

function aNumero(valor: { toString(): string } | null | undefined): number | null {
  return valor === null || valor === undefined ? null : Number(valor.toString())
}

export class ContextoIncompletoError extends Error {}

/**
 * Arma el contexto de un usuario. Lanza `ContextoIncompletoError` si no hay
 * intención: sin ella no hay plan que generar, porque es la guía de todo el
 * prompt y el modelo se pondría a inventar objetivos.
 */
export async function construirContexto(
  usuarioId: string,
  trigger: Trigger,
  ingresoExtraId?: string,
): Promise<ContextoFinanciero> {
  const [usuario, objetivos, deudas, eventos, capacidad] = await Promise.all([
    prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { nombre: true, monedaBase: true },
    }),
    prisma.objetivo.findMany({
      where: { usuarioId, estado: "activo" },
      orderBy: { createdAt: "asc" },
      select: { intencion: true, montoObjetivo: true, montoAcumulado: true },
    }),
    prisma.deuda.findMany({
      where: { usuarioId, estado: "activa" },
      orderBy: { montoActual: "desc" },
      select: {
        nombre: true,
        tipo: true,
        montoActual: true,
        tasaInteres: true,
        pagoMinimo: true,
      },
    }),
    prisma.evento.findMany({
      where: { usuarioId },
      orderBy: { createdAt: "desc" },
      take: EVENTOS_HISTORIAL,
      select: { tipo: true, progresoPct: true, createdAt: true },
    }),
    calcularCapacidadReal(usuarioId),
  ])

  if (!usuario) throw new ContextoIncompletoError("El usuario no existe.")
  if (objetivos.length === 0) {
    throw new ContextoIncompletoError("Todavía no has definido tu intención.")
  }

  // El id llega del cliente, así que la consulta lleva el usuarioId de sesión:
  // pedir un ingreso extra ajeno devuelve null, no el dato de otra persona.
  let ingresoExtra: ContextoFinanciero["ingresoExtra"]
  if (ingresoExtraId) {
    const registro = await prisma.ingresoExtra.findFirst({
      where: { id: ingresoExtraId, usuarioId },
      select: { monto: true, descripcion: true },
    })
    if (registro) {
      ingresoExtra = {
        monto: aNumero(registro.monto) ?? 0,
        descripcion: registro.descripcion,
      }
    }
  }

  return {
    nombre: usuario.nombre,
    moneda: usuario.monedaBase,
    intencion: objetivos[0].intencion,
    objetivos: objetivos.map((o) => ({
      intencion: o.intencion,
      montoObjetivo: aNumero(o.montoObjetivo),
      montoAcumulado: aNumero(o.montoAcumulado) ?? 0,
    })),
    capacidad,
    deudas: deudas.map((d) => ({
      nombre: d.nombre,
      tipo: d.tipo,
      montoActual: aNumero(d.montoActual) ?? 0,
      tasaInteres: aNumero(d.tasaInteres),
      pagoMinimo: aNumero(d.pagoMinimo),
    })),
    // `desc` para traer los últimos; se invierte para leerlos en orden natural.
    historial: eventos.reverse().map((e) => ({
      tipo: e.tipo,
      progresoPct: aNumero(e.progresoPct),
      fecha: e.createdAt,
    })),
    trigger,
    ingresoExtra,
  }
}
