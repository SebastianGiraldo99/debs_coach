"use client"

import { useRouter } from "next/navigation"
import { useId, useState } from "react"

import { Button } from "@/components/ui/button"
import { CampoMoneda } from "@/components/ui/campo-moneda"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { enviar } from "@/lib/api-cliente"
import type { Moneda } from "@/lib/formato"

/**
 * Alta y edición de una intención (RF-022, RF-024), en el mismo diálogo.
 *
 * Son el mismo formulario: lo que cambia es el verbo del botón y el aviso de
 * que editar reinicia el compromiso de 30 días. Ese aviso va antes de guardar,
 * no después: enterarse del candado cuando ya no se puede deshacer es la peor
 * versión de la misma regla.
 *
 * Los ejemplos del onboarding no se repiten aquí. Quien ya está dentro de la
 * app tiene una intención escrita delante y no arranca de una página en blanco.
 */

export type ObjetivoEditable = {
  id: string
  intencion: string
  montoObjetivo: number | null
}

type Props = {
  trigger: React.ReactNode
  /** Sin objetivo es un alta. Con objetivo, la edición de ese. */
  objetivo?: ObjetivoEditable
  moneda: Moneda
}

export function DialogoObjetivo({ trigger, objetivo, moneda }: Props) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [intencion, setIntencion] = useState(objetivo?.intencion ?? "")
  const [montoObjetivo, setMontoObjetivo] = useState<number | null>(objetivo?.montoObjetivo ?? null)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const idIntencion = useId()

  const editando = objetivo !== undefined

  function restablecer() {
    setIntencion(objetivo?.intencion ?? "")
    setMontoObjetivo(objetivo?.montoObjetivo ?? null)
    setError(null)
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setOcupado(true)

    const cuerpo = { intencion: intencion.trim(), montoObjetivo }
    const respuesta = editando
      ? await enviar(`/api/objetivos/${objetivo.id}`, "PATCH", cuerpo)
      : await enviar("/api/objetivos", "POST", cuerpo)
    setOcupado(false)

    if (!respuesta.ok) {
      setError(respuesta.mensaje)
      return
    }

    setAbierto(false)
    setError(null)
    router.refresh()
  }

  return (
    <Dialog
      open={abierto}
      onOpenChange={(v) => {
        if (ocupado) return
        setAbierto(v)
        if (!v) restablecer()
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editando ? "Editar intención" : "Nueva intención"}</DialogTitle>
          <DialogDescription>
            {editando
              ? "Al guardar, esta intención vuelve a quedar fija otros 30 días."
              : "Escríbela con tus palabras. Es lo que la IA prioriza al armar tu plan."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={guardar} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={idIntencion}>Tu intención</Label>
            <Textarea
              id={idIntencion}
              rows={4}
              placeholder="Ej: Quiero saldar mis deudas lo más rápido posible"
              value={intencion}
              onChange={(e) => setIntencion(e.target.value)}
              disabled={ocupado}
            />
          </div>

          {/* Opcional, y la ayuda dice cuándo dejarlo vacío: preguntarlo sin
              explicar lleva a que la gente invente un número, y ese número
              pinta una barra de progreso que no significa nada. */}
          <CampoMoneda
            etiqueta="¿Cuánto necesitas para lograrla?"
            ayuda="Solo si tu meta es juntar una cantidad. Si es salir de deudas, déjalo vacío."
            opcional
            valor={montoObjetivo}
            onValorChange={setMontoObjetivo}
            moneda={moneda}
            disabled={ocupado}
          />

          {error && (
            <p role="alert" className="text-menor text-deuda">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={ocupado || intencion.trim().length === 0}>
            {ocupado ? "Guardando…" : editando ? "Guardar cambios" : "Crear intención"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
