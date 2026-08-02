"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { PasoFormulario } from "@/components/forms/paso-formulario"

const ejemplos = [
  "Quiero saldar mis deudas lo más rápido posible",
  "Quiero ahorrar para la cuota inicial de un apartamento",
  "Quiero dejar de vivir al día",
]

export default function OnboardingIntencionPage() {
  const router = useRouter()
  const [intencion, setIntencion] = useState("")

  const continuar = () => {
    // TODO: conectar API. En el MVP navega al siguiente paso.
    router.push("/onboarding/deudas")
  }

  return (
    <PasoFormulario
      paso={1}
      totalPasos={4}
      pregunta="¿Qué quieres lograr con tu dinero?"
      explicacion="Escríbelo con tus palabras. Esta intención es el corazón de tu plan: con ella la IA sabe qué priorizar."
      botonera={
        <>
          <Button variant="ghost" asChild>
            <Link href="/onboarding">Atrás</Link>
          </Button>
          <Button onClick={continuar} disabled={intencion.trim().length === 0}>
            Continuar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="intencion" className="text-menor font-medium text-ink">
            Tu intención
          </label>
          <Textarea
            id="intencion"
            rows={4}
            placeholder="Ej: Quiero saldar mis deudas lo más rápido posible"
            value={intencion}
            onChange={(e) => setIntencion(e.target.value)}
          />
        </div>

        <div>
          <p className="text-menor text-ink-mute">O empieza con uno de estos:</p>
          <div className="mt-2 flex flex-col gap-2">
            {ejemplos.map((ejemplo) => (
              <button
                key={ejemplo}
                type="button"
                onClick={() => setIntencion(ejemplo)}
                className="rounded-campo border border-line bg-surface px-3 py-2 text-left text-menor text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
              >
                {`"${ejemplo}"`}
              </button>
            ))}
          </div>
        </div>
      </div>
    </PasoFormulario>
  )
}
