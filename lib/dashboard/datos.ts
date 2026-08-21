import type { UsuarioSesion } from "@/lib/auth/dal"
import { leerHistorialCheckins, type PuntoCheckin } from "@/lib/checkins/historial"
import { prisma } from "@/lib/db/prisma"
import { calcularCapacidadReal, type Capacidad } from "@/lib/finanzas/capacidad"
import { proyectarDeuda, type Proyeccion } from "@/lib/finanzas/proyeccion"
import { leerPlan, type PlanGuardado } from "@/lib/ia/schema"
import type { Moneda } from "@/lib/formato"

/**
 * Todo lo que el dashboard necesita, en una sola función y una sola pasada.
 *
 * La página es un server component: podría consultar la base inline, pero
 * entonces las cifras, la gráfica y el plan se cargarían cada una por su lado
 * y nada garantizaría que hablan del mismo momento. Aquí las consultas van en
 * paralelo y la proyección se calcula sobre esas mismas deudas.
 *
 * El `usuarioId` llega ya resuelto desde la sesión (DAL), nunca de la URL.
 */

export type DatosDashboard = {
  moneda: Moneda
  /** La intención principal: el objetivo activo más antiguo. */
  intencion: string | null
  otrasIntenciones: string[]
  /** `null` si nunca se generó un plan o si el guardado tiene otro shape. */
  plan: PlanGuardado | null
  planGeneradoEn: Date | null
  /**
   * El plan aconsejó sobre unas cifras que ya no son las de hoy. No invalida
   * el consejo —por eso el plan se sigue mostrando—, pero el usuario merece
   * saber que los números que lee en la prosa son los de aquel día.
   */
  planDesactualizado: boolean
  capacidad: Capacidad
  numeroDeudas: number
  proyeccion: Proyeccion
  checkins: PuntoCheckin[]
  /** Cuánto bajó la deuda desde el último check-in. `null` si no hay ninguno. */
  bajaDeuda: number | null
}

/**
 * A partir de qué diferencia se avisa de que el plan quedó viejo. Un peso de
 * más no es una desactualización; medio millón sí cambia la conversación.
 *
 * La tolerancia de la capacidad es mucho más estrecha porque es una cifra
 * mensual, no un saldo: el plan escribe "te quedan $1.700.000 al mes" y con
 * $1.500.000 la frase sigue siendo útil, pero pasar a números rojos la vuelve
 * falsa. Comparado con una deuda de millones, $200.000 ahí pesan más.
 */
const TOLERANCIA_DEUDA = 500_000
const TOLERANCIA_CAPACIDAD = 200_000

function aNumero(valor: { toString(): string } | null): number | null {
  return valor === null ? null : Number(valor.toString())
}

export async function cargarDashboard(usuario: UsuarioSesion): Promise<DatosDashboard> {
  const usuarioId = usuario.id

  const [objetivos, planRegistro, deudas, capacidad, checkins, ultimoGastoGrande] =
    await Promise.all([
      prisma.objetivo.findMany({
        where: { usuarioId, estado: "activo" },
        orderBy: { createdAt: "asc" },
        select: { intencion: true },
      }),
      prisma.planIa.findFirst({
        where: { usuarioId },
        orderBy: { createdAt: "desc" },
        select: { contenido: true, createdAt: true },
      }),
      prisma.deuda.findMany({
        where: { usuarioId, estado: "activa" },
        select: { montoActual: true, tasaInteres: true, pagoMinimo: true },
      }),
      calcularCapacidadReal(usuarioId),
      leerHistorialCheckins(usuarioId),
      // Para el aviso de plan viejo: un gasto grande no mueve la capacidad
      // estructural, así que la comparación de cifras no lo detectaría nunca.
      // Se mira el más reciente y se compara con la fecha del plan.
      prisma.egresoExtra.findFirst({
        where: { usuarioId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ])

  const plan = planRegistro ? leerPlan(planRegistro.contenido) : null

  const proyeccion = proyectarDeuda(
    deudas.map((d) => ({
      montoActual: Number(d.montoActual.toString()),
      tasaInteres: aNumero(d.tasaInteres),
      pagoMinimo: aNumero(d.pagoMinimo),
    })),
    capacidad.capacidadReal,
  )

  // El check-in más reciente trae la deuda de ese día; la diferencia con la de
  // hoy es el "bajó $1.200.000" de las cifras clave. Si subió, no se muestra:
  // la línea de contexto dice otra cosa en ese caso.
  const ultimo = checkins[0]
  const baja =
    ultimo?.deudaTotal != null ? ultimo.deudaTotal - capacidad.deudaTotal : null

  return {
    moneda: usuario.monedaBase,
    intencion: objetivos[0]?.intencion ?? null,
    otrasIntenciones: objetivos.slice(1).map((o) => o.intencion),
    plan,
    planGeneradoEn: planRegistro?.createdAt ?? null,
    planDesactualizado:
      plan !== null &&
      (Math.abs(plan.cifras.deudaTotal - capacidad.deudaTotal) > TOLERANCIA_DEUDA ||
        Math.abs(plan.cifras.capacidadReal - capacidad.capacidadReal) > TOLERANCIA_CAPACIDAD ||
        // Un gasto grande posterior al plan (RF-061). Sin esta rama el aviso no
        // se encendería jamás por ellos: se descuentan del mes, no de la
        // capacidad estructural, que es lo único que comparan las dos líneas de
        // arriba. Sin umbral de monto: para llegar aquí ya pasó el suyo.
        (planRegistro !== null &&
          ultimoGastoGrande !== null &&
          ultimoGastoGrande.createdAt > planRegistro.createdAt)),
    capacidad,
    numeroDeudas: deudas.length,
    proyeccion,
    checkins,
    bajaDeuda: baja !== null && baja > 0 ? baja : null,
  }
}
