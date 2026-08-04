"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { enviar } from "@/lib/api-cliente"

/**
 * Reintento del primer plan.
 *
 * El onboarding entra al dashboard aunque el Motor IA haya fallado —dejar a
 * alguien atrapado en un formulario ya cerrado es peor—, así que existe el
 * caso "cuenta completa, sin plan". Esta es su salida.
 *
 * El trigger es `onboarding` y no otro: sigue siendo el plan inicial, el que
 * no llegó a generarse. El motor no repite si acaba de hacer uno.
 */
export function BotonGenerarPlan() {
  const router = useRouter()
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generar() {
    setError(null)
    setGenerando(true)
    const respuesta = await enviar("/api/ia/generar-plan", "POST", { trigger: "onboarding" })
    setGenerando(false)

    if (!respuesta.ok) {
      setError(respuesta.mensaje)
      return
    }
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={generar} disabled={generando}>
        {generando ? "Armando tu plan…" : "Generar mi plan"}
      </Button>
      {generando && (
        <p aria-live="polite" className="text-menor text-ink-soft">
          Estamos leyendo tus números. Puede tardar unos segundos.
        </p>
      )}
      {error && (
        <p role="alert" className="text-menor text-deuda">
          {error}
        </p>
      )}
    </div>
  )
}
