"use client"

import { useRouter } from "next/navigation"
import { useId, useState } from "react"

import { Button } from "@/components/ui/button"
import { Campo } from "@/components/ui/campo"
import { CampoMoneda } from "@/components/ui/campo-moneda"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { enviar } from "@/lib/api-cliente"
import { etiquetasTipoDeuda, tiposDeuda, type TipoDeuda } from "@/lib/finanzas/etiquetas"
import type { Moneda } from "@/lib/formato"

/**
 * Alta y edición de una deuda (RF-024), en el mismo diálogo.
 *
 * Son el mismo formulario con los mismos campos: separarlos en dos
 * componentes duplicaría la validación y el trato al error para ganar un
 * título distinto. Lo que cambia es el verbo del botón y que, editando,
 * aparecen las dos acciones destructivas.
 *
 * No dispara el Motor IA: editar datos base no es uno de los tres
 * disparadores. El dashboard avisa cuando el plan se queda viejo.
 */

export type DeudaEditable = {
  id: string
  nombre: string
  tipo: TipoDeuda
  saldo: number
  tasaEA: number | null
  pagoMinimo: number | null
}

type Props = {
  trigger: React.ReactNode
  /** Sin deuda es un alta. Con deuda, la edición de esa. */
  deuda?: DeudaEditable
  moneda: Moneda
}

export function DialogoDeuda({ trigger, deuda, moneda }: Props) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [nombre, setNombre] = useState(deuda?.nombre ?? "")
  const [tipo, setTipo] = useState<TipoDeuda | "">(deuda?.tipo ?? "")
  const [saldo, setSaldo] = useState<number | null>(deuda?.saldo ?? null)
  const [tasaEA, setTasaEA] = useState<number | null>(deuda?.tasaEA ?? null)
  const [pagoMinimo, setPagoMinimo] = useState<number | null>(deuda?.pagoMinimo ?? null)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Eliminar pide un segundo clic. Es la única acción del diálogo que no se
  // puede deshacer, y el botón está justo debajo de las que sí.
  const [confirmando, setConfirmando] = useState(false)
  const idTipo = useId()

  const editando = deuda !== undefined

  function restablecer() {
    setNombre(deuda?.nombre ?? "")
    setTipo(deuda?.tipo ?? "")
    setSaldo(deuda?.saldo ?? null)
    setTasaEA(deuda?.tasaEA ?? null)
    setPagoMinimo(deuda?.pagoMinimo ?? null)
    setError(null)
    setConfirmando(false)
  }

  /** Cierra, repinta la pantalla con los datos nuevos y deja el form limpio. */
  function terminar() {
    setAbierto(false)
    setError(null)
    router.refresh()
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setOcupado(true)

    const cuerpo = { nombre, tipo, saldo, tasaEA, pagoMinimo }
    const respuesta = editando
      ? await enviar(`/api/deudas/${deuda.id}`, "PATCH", cuerpo)
      : await enviar("/api/deudas", "POST", cuerpo)
    setOcupado(false)

    if (!respuesta.ok) {
      setError(respuesta.mensaje)
      return
    }
    terminar()
  }

  async function saldar() {
    if (!deuda) return
    setError(null)
    setOcupado(true)
    const respuesta = await enviar(`/api/deudas/${deuda.id}`, "PATCH", { estado: "saldada" })
    setOcupado(false)
    if (!respuesta.ok) {
      setError(respuesta.mensaje)
      return
    }
    terminar()
  }

  async function eliminar() {
    if (!deuda) return
    if (!confirmando) {
      setConfirmando(true)
      return
    }
    setError(null)
    setOcupado(true)
    const respuesta = await enviar(`/api/deudas/${deuda.id}`, "DELETE")
    setOcupado(false)
    if (!respuesta.ok) {
      setError(respuesta.mensaje)
      return
    }
    terminar()
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
          <DialogTitle>{editando ? "Editar deuda" : "Agregar deuda"}</DialogTitle>
          <DialogDescription>
            {editando
              ? "Corrige lo que cambió. Tu plan actual se hizo con las cifras anteriores."
              : "Anota lo que debes hoy, no lo que pediste en su momento."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={guardar} className="flex flex-col gap-5">
          <Campo
            etiqueta="Nombre de la deuda"
            ayuda="Como la reconoces tú"
            placeholder="Ej: Tarjeta Visa"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            disabled={ocupado}
          />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={idTipo}>Tipo de deuda</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as TipoDeuda)} disabled={ocupado}>
              <SelectTrigger id={idTipo}>
                <SelectValue placeholder="Elige un tipo" />
              </SelectTrigger>
              <SelectContent>
                {tiposDeuda.map((clave) => (
                  <SelectItem key={clave} value={clave}>
                    {etiquetasTipoDeuda[clave]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <CampoMoneda
            etiqueta="¿Cuánto debes hoy?"
            valor={saldo}
            onValorChange={setSaldo}
            moneda={moneda}
            disabled={ocupado}
          />

          <Campo
            etiqueta="Tasa de interés"
            ayuda="Efectiva anual, si la conoces"
            opcional
            inputMode="decimal"
            placeholder="Ej: 32"
            value={tasaEA ?? ""}
            onChange={(e) => {
              const n = Number.parseFloat(e.target.value.replace(",", "."))
              setTasaEA(Number.isNaN(n) ? null : n)
            }}
            disabled={ocupado}
          />

          <CampoMoneda
            etiqueta="Pago mínimo mensual"
            ayuda="Lo que te exigen cada mes, si lo sabes"
            opcional
            valor={pagoMinimo}
            onValorChange={setPagoMinimo}
            moneda={moneda}
            disabled={ocupado}
          />

          {error && (
            <p role="alert" className="text-menor text-deuda">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={ocupado}>
            {ocupado ? "Guardando…" : editando ? "Guardar cambios" : "Agregar deuda"}
          </Button>

          {editando && (
            <div className="flex flex-col gap-2 border-t border-line pt-4">
              {/* Saldar y eliminar son cosas distintas y por eso son dos
                  botones: la primera se celebra en el historial, la segunda
                  solo corrige un dato que nunca debió estar. */}
              <Button type="button" variant="secondary" onClick={saldar} disabled={ocupado}>
                Ya la pagué toda
              </Button>
              <Button type="button" variant="peligro" onClick={eliminar} disabled={ocupado}>
                {confirmando ? "Sí, eliminar. No se puede deshacer" : "Eliminar esta deuda"}
              </Button>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}
