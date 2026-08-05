import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EncabezadoPagina } from "@/components/layout/encabezado-pagina"
import { EstadoVacio } from "@/components/estados/estado-vacio"
import {
  AccionIngresoExtra,
  BarraIngresoExtraMovil,
} from "@/components/dashboard/accion-ingreso-extra"
import { DialogoIngreso, type IngresoEditable } from "@/components/ingresos/dialogo-ingreso"
import { requerirUsuario } from "@/lib/auth/dal"
import { prisma } from "@/lib/db/prisma"
import { etiquetasCategoriaIngreso } from "@/lib/finanzas/etiquetas"
import { formatearFechaUtc, formatearMoneda } from "@/lib/formato"

/** Cuántos ingresos extra se listan. Los viejos ya hicieron su trabajo. */
const EXTRA_VISIBLES = 12

export default async function IngresosPage() {
  const usuario = await requerirUsuario()
  const moneda = usuario.monedaBase

  const [fijos, extra] = await Promise.all([
    prisma.ingreso.findMany({
      where: { usuarioId: usuario.id },
      orderBy: { montoMensual: "desc" },
      select: { id: true, descripcion: true, categoria: true, montoMensual: true },
    }),
    prisma.ingresoExtra.findMany({
      where: { usuarioId: usuario.id },
      orderBy: { fecha: "desc" },
      take: EXTRA_VISIBLES,
      select: { id: true, descripcion: true, monto: true, fecha: true },
    }),
  ])

  const totalMensual = fijos.reduce((suma, i) => suma + Number(i.montoMensual.toString()), 0)

  const editable = (i: (typeof fijos)[number]): IngresoEditable => ({
    id: i.id,
    descripcion: i.descripcion ?? "",
    categoria: i.categoria,
    monto: Number(i.montoMensual.toString()),
  })

  return (
    <div className="flex flex-col gap-10">
      <EncabezadoPagina
        titulo="Tus ingresos"
        descripcion="Lo que entra cada mes y los ingresos extra que registras cuando llegan."
        accion={<AccionIngresoExtra moneda={moneda} />}
      />

      <section aria-labelledby="fijos-titulo" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="fijos-titulo" className="text-seccion font-semibold text-ink">
            Ingresos fijos
          </h2>
          <DialogoIngreso
            moneda={moneda}
            trigger={
              <Button variant="ghost" size="sm">
                <Plus className="size-5" />
                Agregar ingreso
              </Button>
            }
          />
        </div>

        {fijos.length === 0 ? (
          <EstadoVacio mensaje="No tienes ingresos fijos registrados. Sin ellos no podemos calcular cuánto te queda al mes." />
        ) : (
          <>
            <ul className="flex flex-col gap-3">
              {fijos.map((i) => (
                <li
                  key={i.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-line bg-surface p-4"
                >
                  <div className="flex flex-col gap-1">
                    <p className="font-medium text-ink">
                      {i.descripcion ?? etiquetasCategoriaIngreso[i.categoria]}
                    </p>
                    <Badge tono="neutro">{etiquetasCategoriaIngreso[i.categoria]}</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="tabular-nums text-avance">
                      {formatearMoneda(Number(i.montoMensual.toString()), moneda)}
                    </p>
                    <DialogoIngreso
                      ingreso={editable(i)}
                      moneda={moneda}
                      trigger={
                        <Button variant="ghost" size="sm">
                          Editar
                        </Button>
                      }
                    />
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t border-line pt-3">
              <p className="text-menor text-ink-mute">Total mensual</p>
              <p className="text-seccion font-semibold tabular-nums text-ink">
                {formatearMoneda(totalMensual, moneda)}
              </p>
            </div>
          </>
        )}
      </section>

      <section aria-labelledby="extra-titulo" className="flex flex-col gap-4">
        <h2 id="extra-titulo" className="text-seccion font-semibold text-ink">
          Ingresos extra
        </h2>
        {extra.length === 0 ? (
          <p className="max-w-[65ch] text-menor text-ink-soft text-pretty">
            Todavía no has registrado ninguno. Cuando llegue un dinero que no entra todos los meses,
            anótalo y rehacemos el plan con él.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {extra.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex flex-col">
                  <span className="text-cuerpo text-ink">{i.descripcion}</span>
                  {/* Columna DATE: se lee en UTC o el día se corre. */}
                  <span className="text-menor text-ink-mute">{formatearFechaUtc(i.fecha)}</span>
                </div>
                <span className="tabular-nums text-avance">
                  {formatearMoneda(Number(i.monto.toString()), moneda)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <BarraIngresoExtraMovil moneda={moneda} />
    </div>
  )
}
