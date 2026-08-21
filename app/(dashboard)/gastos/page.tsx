import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EncabezadoPagina } from "@/components/layout/encabezado-pagina"
import { EstadoVacio } from "@/components/estados/estado-vacio"
import { DialogoGastoFijo, type GastoEditable } from "@/components/gastos/dialogo-gasto-fijo"
import { DialogoGastoGrande } from "@/components/gastos/dialogo-gasto-grande"
import { requerirUsuario } from "@/lib/auth/dal"
import { prisma } from "@/lib/db/prisma"
import { etiquetasCategoriaEgreso } from "@/lib/finanzas/etiquetas"
import { calcularCapacidadReal } from "@/lib/finanzas/capacidad"
import { umbralGastoConsiderable } from "@/lib/finanzas/umbral-gasto"
import { formatearFechaUtc, formatearMoneda } from "@/lib/formato"

/**
 * La pantalla de gastos (RF-039 a RF-044).
 *
 * Hasta el Sprint 9 los gastos fijos solo se capturaban en el paso 4 del
 * onboarding y no había forma de volver a tocarlos, así que un dato mal
 * anotado deformaba la capacidad real para siempre.
 *
 * Las dos secciones son cosas distintas y por eso están separadas: arriba lo
 * que se paga todos los meses, que entra en la capacidad real; abajo lo que
 * ocurrió una vez y solo pesa en su mes.
 */

/** Cuántos gastos grandes se listan. Los viejos ya hicieron su trabajo. */
const GRANDES_VISIBLES = 12

export default async function GastosPage() {
  const usuario = await requerirUsuario()
  const moneda = usuario.monedaBase

  // En paralelo, como en el dashboard: dos consultas en serie son dos viajes
  // por el túnel para nada.
  const [fijos, grandes, ingresos, capacidad] = await Promise.all([
    prisma.egreso.findMany({
      where: { usuarioId: usuario.id },
      orderBy: { montoMensual: "desc" },
      select: { id: true, descripcion: true, categoria: true, montoMensual: true },
    }),
    prisma.egresoExtra.findMany({
      where: { usuarioId: usuario.id },
      orderBy: { fecha: "desc" },
      take: GRANDES_VISIBLES,
      select: { id: true, descripcion: true, monto: true, fecha: true },
    }),
    // Solo para el umbral del gasto grande: el texto del diálogo y la
    // validación del servidor salen del mismo cálculo y no pueden discrepar.
    prisma.ingreso.aggregate({
      where: { usuarioId: usuario.id },
      _sum: { montoMensual: true },
    }),
    // Para el total del mes. Se reutiliza la función del dashboard en vez de
    // sumar aquí: una segunda suma es una segunda definición de "mes en curso".
    calcularCapacidadReal(usuario.id),
  ])

  const totalMensual = fijos.reduce((suma, e) => suma + Number(e.montoMensual.toString()), 0)
  const umbral = umbralGastoConsiderable(
    Number(ingresos._sum.montoMensual?.toString() ?? 0),
  )

  const editable = (e: (typeof fijos)[number]): GastoEditable => ({
    id: e.id,
    descripcion: e.descripcion ?? "",
    categoria: e.categoria,
    monto: Number(e.montoMensual.toString()),
  })

  return (
    <div className="flex flex-col gap-10">
      <EncabezadoPagina
        titulo="Tus gastos"
        descripcion="Lo que pagas cada mes y los gastos grandes que aparecen de vez en cuando."
        accion={<DialogoGastoGrande moneda={moneda} umbral={umbral} />}
      />

      <section aria-labelledby="fijos-titulo" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="fijos-titulo" className="text-seccion font-semibold text-ink">
            Gastos fijos
          </h2>
          <DialogoGastoFijo moneda={moneda} />
        </div>

        {fijos.length === 0 ? (
          <EstadoVacio mensaje="No tienes gastos fijos registrados. Sin ellos no podemos calcular cuánto te queda al mes." />
        ) : (
          <>
            <ul className="flex flex-col gap-3">
              {fijos.map((e) => (
                <li
                  key={e.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-line bg-surface p-4"
                >
                  <div className="flex flex-col gap-1">
                    <p className="font-medium text-ink">
                      {e.descripcion ?? etiquetasCategoriaEgreso[e.categoria]}
                    </p>
                    <Badge tono="neutro">{etiquetasCategoriaEgreso[e.categoria]}</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="tabular-nums text-avance">
                      {formatearMoneda(Number(e.montoMensual.toString()), moneda)}
                    </p>
                    {/* Trigger de solo texto: este sí se puede pasar desde el
                        servidor. El que lleva icono nace dentro del cliente. */}
                    <DialogoGastoFijo
                      gasto={editable(e)}
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

      <section aria-labelledby="grandes-titulo" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="grandes-titulo" className="text-seccion font-semibold text-ink">
            Gastos grandes
          </h2>
          {/* Solo cuando los hay: un "$0 este mes" es una invitación a llenarlo. */}
          {capacidad.gastosPuntualesMes > 0 && (
            <p className="text-menor text-ink-mute">
              {formatearMoneda(capacidad.gastosPuntualesMes, moneda)} este mes
            </p>
          )}
        </div>
        {grandes.length === 0 ? (
          <p className="max-w-[65ch] text-menor text-ink-soft text-pretty">
            Todavía no has anotado ninguno. Esto no es para el día a día: es para cuando pagas algo
            grande que no se repite —una matrícula, una reparación, el impuesto del carro— y ese mes
            te queda menos de lo normal.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {grandes.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex flex-col">
                  <span className="text-cuerpo text-ink">{g.descripcion}</span>
                  {/* Columna DATE: se lee en UTC o el día se corre. */}
                  <span className="text-menor text-ink-mute">{formatearFechaUtc(g.fecha)}</span>
                </div>
                <span className="tabular-nums text-avance">
                  {formatearMoneda(Number(g.monto.toString()), moneda)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
