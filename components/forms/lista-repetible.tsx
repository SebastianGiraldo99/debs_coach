"use client"

import type { ReactNode } from "react"
import { Plus, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { formatearMoneda, type Moneda } from "@/lib/formato"

// Lista repetible (§15.4): cada registro es una fila con borde, botón "Agregar
// otra" con ícono Plus, eliminar con X + aria-label, total al pie.
export function ListaRepetible({
  filas,
  onAgregar,
  onEliminar,
  textoAgregar,
  etiquetaEliminar,
  mensajeVacio,
  total,
  moneda = "COP",
  pedirConfirmacion = false,
}: {
  filas: ReactNode[]
  onAgregar: () => void
  onEliminar: (indice: number) => void
  textoAgregar: string
  etiquetaEliminar: string
  mensajeVacio: string
  total?: number
  /** Moneda de denominación de los montos de la lista. */
  moneda?: Moneda
  pedirConfirmacion?: boolean
}) {
  const manejarEliminar = (indice: number) => {
    if (pedirConfirmacion) {
      const ok = window.confirm("¿Seguro que quieres eliminar este registro?")
      if (!ok) return
    }
    onEliminar(indice)
  }

  return (
    <div className="flex flex-col gap-4">
      {filas.length === 0 && <p className="text-cuerpo text-ink-mute">{mensajeVacio}</p>}

      {filas.map((fila, indice) => (
        <div
          key={indice}
          className="flex items-start gap-3 rounded-card border border-line bg-surface p-4"
        >
          <div className="min-w-0 flex-1">{fila}</div>
          <button
            type="button"
            onClick={() => manejarEliminar(indice)}
            aria-label={etiquetaEliminar}
            className={cn(
              "mt-1 rounded-campo p-1 text-ink-mute transition-colors hover:text-deuda",
            )}
          >
            <X className="size-5" />
          </button>
        </div>
      ))}

      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={onAgregar}>
          <Plus className="size-5" />
          {textoAgregar}
        </Button>
        {total != null && (
          <p className="text-seccion font-semibold tabular-nums text-ink">
            Total: {formatearMoneda(total, moneda)}
          </p>
        )}
      </div>
    </div>
  )
}
