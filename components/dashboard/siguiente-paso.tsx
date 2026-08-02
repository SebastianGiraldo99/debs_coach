import { planIA } from "@/lib/mock/plan"

// Tu siguiente paso (§6.2): el elemento más prominente. Tarjeta con más padding,
// sin ícono grande, sin gradiente, sin botón de acción.
export function SiguientePaso() {
  const { siguientePaso } = planIA
  return (
    <section aria-labelledby="siguiente-paso-titulo" className="rounded-card border border-line bg-surface p-6 shadow-card">
      <p className="text-micro font-medium uppercase tracking-wide text-ink-mute">Tu siguiente paso</p>
      <h2 id="siguiente-paso-titulo" className="mt-2 text-seccion font-semibold text-balance text-ink">
        {siguientePaso.accion}
      </h2>
      <p className="mt-2 max-w-[65ch] text-cuerpo text-ink-soft text-pretty">{siguientePaso.porque}</p>
    </section>
  )
}
