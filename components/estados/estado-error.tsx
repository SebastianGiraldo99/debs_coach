import type { ReactNode } from "react"
import { AlertCircle } from "lucide-react"

// Error (§18): qué pasó y qué hacer. Rojo nunca; ámbar de atención.
export function EstadoError({
  titulo = "No pudimos generar tu plan.",
  cuerpo = "Tus datos están guardados. Intenta de nuevo en un momento.",
  accion,
}: {
  titulo?: string
  cuerpo?: string
  accion?: ReactNode
}) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-card border border-atencion-mid bg-atencion-soft p-5"
    >
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 size-5 shrink-0 text-atencion-mid" aria-hidden="true" />
        <div className="max-w-[65ch]">
          <h2 className="text-seccion font-semibold text-atencion">{titulo}</h2>
          <p className="mt-1 text-cuerpo text-atencion text-pretty">{cuerpo}</p>
        </div>
      </div>
      {accion && <div className="pl-7">{accion}</div>}
    </div>
  )
}
