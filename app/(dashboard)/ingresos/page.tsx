import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EncabezadoPagina } from "@/components/layout/encabezado-pagina"
import { DialogoIngresoExtra } from "@/components/dashboard/dialogo-ingreso-extra"
import {
  ingresosFijos,
  ingresosExtra,
  ingresoMensual,
  etiquetasCategoriaIngreso,
} from "@/lib/mock/ingresos"
import { formatearFecha, formatearMoneda } from "@/lib/formato"
import { usuario } from "@/lib/mock/usuario"

export default function IngresosPage() {
  return (
    <div className="flex flex-col gap-10">
      <EncabezadoPagina
        titulo="Tus ingresos"
        descripcion="Lo que entra cada mes y los ingresos extra que registras cuando llegan."
        accion={
          <DialogoIngresoExtra
            trigger={
              <Button variant="secondary">
                <Plus className="size-5" />
                Registrar ingreso extra
              </Button>
            }
          />
        }
      />

      <section aria-labelledby="fijos-titulo" className="flex flex-col gap-4">
        <h2 id="fijos-titulo" className="text-seccion font-semibold text-ink">
          Ingresos fijos
        </h2>
        <ul className="flex flex-col gap-3">
          {ingresosFijos.map((i) => (
            <li
              key={i.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-line bg-surface p-4"
            >
              <div className="flex flex-col gap-1">
                <p className="font-medium text-ink">{i.descripcion}</p>
                <Badge tono="neutro">{etiquetasCategoriaIngreso[i.categoria]}</Badge>
              </div>
              <p className="tabular-nums text-avance">{formatearMoneda(i.monto, usuario.monedaBase)}</p>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t border-line pt-3">
          <p className="text-menor text-ink-mute">Total mensual</p>
          <p className="text-seccion font-semibold tabular-nums text-ink">
            {formatearMoneda(ingresoMensual, usuario.monedaBase)}
          </p>
        </div>
      </section>

      <section aria-labelledby="extra-titulo" className="flex flex-col gap-4">
        <h2 id="extra-titulo" className="text-seccion font-semibold text-ink">
          Ingresos extra
        </h2>
        <ul className="flex flex-col divide-y divide-line">
          {ingresosExtra.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-3 py-3">
              <div className="flex flex-col">
                <span className="text-cuerpo text-ink">{i.descripcion}</span>
                <span className="text-menor text-ink-mute">{formatearFecha(i.fecha)}</span>
              </div>
              <span className="tabular-nums text-avance">{formatearMoneda(i.monto, usuario.monedaBase)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
