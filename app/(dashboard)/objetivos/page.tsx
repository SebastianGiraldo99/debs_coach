import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EncabezadoPagina } from "@/components/layout/encabezado-pagina"
import { objetivos, type EstadoObjetivo } from "@/lib/mock/objetivos"
import { formatearFecha } from "@/lib/formato"

const etiquetaEstado: Record<EstadoObjetivo, string> = {
  activo: "Activo",
  pausado: "Pausado",
  logrado: "Logrado",
}

const tonoEstado: Record<EstadoObjetivo, "primario" | "neutro" | "avance"> = {
  activo: "primario",
  pausado: "neutro",
  logrado: "avance",
}

export default function ObjetivosPage() {
  return (
    <div className="flex flex-col gap-8">
      <EncabezadoPagina
        titulo="Tus objetivos"
        descripcion="Tus intenciones guían el plan. La más antigua es la que la IA prioriza hoy."
        accion={
          <Button variant="secondary">
            <Plus className="size-5" />
            Nueva intención
          </Button>
        }
      />

      <ul className="flex flex-col gap-4">
        {objetivos.map((o, indice) => {
          const dominante = indice === 0 && o.estado === "activo"
          const editable = o.diasParaEditar === 0
          return (
            <li
              key={o.id}
              className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="max-w-[55ch] text-seccion font-medium text-balance text-ink">
                  {`"${o.intencion}"`}
                </p>
                <Badge tono={tonoEstado[o.estado]}>{etiquetaEstado[o.estado]}</Badge>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-menor text-ink-mute">
                <span>Creada el {formatearFecha(o.creadoEn)}</span>
                {dominante && <span className="text-primary">Intención principal</span>}
              </div>

              <div className="flex items-center gap-3 border-t border-line pt-3">
                {editable ? (
                  <Button variant="ghost" size="sm">
                    Editar intención
                  </Button>
                ) : (
                  <p className="text-menor text-ink-mute">
                    Podrás editarla en {o.diasParaEditar} días. Así evitamos cambios impulsivos que
                    rompan tu plan.
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
