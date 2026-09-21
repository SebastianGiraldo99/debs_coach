"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { enviar } from "@/lib/api-cliente"

/**
 * Recalcular el plan con los datos de hoy (RF-068).
 *
 * Solo se pinta para quien tiene el permiso que da el admin; la página lo
 * decide y el endpoint lo vuelve a comprobar. Sin icono a propósito: es un
 * botón de texto y así no hereda el problema de los iconos de lucide
 * renderizados en el servidor.
 */
export function BotonRecalcularPlan() {
  const router = useRouter()
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function recalcular() {
    setError(null)
    setGenerando(true)
    const respuesta = await enviar("/api/ia/recalcular-plan", "POST")
    setGenerando(false)

    if (!respuesta.ok) {
      setError(respuesta.mensaje)
      return
    }
    router.refresh()
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button variant="secondary" size="sm" onClick={recalcular} disabled={generando}>
        {generando ? "Recalculando…" : "Recalcular con mis datos de hoy"}
      </Button>
      {generando && (
        <p aria-live="polite" className="text-menor text-ink-soft">
          Estamos leyendo tus números otra vez. Puede tardar unos segundos.
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
