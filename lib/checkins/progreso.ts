/**
 * El porcentaje de avance hacia cada objetivo (RF-032).
 *
 * Hay dos formas de medir y dependen del objetivo, no del usuario:
 *
 * - **Con monto** —"la cuota inicial de un apartamento", $40.000.000—: avance
 *   es lo apartado sobre lo que hace falta. El numerador lo reporta la persona
 *   en el check-in; ver `Objetivo.montoAcumulado`.
 * - **Sin monto** —"quiero saldar mis deudas", "dejar de vivir al día"—: la
 *   única cifra que existe es la deuda, así que el avance es cuánto ha bajado
 *   respecto de lo que debía cuando la registró.
 *
 * Un objetivo sin monto y sin deudas no tiene avance calculable y devuelve
 * `null`. Es honesto: la alternativa era inventar un 0% que parece un fracaso
 * o un 100% que parece un logro, y no es ninguna de las dos cosas.
 */

export type ObjetivoMedible = {
  id: string
  intencion: string
  montoObjetivo: number | null
  montoAcumulado: number
}

export type AvanceObjetivo = {
  objetivoId: string
  intencion: string
  /** 0-100, o `null` si este objetivo no se puede medir con lo que hay. */
  progresoPct: number | null
  /** De dónde salió el número, para que el historial se pueda releer. */
  base: "monto" | "deuda" | "sin_datos"
}

function porcentaje(parte: number, total: number): number {
  if (total <= 0) return 0
  // Se recorta arriba: apartar más de la meta es haberla logrado, no un 130%.
  return Math.min(100, Math.max(0, Math.round((parte / total) * 100)))
}

export function calcularAvances(
  objetivos: ObjetivoMedible[],
  deuda: { total: number; original: number },
): AvanceObjetivo[] {
  const avanceDeuda =
    deuda.original > 0 ? porcentaje(deuda.original - deuda.total, deuda.original) : null

  return objetivos.map((o) => {
    if (o.montoObjetivo !== null && o.montoObjetivo > 0) {
      return {
        objetivoId: o.id,
        intencion: o.intencion,
        progresoPct: porcentaje(o.montoAcumulado, o.montoObjetivo),
        base: "monto",
      }
    }
    return {
      objetivoId: o.id,
      intencion: o.intencion,
      progresoPct: avanceDeuda,
      base: avanceDeuda === null ? "sin_datos" : "deuda",
    }
  })
}

/**
 * El número único que va a `Evento.progresoPct` y se pinta como "Avance 34%"
 * en el historial del dashboard.
 *
 * Es el avance de la **intención principal** —el objetivo activo más antiguo,
 * el mismo que RF-037 usa como guía del plan— y no un promedio de todos.
 * Promediar mezclaría cosas que no se suman: un 80% de deuda saldada y un 10%
 * de una cuota inicial dan un 45% que no describe nada de lo que está pasando.
 */
export function progresoPrincipal(avances: AvanceObjetivo[]): number | null {
  return avances[0]?.progresoPct ?? null
}
