import { prisma } from "@/lib/db/prisma"
import { limitesDelMes } from "@/lib/finanzas/calendario"

/**
 * La cuenta central del producto (ETR):
 *
 *   Ingresos − Egresos (impuestos + supervivencia) = capacidad real
 *
 * Es la cifra que responde "¿cuánto me queda de verdad para mis objetivos?",
 * y la que alimenta al Motor IA. Todo lo demás del dashboard cuelga de aquí.
 */

export type Capacidad = {
  ingresos: number
  /** Solo la categoría `impuestos`. Se separa porque la ETR los distingue. */
  impuestos: number
  /** El resto de gastos fijos: lo que cuesta vivir. */
  supervivencia: number
  egresos: number
  /**
   * Lo que queda al mes para deudas y objetivos, **de forma estructural**.
   * Puede ser negativo.
   *
   * Es el margen mensual recurrente y por eso es la cifra que alimenta
   * `proyectarDeuda()`: la que responde "a este ritmo, ¿cuándo salgo?". Los
   * gastos grandes y puntuales NO entran aquí (RF-055); restarlos haría que
   * una matrícula de un año se proyectara como si se pagara doce veces.
   */
  capacidadReal: number
  /** Suma de los gastos grandes del mes en curso. Cero si no hubo. */
  gastosPuntualesMes: number
  /**
   * Lo que de verdad queda **este mes**: `capacidadReal − gastosPuntualesMes`.
   *
   * Es la cifra que se pinta bajo la etiqueta "Disponible este mes" (RF-054),
   * y la única que baja cuando alguien paga una matrícula. Se separa de
   * `capacidadReal` a propósito: son dos preguntas distintas —"¿cómo voy este
   * mes?" y "¿cuál es mi ritmo?"— y responderlas con el mismo número obliga a
   * mentir en una de las dos.
   */
  disponibleEsteMes: number
  /** Suma de los saldos de las deudas activas. */
  deudaTotal: number
  /** Suma de los pagos mínimos conocidos. */
  pagosMinimos: number
}

/**
 * Los montos son `Decimal` en PostgreSQL para no perder centavos. Se pasan a
 * number al salir porque la UI y el JSON del Motor IA trabajan con number, y
 * a la escala de esta app —pesos colombianos, millones— el double no pierde
 * precisión relevante.
 */
function aNumero(valor: { toString(): string } | null | undefined): number {
  return valor ? Number(valor.toString()) : 0
}

export async function calcularCapacidadReal(
  usuarioId: string,
): Promise<Capacidad> {
  const { desde, hasta } = limitesDelMes()

  const [ingresos, egresos, deudas, puntuales] = await Promise.all([
    prisma.ingreso.findMany({
      where: { usuarioId },
      select: { montoMensual: true },
    }),
    prisma.egreso.findMany({
      where: { usuarioId },
      select: { categoria: true, montoMensual: true },
    }),
    prisma.deuda.findMany({
      where: { usuarioId, estado: "activa" },
      select: { montoActual: true, pagoMinimo: true },
    }),
    // Solo los de ESTE mes: los del mes pasado ya pasaron y su golpe también.
    prisma.egresoExtra.aggregate({
      where: { usuarioId, fecha: { gte: desde, lt: hasta } },
      _sum: { monto: true },
    }),
  ])

  const totalIngresos = ingresos.reduce((s, i) => s + aNumero(i.montoMensual), 0)

  let impuestos = 0
  let supervivencia = 0
  for (const e of egresos) {
    const monto = aNumero(e.montoMensual)
    if (e.categoria === "impuestos") impuestos += monto
    else supervivencia += monto
  }

  const deudaTotal = deudas.reduce((s, d) => s + aNumero(d.montoActual), 0)
  const pagosMinimos = deudas.reduce((s, d) => s + aNumero(d.pagoMinimo), 0)

  // Puede dar negativo, y no se recorta a cero a propósito: alguien que gasta
  // más de lo que gana necesita verlo, no que se lo escondamos. Lo mismo vale
  // para el disponible del mes tras un gasto grande.
  const capacidadReal = totalIngresos - impuestos - supervivencia
  const gastosPuntualesMes = aNumero(puntuales._sum.monto)

  return {
    ingresos: totalIngresos,
    impuestos,
    supervivencia,
    egresos: impuestos + supervivencia,
    capacidadReal,
    gastosPuntualesMes,
    disponibleEsteMes: capacidadReal - gastosPuntualesMes,
    deudaTotal,
    pagosMinimos,
  }
}
