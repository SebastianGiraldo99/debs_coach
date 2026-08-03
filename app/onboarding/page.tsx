"use client"

import { useRouter } from "next/navigation"
import * as React from "react"

import { enviar } from "@/lib/api-cliente"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatearMoneda, type Moneda } from "@/lib/formato"

const OPCIONES: { valor: Moneda; nombre: string; ejemplo: number }[] = [
  { valor: "COP", nombre: "Pesos colombianos", ejemplo: 4800000 },
  { valor: "USD", nombre: "Dólares", ejemplo: 1200 },
]

// Bienvenida al onboarding (§4.4). Antes de pedir el primer monto hay que saber
// en qué moneda está denominado: sin tasas de cambio, todos los montos de una
// persona comparten moneda y no se pueden mezclar (§14).
export default function OnboardingPage() {
  const router = useRouter()
  const [moneda, setMoneda] = React.useState<Moneda>("COP")
  const [guardando, setGuardando] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function empezar() {
    setError(null)
    setGuardando(true)
    const r = await enviar("/api/usuario", "PATCH", { monedaBase: moneda })
    setGuardando(false)
    if (!r.ok) {
      setError(r.mensaje)
      return
    }
    router.push("/onboarding/intencion")
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl">
        <p className="text-micro font-medium uppercase tracking-wide text-ink-mute">Bienvenida</p>
        <h1 className="mt-3 text-titulo font-semibold text-balance text-ink">
          Vamos a entender tu situación en cuatro pasos.
        </h1>
        <p className="mt-3 max-w-[65ch] text-cuerpo text-ink-soft text-pretty">
          Primero tu intención, luego tus deudas, tus ingresos y tus gastos fijos. Con eso armamos
          tu primer plan. Puedes editar todo cuando quieras.
        </p>

        <fieldset className="mt-8">
          <legend className="text-menor font-medium text-ink">¿En qué moneda manejas tu dinero?</legend>
          <p className="mt-1 text-menor text-ink-mute">
            Es la moneda en la que registrarás todo. Por ahora tus deudas e ingresos deben estar en
            la misma; más adelante podrás mezclarlas.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {OPCIONES.map((opcion) => {
              const activa = moneda === opcion.valor
              return (
                <label
                  key={opcion.valor}
                  className={cn(
                    "flex cursor-pointer flex-col gap-1 rounded-card border bg-surface p-4",
                    "focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary",
                    activa ? "border-primary" : "border-line-strong",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="moneda"
                      value={opcion.valor}
                      checked={activa}
                      onChange={() => setMoneda(opcion.valor)}
                      className="size-4 accent-primary"
                    />
                    <span className="text-cuerpo text-ink">{opcion.nombre}</span>
                  </span>
                  <span className="pl-6 text-menor tabular-nums text-ink-mute">
                    {formatearMoneda(opcion.ejemplo, opcion.valor)}
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="mt-6 text-menor text-deuda">
            {error}
          </p>
        )}

        <div className="mt-8">
          <Button onClick={empezar} disabled={guardando}>
            {guardando ? "Guardando…" : "Empezar"}
          </Button>
        </div>
      </div>
    </main>
  )
}
