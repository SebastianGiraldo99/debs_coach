import { formatearMeses, formatearMoneda, type Moneda } from "@/lib/formato"

/**
 * Las tres cifras del dashboard (§6.3, RF-014). Exactamente tres.
 *
 * Son las de HOY, recalculadas en cada carga, no las que quedaron congeladas
 * en el plan: la pregunta que responden es "¿cómo estoy ahora?". Las cifras
 * del plan viven dentro del plan y sostienen su prosa. Ver `lib/ia/schema.ts`.
 *
 * La línea de contexto en prosa es parte de la cifra, no un adorno: hace el
 * trabajo que la gente cree que hacen las flechitas de tendencia.
 */

type Props = {
  moneda: Moneda
  /**
   * Lo que queda ESTE mes: capacidad real menos los gastos grandes del mes.
   * Puede ser negativa.
   *
   * No es la cifra que proyecta la deuda —esa es la capacidad estructural, que
   * no la tocan los gastos puntuales—. Aquí se pinta la del mes porque es lo
   * que la etiqueta promete y lo que la persona tiene delante.
   */
  disponible: number
  /** Cuánto de eso se fue en gastos grandes este mes. Cero si no hubo. */
  gastosPuntualesMes: number
  deudaTotal: number
  numeroDeudas: number
  /** Cuánto bajó la deuda desde el último check-in. `null` si no hubo. */
  bajaDeuda: number | null
  /** Meses para saldar todo. `null` si al ritmo actual no hay fecha. */
  mesesFaltan: number | null
}

function Cifra({ etiqueta, valor, contexto }: { etiqueta: string; valor: string; contexto: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-micro font-medium uppercase tracking-wide text-ink-mute">{etiqueta}</p>
      <p className="text-cifra font-semibold tabular-nums text-ink">{valor}</p>
      <p className="text-menor text-ink-soft text-pretty">{contexto}</p>
    </div>
  )
}

export function CifrasClave({
  moneda,
  disponible,
  gastosPuntualesMes,
  deudaTotal,
  numeroDeudas,
  bajaDeuda,
  mesesFaltan,
}: Props) {
  const dinero = (valor: number) => formatearMoneda(valor, moneda)

  // Cuando hubo un gasto grande, la línea lo nombra. Sin eso, alguien que pagó
  // una matrícula ve una cifra hundida y ninguna explicación, y la primera
  // sospecha razonable es que la app se equivocó.
  const contextoDisponible = gastosPuntualesMes
    ? `después de impuestos, gastos fijos y ${dinero(gastosPuntualesMes)} de gastos grandes de este mes`
    : disponible < 0
      ? "tus gastos fijos superan lo que entra este mes"
      : "después de impuestos y gastos fijos"

  const contextoDeuda =
    deudaTotal === 0
      ? "no tienes deudas activas"
      : bajaDeuda !== null
        ? `bajó ${dinero(bajaDeuda)} desde tu último check-in`
        : numeroDeudas === 1
          ? "en una sola deuda"
          : `repartida en ${numeroDeudas} deudas`

  return (
    <section aria-label="Cifras clave" className="grid gap-6 sm:grid-cols-3">
      <Cifra
        etiqueta="Disponible este mes"
        valor={dinero(disponible)}
        contexto={contextoDisponible}
      />
      <Cifra etiqueta="Deuda total" valor={dinero(deudaTotal)} contexto={contextoDeuda} />
      <Cifra
        etiqueta="Faltan"
        // Un guion y no un "0" cuando no hay proyección: no sabemos que falte
        // poco, sabemos que no podemos calcularlo. Inventar un número sería
        // mentir. Cero meses solo se muestra cuando de verdad no queda deuda.
        valor={mesesFaltan === null ? "—" : formatearMeses(mesesFaltan)}
        contexto={
          mesesFaltan === null
            ? "necesitas margen mensual para proyectar una fecha"
            : deudaTotal === 0
              ? "ya no te queda deuda por saldar"
              : "para saldar todo, al ritmo actual"
        }
      />
    </section>
  )
}
