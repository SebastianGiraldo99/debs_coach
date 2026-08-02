"use client"

import { useState } from "react"
import { Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CampoMoneda } from "@/components/ui/campo-moneda"
import { mensajeCheckin } from "@/lib/mock/plan"

// Flujo de check-in (RF-030/031): el usuario registra cuánto abonó y recibe un
// mensaje motivacional con el ajuste sugerido. En el MVP visual, al enviar
// mostramos el mensaje mock.
export function CheckinFormulario() {
  const [enviado, setEnviado] = useState(false)
  const [pago, setPago] = useState<number | null>(null)

  if (enviado) {
    return (
      <section
        aria-live="polite"
        className="flex flex-col gap-3 rounded-card border border-line bg-surface p-6 shadow-card"
      >
        <div className="flex items-center gap-2 text-avance">
          <Check className="size-5" aria-hidden="true" />
          <p className="text-micro font-medium uppercase tracking-wide">Buen trabajo</p>
        </div>
        <h2 className="text-seccion font-semibold text-balance text-ink">{mensajeCheckin.titulo}</h2>
        <p className="max-w-[65ch] text-cuerpo text-ink-soft text-pretty">{mensajeCheckin.cuerpo}</p>
        <div className="pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEnviado(false)
              setPago(null)
            }}
          >
            Registrar otro
          </Button>
        </div>
      </section>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        setEnviado(true)
      }}
      className="flex flex-col gap-5 rounded-card border border-line bg-surface p-6"
    >
      <CampoMoneda
        etiqueta="¿Cuánto abonaste este mes?"
        ayuda="Suma todo lo que pagaste a tus deudas"
        valor={pago}
        onValorChange={setPago}
      />
      <Button type="submit" disabled={pago == null || pago <= 0} className="self-start">
        Registrar check-in
      </Button>
    </form>
  )
}
