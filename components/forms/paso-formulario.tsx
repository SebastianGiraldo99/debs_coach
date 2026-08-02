import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

// Contenedor multi-paso (§15.5): indicador de progreso en texto + barra 2px,
// h1 como pregunta, botonera fija al fondo en móvil.
export function PasoFormulario({
  paso,
  totalPasos,
  pregunta,
  explicacion,
  children,
  botonera,
}: {
  paso: number
  totalPasos: number
  pregunta: string
  explicacion?: string
  children: ReactNode
  botonera: ReactNode
}) {
  const progreso = Math.round((paso / totalPasos) * 100)

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="mx-auto w-full max-w-xl flex-1 px-4 py-6 sm:px-8 sm:py-10">
        <p className="text-micro font-medium uppercase tracking-wide text-ink-mute">
          {`Paso ${paso} de ${totalPasos}`}
        </p>
        <div
          className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-valuenow={paso}
          aria-valuemin={1}
          aria-valuemax={totalPasos}
          aria-label={`Paso ${paso} de ${totalPasos}`}
        >
          <div className="h-full bg-primary transition-all" style={{ width: `${progreso}%` }} />
        </div>

        <h1 className="mt-6 text-titulo font-semibold text-balance text-ink">{pregunta}</h1>
        {explicacion && (
          <p className="mt-2 max-w-[65ch] text-cuerpo text-ink-soft text-pretty">{explicacion}</p>
        )}

        <div className="mt-8">{children}</div>
      </div>

      <div className={cn("sticky bottom-0 border-t border-line bg-paper")}>
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3 px-4 py-4 sm:px-8">
          {botonera}
        </div>
      </div>
    </div>
  )
}
