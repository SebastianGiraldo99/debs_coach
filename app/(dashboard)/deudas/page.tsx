import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EncabezadoPagina } from "@/components/layout/encabezado-pagina"
import { EstadoVacio } from "@/components/estados/estado-vacio"
import { DialogoDeuda, type DeudaEditable } from "@/components/deudas/dialogo-deuda"
import { requerirUsuario } from "@/lib/auth/dal"
import { prisma } from "@/lib/db/prisma"
import { etiquetasTipoDeuda } from "@/lib/finanzas/etiquetas"
import { formatearMoneda, formatearPorcentaje } from "@/lib/formato"

/**
 * Tus deudas: el CRUD de los datos base (RF-024).
 *
 * Editar aquí NO dispara el Motor IA. Los tres disparadores están fijados
 * (RF-034) y este no es uno: el plan se recalcula al cerrar el onboarding, en
 * el check-in y al registrar un ingreso extra. Mientras tanto, el dashboard
 * avisa de que el plan quedó hecho con cifras anteriores.
 */
export default async function DeudasPage() {
  const usuario = await requerirUsuario()
  const moneda = usuario.monedaBase

  const deudas = await prisma.deuda.findMany({
    where: { usuarioId: usuario.id },
    orderBy: [{ estado: "asc" }, { montoActual: "desc" }],
    select: {
      id: true,
      nombre: true,
      tipo: true,
      montoActual: true,
      tasaInteres: true,
      pagoMinimo: true,
      estado: true,
    },
  })

  const activas = deudas.filter((d) => d.estado === "activa")
  const saldadas = deudas.filter((d) => d.estado === "saldada")
  const total = activas.reduce((suma, d) => suma + Number(d.montoActual.toString()), 0)

  const editable = (d: (typeof deudas)[number]): DeudaEditable => ({
    id: d.id,
    nombre: d.nombre,
    tipo: d.tipo,
    saldo: Number(d.montoActual.toString()),
    tasaEA: d.tasaInteres === null ? null : Number(d.tasaInteres.toString()),
    pagoMinimo: d.pagoMinimo === null ? null : Number(d.pagoMinimo.toString()),
  })

  return (
    <div className="flex flex-col gap-8">
      <EncabezadoPagina
        titulo="Tus deudas"
        descripcion="El panorama completo de lo que debes hoy. La más cara es la que atacamos primero."
        accion={
          <DialogoDeuda
            moneda={moneda}
            trigger={
              <Button variant="secondary">
                <Plus className="size-5" />
                Agregar deuda
              </Button>
            }
          />
        }
      />

      {activas.length === 0 ? (
        <EstadoVacio
          mensaje={
            saldadas.length > 0
              ? "No te queda ninguna deuda activa. Todo lo que te sobra al mes es tuyo."
              : "No tienes deudas registradas. Si aparece una, agrégala y ajustamos el plan en tu próximo check-in."
          }
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {activas.map((d) => (
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
                  {formatearMoneda(Number(d.montoActual.toString()), moneda)}
                </p>
              </div>

              <dl className="flex flex-wrap gap-x-8 gap-y-1 border-t border-line pt-3 text-menor">
                <div className="flex gap-1.5">
                  <dt className="text-ink-mute">Tasa E.A.:</dt>
                  <dd className="tabular-nums text-ink">
                    {d.tasaInteres !== null
                      ? formatearPorcentaje(Number(d.tasaInteres.toString()))
                      : "Sin interés"}
                  </dd>
                </div>
                <div className="flex gap-1.5">
                  <dt className="text-ink-mute">Pago mínimo:</dt>
                  <dd className="tabular-nums text-ink">
                    {d.pagoMinimo !== null
                      ? formatearMoneda(Number(d.pagoMinimo.toString()), moneda)
                      : "No lo registraste"}
                  </dd>
                </div>
              </dl>

              <div className="border-t border-line pt-3">
                <DialogoDeuda
                  deuda={editable(d)}
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
      )}

      {activas.length > 0 && (
        <div className="flex items-center justify-between rounded-card border border-line bg-surface-alt p-5">
          <p className="text-cuerpo font-medium text-ink">Deuda total</p>
          <p className="text-seccion font-semibold tabular-nums text-ink">
            {formatearMoneda(total, moneda)}
          </p>
        </div>
      )}

      {saldadas.length > 0 && (
        <section aria-labelledby="saldadas-titulo" className="flex flex-col gap-3">
          <h2 id="saldadas-titulo" className="text-seccion font-semibold text-ink">
            Ya las pagaste
          </h2>
          {/* Se quedan a la vista, sin cifra: lo que importa de una deuda
              saldada no es cuánto era, es que ya no está. */}
          <ul className="flex flex-col divide-y divide-line">
            {saldadas.map((d) => (
              <li key={d.id} className="py-2 text-menor text-ink-soft">
                {d.nombre}
                <span className="text-ink-mute">{` · ${etiquetasTipoDeuda[d.tipo]}`}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
