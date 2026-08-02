import type { ReactNode } from "react"

export function EncabezadoPagina({
  titulo,
  descripcion,
  accion,
}: {
  titulo: string
  descripcion?: string
  accion?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="max-w-[65ch]">
        <h1 className="text-titulo font-semibold text-balance text-ink">{titulo}</h1>
        {descripcion && <p className="mt-1 text-cuerpo text-ink-soft text-pretty">{descripcion}</p>}
      </div>
      {accion}
    </div>
  )
}
