"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { enviar } from "@/lib/api-cliente"

/**
 * "Ya la logré" (RF-027): cierra la intención y deja la pantalla proponiendo
 * una nueva.
 *
 * Pide un segundo clic porque no se puede deshacer: una intención cerrada no
 * se reabre, se vuelve a crear —y volver a crearla arranca otros 30 días de
 * compromiso—.
 *
 * La propuesta no se monta aquí: al terminar se navega a `?nueva=1` y es la
 * página, que ya sabe cuántas intenciones quedan activas, la que decide si
 * ofrecer el hueco libre o callarse porque no lo hay.
 */
export function BotonLogrado({ id }: { id: string }) {
  const router = useRouter()
  const [confirmando, setConfirmando] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function marcar() {
    if (!confirmando) {
      setConfirmando(true)
      return
    }
    setError(null)
    setOcupado(true)
    const respuesta = await enviar<{ cupoLibre: boolean }>(
      `/api/objetivos/${id}/logrado`,
      "POST",
    )
    setOcupado(false)

    if (!respuesta.ok) {
      setError(respuesta.mensaje)
      setConfirmando(false)
      return
    }

    router.replace(respuesta.cupoLibre ? "/objetivos?nueva=1" : "/objetivos")
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button variant="ghost" size="sm" onClick={marcar} disabled={ocupado}>
        {confirmando ? "Sí, ya la logré. Se cierra para siempre" : "Ya la logré"}
      </Button>
      {error && (
        <p role="alert" className="text-menor text-deuda">
          {error}
        </p>
      )}
    </div>
  )
}
