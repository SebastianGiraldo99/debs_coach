import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EncabezadoPagina } from "@/components/layout/encabezado-pagina"
import { EstadoVacio } from "@/components/estados/estado-vacio"
import { DialogoObjetivo, type ObjetivoEditable } from "@/components/objetivos/dialogo-objetivo"
import { BotonLogrado } from "@/components/objetivos/boton-logrado"
import { requerirUsuario } from "@/lib/auth/dal"
import { prisma } from "@/lib/db/prisma"
import { MAX_OBJETIVOS_ACTIVOS, diasParaEditar } from "@/lib/objetivos/compromiso"
import { formatearFecha, formatearMoneda, formatearPorcentaje } from "@/lib/formato"

/**
 * Tus objetivos: hasta 3 intenciones activas (RF-022 a RF-027).
 *
 * Es independiente del check-in (RF-026): aquí se decide QUÉ se quiere, allá se
 * reporta cuánto se avanzó. Por eso esta pantalla no pide montos apartados —los
 * pide el check-in— y solo muestra lo que ya se reportó.
 *
 * Editar aquí no dispara el Motor IA, igual que el CRUD de deudas: los tres
 * disparadores están fijados (RF-034). El plan se recalibra en el próximo
 * check-in, y eso es lo que dice la pantalla al cerrar una meta.
 */
export default async function ObjetivosPage(props: PageProps<"/objetivos">) {
  const { nueva } = await props.searchParams
  const usuario = await requerirUsuario()
  const moneda = usuario.monedaBase

  const objetivos = await prisma.objetivo.findMany({
    where: { usuarioId: usuario.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      intencion: true,
      estado: true,
      createdAt: true,
      editableDesde: true,
      montoObjetivo: true,
      montoAcumulado: true,
    },
  })

  const activos = objetivos.filter((o) => o.estado === "activo")
  // Logradas y canceladas se pintan juntas abajo: las dos son historia.
  const cerrados = objetivos.filter((o) => o.estado !== "activo").reverse()
  const hayCupo = activos.length < MAX_OBJETIVOS_ACTIVOS

  const editable = (o: (typeof objetivos)[number]): ObjetivoEditable => ({
    id: o.id,
    intencion: o.intencion,
    montoObjetivo: o.montoObjetivo === null ? null : Number(o.montoObjetivo.toString()),
  })

  const botonNueva = (
    <Button variant="secondary" disabled={!hayCupo}>
      <Plus className="size-5" />
      Nueva intención
    </Button>
  )

  return (
    <div className="flex flex-col gap-8">
      <EncabezadoPagina
        titulo="Tus objetivos"
        descripcion="Tus intenciones guían el plan. La más antigua es la que la IA prioriza hoy."
        accion={
          hayCupo ? (
            <DialogoObjetivo moneda={moneda} trigger={botonNueva} />
          ) : (
            botonNueva
          )
        }
      />

      {/* RF-027: acaba de cerrar una meta y quedó un hueco. La propuesta va
          arriba, donde estaba la tarjeta que desapareció. */}
      {nueva === "1" && hayCupo && (
        <div className="flex flex-col gap-3 rounded-card border border-avance bg-avance-soft p-5">
          <div>
            <p className="text-seccion font-semibold text-balance text-ink">
              Cerraste una intención. ¿Qué sigue?
            </p>
            <p className="mt-1 max-w-[65ch] text-cuerpo text-ink-soft text-pretty">
              Tu plan se recalibra en tu próximo check-in con las intenciones que queden. Si ya
              sabes cuál es la siguiente, defínela ahora.
            </p>
          </div>
          <div>
            <DialogoObjetivo
              moneda={moneda}
              trigger={<Button variant="secondary">Definir una nueva intención</Button>}
            />
          </div>
        </div>
      )}

      {activos.length === 0 ? (
        <EstadoVacio
          mensaje={
            cerrados.length > 0
              ? "No te queda ninguna intención activa. Sin una, la IA no tiene qué priorizar en tu plan."
              : "Todavía no nos has dicho qué quieres lograr con tu dinero."
          }
          accion={
            <DialogoObjetivo
              moneda={moneda}
              trigger={<Button>Definir una intención</Button>}
            />
          }
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {activos.map((o, indice) => {
            const dias = diasParaEditar(o.editableDesde)
            const meta = o.montoObjetivo === null ? null : Number(o.montoObjetivo.toString())
            const acumulado = Number(o.montoAcumulado.toString())
            // Se recorta al 100%: apartar de más es haber llegado, no un 130%.
            const avance = meta && meta > 0 ? Math.min(100, (acumulado / meta) * 100) : null

            return (
              <li
                key={o.id}
                className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="max-w-[55ch] text-seccion font-medium text-balance text-ink">
                    {`"${o.intencion}"`}
                  </p>
                  <Badge tono={indice === 0 ? "primario" : "neutro"}>
                    {indice === 0 ? "Intención principal" : "Activa"}
                  </Badge>
                </div>

                <p className="text-menor text-ink-mute">{`Creada el ${formatearFecha(o.createdAt)}`}</p>

                {avance !== null && meta !== null && (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-menor tabular-nums text-ink-soft">
                      {`Llevas ${formatearMoneda(acumulado, moneda)} de ${formatearMoneda(meta, moneda)} · ${formatearPorcentaje(avance)}`}
                    </p>
                    {/* Decorativa: la cifra de arriba ya dice lo mismo en
                        palabras, así que la barra no necesita rol ni etiqueta. */}
                    <div
                      aria-hidden="true"
                      className="h-1.5 w-full overflow-hidden rounded-campo bg-surface-alt"
                    >
                      <div className="h-full bg-avance" style={{ width: `${avance}%` }} />
                    </div>
                    <p className="text-menor text-ink-mute">
                      Lo apartado lo reportas tú en cada check-in.
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                  {dias === 0 ? (
                    <DialogoObjetivo
                      objetivo={editable(o)}
                      moneda={moneda}
                      trigger={
                        <Button variant="ghost" size="sm">
                          Editar intención
                        </Button>
                      }
                    />
                  ) : (
                    // RF-025. El porqué va con el dato: un candado sin motivo
                    // se lee como un fallo de la app.
                    <p className="max-w-[55ch] text-menor text-ink-mute text-pretty">
                      {`Podrás editarla en ${dias} ${dias === 1 ? "día" : "días"}. Así evitamos cambios impulsivos que rompan tu plan.`}
                    </p>
                  )}
                  <BotonLogrado id={o.id} />
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {!hayCupo && (
        <p className="text-menor text-ink-mute">
          {`Ya tienes ${MAX_OBJETIVOS_ACTIVOS} intenciones activas, que es el máximo. Marca una como lograda si quieres perseguir otra: repartir la misma plata entre más metas no la multiplica.`}
        </p>
      )}

      {cerrados.length > 0 && (
        <section aria-labelledby="cerradas-titulo" className="flex flex-col gap-3">
          <h2 id="cerradas-titulo" className="text-seccion font-semibold text-ink">
            Ya las cerraste
          </h2>
          <ul className="flex flex-col divide-y divide-line">
            {cerrados.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-2 py-2">
                <span className="text-menor text-ink-soft">{`"${o.intencion}"`}</span>
                <Badge tono={o.estado === "logrado" ? "avance" : "neutro"}>
                  {o.estado === "logrado" ? "Lograda" : "Cancelada"}
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
