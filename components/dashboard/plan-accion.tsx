import { objetivos } from "@/lib/mock/objetivos"
import { planIA } from "@/lib/mock/plan"

// Tu plan (§6.4): los pasos restantes como lista numerada de texto, no tarjetas.
// Cada paso: una línea en negrita con la acción, una normal con el porqué.
// Debajo, las otras intenciones activas, una línea cada una (§22.4).
export function PlanAccion() {
  const otrasIntenciones = objetivos.filter((o) => o.estado === "activo").slice(1)

  return (
    <section aria-labelledby="plan-titulo" className="flex flex-col gap-4">
      <h2 id="plan-titulo" className="text-seccion font-semibold text-ink">
        Tu plan
      </h2>
      <ol className="flex list-decimal flex-col gap-4 pl-5 marker:text-ink-mute">
        {planIA.pasos.map((paso) => (
          <li key={paso.id} className="pl-1">
            <p className="font-semibold text-ink">{paso.accion}</p>
            <p className="mt-0.5 max-w-[65ch] text-ink-soft text-pretty">{paso.porque}</p>
          </li>
        ))}
      </ol>

      {otrasIntenciones.length > 0 && (
        <div className="mt-2 border-t border-line pt-4">
          <p className="text-micro font-medium uppercase tracking-wide text-ink-mute">
            Tus otras intenciones
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {otrasIntenciones.map((o) => (
              <li key={o.id} className="text-menor text-ink-soft">
                {`"${o.intencion}"`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
