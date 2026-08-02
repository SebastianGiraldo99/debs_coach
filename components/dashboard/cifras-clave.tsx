import { formatearMeses, formatearMoneda } from "@/lib/formato"
import { cifrasClave } from "@/lib/mock/plan"
import { usuario } from "@/lib/mock/usuario"

// Tres cifras. Exactamente tres (§6.3). Etiqueta micro arriba, cifra grande
// tabular-nums, y una línea de contexto en prosa. Sin íconos ni flechas.
function Cifra({ etiqueta, valor, contexto }: { etiqueta: string; valor: string; contexto: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-micro font-medium uppercase tracking-wide text-ink-mute">{etiqueta}</p>
      <p className="text-cifra font-semibold tabular-nums text-ink">{valor}</p>
      <p className="text-menor text-ink-soft text-pretty">{contexto}</p>
    </div>
  )
}

export function CifrasClave() {
  return (
    <section aria-label="Cifras clave" className="grid gap-6 sm:grid-cols-3">
      <Cifra
        etiqueta="Disponible este mes"
        valor={formatearMoneda(cifrasClave.disponible, usuario.monedaBase)}
        contexto={cifrasClave.disponibleContexto}
      />
      <Cifra
        etiqueta="Deuda total"
        valor={formatearMoneda(cifrasClave.deudaTotal, usuario.monedaBase)}
        contexto={cifrasClave.deudaContexto}
      />
      <Cifra
        etiqueta="Faltan"
        valor={formatearMeses(cifrasClave.mesesFaltan)}
        contexto={cifrasClave.mesesContexto}
      />
    </section>
  )
}
