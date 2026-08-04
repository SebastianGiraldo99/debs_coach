import { formatearFecha } from "@/lib/formato"
import type { PasoPlan } from "@/lib/ia/schema"

/**
 * Tu plan (§6.4): los pasos restantes como lista numerada de texto, no
 * tarjetas. Cada paso: una línea en negrita con la acción, una normal con el
 * porqué. Debajo, las otras intenciones activas, una línea cada una (§22.4).
 */

type Props = {
  pasos: PasoPlan[]
  otrasIntenciones: string[]
  generadoEn: Date | null
  /** Las cifras sobre las que se dio el consejo ya no son las de hoy. */
  desactualizado: boolean
}

export function PlanAccion({ pasos, otrasIntenciones, generadoEn, desactualizado }: Props) {
  return (
    <section aria-labelledby="plan-titulo" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="plan-titulo" className="text-seccion font-semibold text-ink">
          Tu plan
        </h2>
        {generadoEn && (
          <p className="text-menor text-ink-mute">
            {`Generado el ${formatearFecha(generadoEn)}`}
            {/* Los montos de la prosa son los de ese día. Decirlo evita que el
                usuario los compare con las cifras de arriba y concluya que la
                app se equivoca. */}
            {desactualizado && ", con las cifras que tenías entonces"}
          </p>
        )}
      </div>

      {pasos.length > 0 && (
        <ol className="flex list-decimal flex-col gap-4 pl-5 marker:text-ink-mute">
          {pasos.map((paso) => (
            <li key={paso.id} className="pl-1">
              <p className="font-semibold text-ink">{paso.accion}</p>
              <p className="mt-0.5 max-w-[65ch] text-ink-soft text-pretty">{paso.porque}</p>
            </li>
          ))}
        </ol>
      )}

      {otrasIntenciones.length > 0 && (
        <div className="mt-2 border-t border-line pt-4">
          <p className="text-micro font-medium uppercase tracking-wide text-ink-mute">
            Tus otras intenciones
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {otrasIntenciones.map((intencion) => (
              <li key={intencion} className="text-menor text-ink-soft">
                {`"${intencion}"`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
