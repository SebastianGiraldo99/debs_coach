import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EncabezadoPagina } from "@/components/layout/encabezado-pagina"
import { deudas, deudaTotal, etiquetasTipoDeuda } from "@/lib/mock/deudas"
import { formatearMoneda, formatearPorcentaje } from "@/lib/formato"
import { usuario } from "@/lib/mock/usuario"

export default function DeudasPage() {
  return (
    <div className="flex flex-col gap-8">
      <EncabezadoPagina
        titulo="Tus deudas"
        descripcion="El panorama completo de lo que debes hoy. La más cara es la que atacamos primero."
        accion={
          <Button variant="secondary">
            <Plus className="size-5" />
            Agregar deuda
          </Button>
        }
      />

      <ul className="flex flex-col gap-4">
        {deudas.map((d) => (
          <li
            key={d.id}
            className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex flex-col gap-1">
                <p className="text-seccion font-medium text-ink">{d.nombre}</p>
                <Badge tono="neutro">{etiquetasTipoDeuda[d.tipo]}</Badge>
              </div>
              <p className="text-seccion font-semibold tabular-nums text-deuda">
                {formatearMoneda(d.saldo, usuario.monedaBase)}
              </p>
            </div>

            <dl className="flex flex-wrap gap-x-8 gap-y-1 border-t border-line pt-3 text-menor">
              <div className="flex gap-1.5">
                <dt className="text-ink-mute">Tasa E.A.:</dt>
                <dd className="tabular-nums text-ink">
                  {d.tasaEA != null ? formatearPorcentaje(d.tasaEA) : "Sin interés"}
                </dd>
              </div>
              <div className="flex gap-1.5">
                <dt className="text-ink-mute">Pago mínimo:</dt>
                <dd className="tabular-nums text-ink">{formatearMoneda(d.pagoMinimo, usuario.monedaBase)}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between rounded-card border border-line bg-surface-alt p-5">
        <p className="text-cuerpo font-medium text-ink">Deuda total</p>
        <p className="text-seccion font-semibold tabular-nums text-ink">
          {formatearMoneda(deudaTotal, usuario.monedaBase)}
        </p>
      </div>
    </div>
  )
}
