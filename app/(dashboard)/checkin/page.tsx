import { EncabezadoPagina } from "@/components/layout/encabezado-pagina"
import {
  FlujoCheckin,
  type DeudaCheckin,
  type MetaCheckin,
} from "@/components/checkin/flujo-checkin"
import { leerHistorialCheckins } from "@/lib/checkins/historial"
import { requerirUsuario } from "@/lib/auth/dal"
import { prisma } from "@/lib/db/prisma"
import { formatearFecha, formatearMoneda, formatearPorcentaje } from "@/lib/formato"

/** Cuántos check-ins se listan abajo. Es el historial completo, pero acotado. */
const HISTORIAL = 24

export default async function CheckinPage() {
  const usuario = await requerirUsuario()
  const moneda = usuario.monedaBase

  const [deudas, objetivos, historial] = await Promise.all([
    prisma.deuda.findMany({
      where: { usuarioId: usuario.id, estado: "activa" },
      orderBy: { montoActual: "desc" },
      select: { id: true, nombre: true, montoActual: true },
    }),
    // Solo las metas con monto: a las demás no hay nada que aportarles, su
    // avance sale de la deuda. Ver lib/checkins/progreso.ts.
    prisma.objetivo.findMany({
      where: { usuarioId: usuario.id, estado: "activo", montoObjetivo: { not: null } },
      orderBy: { createdAt: "asc" },
      select: { id: true, intencion: true, montoObjetivo: true, montoAcumulado: true },
    }),
    leerHistorialCheckins(usuario.id, HISTORIAL),
  ])

  const deudasFlujo: DeudaCheckin[] = deudas.map((d) => ({
    id: d.id,
    nombre: d.nombre,
    saldo: Number(d.montoActual.toString()),
  }))

  const metas: MetaCheckin[] = objetivos.map((o) => ({
    id: o.id,
    intencion: o.intencion,
    montoObjetivo: Number(o.montoObjetivo!.toString()),
    montoAcumulado: Number(o.montoAcumulado.toString()),
  }))

  return (
    <div className="flex flex-col gap-10">
      <EncabezadoPagina
        titulo="Check-in del mes"
        descripcion="Cuéntanos cómo te fue. Con eso ajustamos tu plan y medimos tu avance."
      />

      <FlujoCheckin deudas={deudasFlujo} metas={metas} moneda={moneda} />

      <section aria-labelledby="historial-titulo" className="flex flex-col gap-4">
        <h2 id="historial-titulo" className="text-seccion font-semibold text-ink">
          Historial completo
        </h2>
        {historial.length === 0 ? (
          <p className="max-w-[65ch] text-cuerpo text-ink-mute text-pretty">
            Este será tu primer check-in. A partir de aquí podrás comparar cada periodo con el
            anterior.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {historial.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex flex-col">
                  <span className="text-cuerpo text-ink">{formatearFecha(c.fecha)}</span>
                  {c.avance !== null && (
                    <span className="text-menor text-ink-mute">
                      Avance {formatearPorcentaje(c.avance)}
                    </span>
                  )}
                </div>
                <span className="tabular-nums text-ink">{formatearMoneda(c.pago, moneda)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
