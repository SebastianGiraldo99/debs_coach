import Link from "next/link"

import { formatearFecha, formatearMoneda, formatearPorcentaje } from "@/lib/formato"
import { checkins } from "@/lib/mock/checkins"
import { usuario } from "@/lib/mock/usuario"

// Tus check-ins (§6.6): lista compacta de texto, últimos 4, en prosa.
// Formato: "12 jul · Pagaste $780.000 · Avance 34%".
export function HistorialCheckins() {
  const ultimos = checkins.slice(0, 4)

  return (
    <section aria-labelledby="checkins-titulo" className="flex flex-col gap-3">
      <h2 id="checkins-titulo" className="text-seccion font-semibold text-ink">
        Tus check-ins
      </h2>
      <ul className="flex flex-col divide-y divide-line">
        {ultimos.map((c) => (
          <li key={c.id} className="py-2 text-menor text-ink-soft">
            <span className="text-ink-mute">{formatearFecha(c.fecha, "corto")}</span>
            {" · "}
            <span>Pagaste </span>
            <span className="tabular-nums text-ink">{formatearMoneda(c.pago, usuario.monedaBase)}</span>
            {" · "}
            <span>Avance </span>
            <span className="tabular-nums text-ink">{formatearPorcentaje(c.avance)}</span>
          </li>
        ))}
      </ul>
      <Link href="/checkin" className="self-start text-menor text-primary hover:text-primary-hover">
        Ver todos
      </Link>
    </section>
  )
}
