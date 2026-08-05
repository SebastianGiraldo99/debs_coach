import type { ContextoFinanciero } from "@/lib/ia/contexto"
import { etiquetasTipoDeuda } from "@/lib/finanzas/etiquetas"
import { formatearFecha, formatearMoneda, simboloMoneda } from "@/lib/formato"

/**
 * Los dos prompts del Motor IA.
 *
 * El de sistema fija quién es y cómo escribe (DIRECTRICES §19). El de usuario
 * es solo datos: ni una línea de texto libre escrita por la persona llega
 * aquí sin haber pasado por la base (RF-035, RF-036).
 *
 * Los montos se le pasan ya formateados en la moneda del usuario, no en
 * crudo. La prosa que genera el modelo lleva el símbolo incrustado en el
 * texto —"Abona $850.000 a la Visa"— así que el front no puede corregirlo
 * después: o lo escribe bien el modelo, o queda mal. Es el pendiente que
 * DIRECTRICES §22.2 dejó abierto.
 */

const TONO = `Cómo escribes:
- Tuteo, segunda persona, frases cortas. Español neutro con vocabulario colombiano.
- Nunca regañas. Si la persona no cumplió: "esto pasa, ajustemos". Nunca "no cumpliste".
- Los logros se dicen con sobriedad: "Bajaste $1.200.000 de deuda este mes". Sin signos de exclamación, sin "¡Increíble!", sin emojis.
- Sin jerga sin explicar. Si mencionas una tasa, di qué significa en dinero: "32% E.A. — cada mes que mantienes ese saldo te cuesta $218.000".
- Nada de felicitaciones vacías, insignias, rachas ni puntajes.`

export function construirPrompt(ctx: ContextoFinanciero) {
  const simbolo = simboloMoneda(ctx.moneda)
  const dinero = (valor: number) => formatearMoneda(valor, ctx.moneda)

  const system = `Eres el coach financiero de una persona que te confió sus números. Tu única función es analizar los datos estructurados que recibes y devolver un plan de acción concreto.

Reglas que no rompes:
- La intención que la persona declaró es tu guía. Todo lo que propongas sirve a esa intención; no la reinterpretas ni la sustituyes por lo que a ti te parece más sensato.
- Solo hablas de los datos que te dieron. No inventas deudas, ingresos, fechas ni cifras que no estén en el contexto.
- Cada acción que propones es ejecutable esta semana y nombra la deuda o la cuenta concreta.
- Los montos que escribas van en ${ctx.moneda} y con este formato exacto: ${dinero(850000)}. Usa siempre el símbolo ${simbolo}.
- No propones pagar más de lo que dice la capacidad real disponible.
- Propones al menos una mejora sin importar si la persona va bien o mal.

${TONO}

Respondes SIEMPRE con un único objeto JSON válido, sin texto alrededor y sin bloques de código.`

  const { capacidad } = ctx

  const deudas =
    ctx.deudas.length === 0
      ? "Ninguna. No tiene deudas activas."
      : ctx.deudas
          .map((d) => {
            const partes = [`${etiquetasTipoDeuda[d.tipo]}`, `saldo ${dinero(d.montoActual)}`]
            if (d.tasaInteres !== null) partes.push(`tasa ${d.tasaInteres}% E.A.`)
            if (d.pagoMinimo !== null) partes.push(`pago mínimo ${dinero(d.pagoMinimo)}`)
            return `- "${d.nombre}" — ${partes.join(", ")}`
          })
          .join("\n")

  const historial =
    ctx.historial.length === 0
      ? "Sin historial: es su primer plan."
      : ctx.historial
          .map(
            (e) =>
              `- ${formatearFecha(e.fecha, "corto")}: ${e.tipo}` +
              (e.progresoPct !== null ? ` (progreso ${e.progresoPct}%)` : ""),
          )
          .join("\n")

  /**
   * Una intención por línea, con su cifra cuando la tiene. Sin el monto el
   * modelo solo puede decir "sigue ahorrando"; con él dice cuánto falta y en
   * cuántos meses, que es de lo que sirve un coach.
   */
  const objetivos = ctx.objetivos
    .map((o, indice) => {
      const rotulo = indice === 0 ? "PRINCIPAL" : "también"
      if (o.montoObjetivo === null) return `- [${rotulo}] "${o.intencion}"`
      const falta = Math.max(0, o.montoObjetivo - o.montoAcumulado)
      return (
        `- [${rotulo}] "${o.intencion}" — necesita ${dinero(o.montoObjetivo)}, ` +
        `lleva apartado ${dinero(o.montoAcumulado)}, le faltan ${dinero(falta)}`
      )
    })
    .join("\n")

  const contextoTrigger: Record<ContextoFinanciero["trigger"], string> = {
    onboarding: "Acaba de terminar el registro de sus datos. Este es su primer plan: preséntaselo como un punto de partida.",
    check_in: "Acaba de completar su check-in mensual. Reconoce lo que hizo y recalibra el plan.",
    ingreso_extra: "Registró un ingreso extraordinario. Dile qué hacer con ese dinero para que sirva a su intención.",
  }

  const user = `PERSONA: ${ctx.nombre}
MONEDA: ${ctx.moneda}

INTENCIONES ACTIVAS:
${objetivos}

SITUACIÓN MENSUAL:
- Ingresos: ${dinero(capacidad.ingresos)}
- Impuestos: ${dinero(capacidad.impuestos)}
- Gastos de supervivencia: ${dinero(capacidad.supervivencia)}
- Capacidad real disponible: ${dinero(capacidad.capacidadReal)}${capacidad.capacidadReal < 0 ? " (NEGATIVA: gasta más de lo que gana)" : ""}
- Pagos mínimos comprometidos: ${dinero(capacidad.pagosMinimos)}

DEUDAS ACTIVAS (total ${dinero(capacidad.deudaTotal)}):
${deudas}

ÚLTIMOS MOVIMIENTOS:
${historial}

MOMENTO: ${contextoTrigger[ctx.trigger]}
${ctx.ingresoExtra ? `INGRESO EXTRAORDINARIO: ${dinero(ctx.ingresoExtra.monto)} — "${ctx.ingresoExtra.descripcion}"` : ""}

Devuelve exactamente este JSON:
{
  "siguientePaso": {
    "accion": "la única cosa que debe hacer primero, con monto y nombre de la deuda o cuenta. Máx 140 caracteres.",
    "porque": "por qué esa y no otra, en dinero concreto. Máx 2 oraciones."
  },
  "pasos": [
    { "accion": "siguiente acción del plan", "porque": "qué gana con ella" }
  ],
  "mesesLibertad": número entero de meses para saldar todas las deudas al ritmo propuesto, o null si no hay deudas,
  "mensaje": {
    "titulo": "una frase que resuma el momento. Máx 70 caracteres, sin exclamaciones.",
    "cuerpo": "2 a 4 oraciones: qué ves, qué mejorar, qué esperar. Siempre con una mejora sugerida."
  },
  "alerta": "una sola frase solo si hay algo urgente (capacidad negativa, deuda que crece por encima del pago mínimo). null si no lo hay."
}

"pasos" lleva entre 2 y 4 elementos, sin repetir el siguiente paso.`

  return { system, user }
}
