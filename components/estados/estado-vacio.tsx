import type { ReactNode } from "react"

// Vacío (§18): una línea que explica y un botón que resuelve. Sin ilustración.
export function EstadoVacio({ mensaje, accion }: { mensaje: string; accion?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-card border border-line bg-surface p-5">
      <p className="text-cuerpo text-ink-soft text-pretty">{mensaje}</p>
      {accion}
    </div>
  )
}
