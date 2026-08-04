import Link from "next/link"

import type { PuntoCheckin } from "@/lib/checkins/historial"
import {
  formatearFecha,
  formatearMoneda,
  formatearPorcentaje,
  type Moneda,
} from "@/lib/formato"

// Tus check-ins (§6.6): lista compacta de texto, últimos 4, en prosa.
// Formato: "12 jul · Pagaste $780.000 · Avance 34%".
const VISIBLES = 4

export function HistorialCheckins({
  checkins,
  moneda,
}: {
  checkins: PuntoCheckin[]
  moneda: Moneda
}) {
  return (
    <section aria-labelledby="checkins-titulo" className="flex flex-col gap-3">
      <h2 id="checkins-titulo" className="text-seccion font-semibold text-ink">
        Tus check-ins
      </h2>

      {checkins.length === 0 ? (
        <p className="max-w-[65ch] text-menor text-ink-soft text-pretty">
          Todavía no has hecho ninguno. Cada quince días te preguntaremos cómo te fue y
          ajustaremos el plan con lo que nos cuentes.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {checkins.slice(0, VISIBLES).map((c) => (
            <li key={c.id} className="py-2 text-menor text-ink-soft">
              <span className="text-ink-mute">{formatearFecha(c.fecha, "corto")}</span>
              {" · "}
              <span>Pagaste </span>
              <span className="tabular-nums text-ink">{formatearMoneda(c.pago, moneda)}</span>
              {c.avance !== null && (
                <>
                  {" · "}
                  <span>Avance </span>
                  <span className="tabular-nums text-ink">{formatearPorcentaje(c.avance)}</span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <Link href="/checkin" className="self-start text-menor text-primary hover:text-primary-hover">
        {checkins.length === 0 ? "Hacer mi primer check-in" : "Ver todos"}
      </Link>
    </section>
  )
}
