import { EncabezadoPagina } from "@/components/layout/encabezado-pagina"
import { CheckinFormulario } from "@/components/checkin/checkin-formulario"
import { checkins } from "@/lib/mock/checkins"
import { formatearFecha, formatearMoneda, formatearPorcentaje } from "@/lib/formato"
import { usuario } from "@/lib/mock/usuario"

export default function CheckinPage() {
  return (
    <div className="flex flex-col gap-10">
      <EncabezadoPagina
        titulo="Check-in del mes"
        descripcion="Cuéntanos cuánto pudiste abonar. Con eso ajustamos tu plan y celebramos tu avance."
      />

      <CheckinFormulario />

      <section aria-labelledby="historial-titulo" className="flex flex-col gap-4">
        <h2 id="historial-titulo" className="text-seccion font-semibold text-ink">
          Historial completo
        </h2>
        <ul className="flex flex-col divide-y divide-line">
          {checkins.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 py-3">
              <div className="flex flex-col">
                <span className="text-cuerpo text-ink">{formatearFecha(c.fecha)}</span>
                <span className="text-menor text-ink-mute">
                  Avance {formatearPorcentaje(c.avance)}
                </span>
              </div>
              <span className="tabular-nums text-ink">{formatearMoneda(c.pago, usuario.monedaBase)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
