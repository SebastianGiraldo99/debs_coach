import type { ReactNode } from "react"

/**
 * Contenedor de un paso del check-in (§15.5): indicador en texto, barra de
 * 2px, la pregunta como encabezado y la botonera al pie.
 *
 * No reusa `PasoFormulario` del onboarding aunque se parezcan: aquel monta su
 * propio marco de página completa —`min-h-dvh`, su contenedor centrado, su
 * botonera pegada al fondo— porque vive fuera del área con navegación. Aquí ya
 * hay un layout con cabecera y ancho máximo, y meter el uno dentro del otro
 * duplicaría el chrome.
 */
export function PasoCheckin({
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
  return (
    <section className="flex flex-col gap-6">
      <div>
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
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${Math.round((paso / totalPasos) * 100)}%` }}
          />
        </div>

        <h2 className="mt-6 text-seccion font-semibold text-balance text-ink">{pregunta}</h2>
        {explicacion && (
          <p className="mt-2 max-w-[65ch] text-cuerpo text-ink-soft text-pretty">{explicacion}</p>
        )}
      </div>

      {children}

      <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
        {botonera}
      </div>
    </section>
  )
}
