"use client"

import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Campo } from "@/components/ui/campo"
import { CampoMoneda } from "@/components/ui/campo-moneda"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { enviar } from "@/lib/api-cliente"
import { formatearMoneda, type Moneda } from "@/lib/formato"

/**
 * Anotar un gasto grande y puntual (RF-047 a RF-049).
 *
 * Tres campos y ni uno más. **No hay selector de categoría** y no es un
 * descuido: categorizar un gasto grande invita a categorizarlos todos, y ahí
 * la app deja de ser un coach para volverse una hoja de cálculo. Por lo mismo
 * la pantalla no lleva contadores, rachas ni ningún refuerzo por anotar más.
 *
 * El texto de ayuda hace la mitad del trabajo: dice para qué es esto —una
 * matrícula, una reparación— y para qué no. La otra mitad la hace el umbral,
 * que rechaza en el servidor lo que no llega.
 */

/**
 * Hoy en la zona del navegador. `toISOString` daría la de UTC, que en Colombia
 * adelanta el día a partir de las 7 p.m. Es la misma función que usa el
 * diálogo de ingreso extra.
 */
function hoyLocal(): string {
  const ahora = new Date()
  return new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10)
}

type Props = {
  /** Ver `dialogo-gasto-fijo.tsx`: el icono nace aquí dentro, no en el servidor. */
  trigger?: React.ReactNode
  moneda: Moneda
  /**
   * Desde cuánto cuenta como grande. `null` cuando la persona no tiene
   * ingresos registrados y por tanto no hay umbral que calcular.
   *
   * Llega desde el servidor, que lo saca de `umbralGastoConsiderable`, para
   * que el texto no pueda contradecir a la validación.
   */
  umbral: number | null
}

export function DialogoGastoGrande({ trigger, moneda, umbral }: Props) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [monto, setMonto] = useState<number | null>(null)
  const [descripcion, setDescripcion] = useState("")
  const [fecha, setFecha] = useState(hoyLocal)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function limpiar() {
    setMonto(null)
    setDescripcion("")
    setFecha(hoyLocal())
    setError(null)
  }

  async function registrar(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setEnviando(true)

    const respuesta = await enviar("/api/egresos/extra", "POST", { monto, descripcion, fecha })
    setEnviando(false)

    if (!respuesta.ok) {
      setError(respuesta.mensaje)
      return
    }

    setAbierto(false)
    limpiar()
    router.refresh()
  }

  return (
    <Dialog
      open={abierto}
      onOpenChange={(v) => {
        if (enviando) return
        setAbierto(v)
        if (!v) limpiar()
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="secondary">
            <Plus className="size-5" />
            Anotar un gasto grande
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Anotar un gasto grande</DialogTitle>
          <DialogDescription>
            Algo que pagaste una vez y no se repite: una matrícula, una reparación, el impuesto del
            carro, un viaje. Lo descontamos de este mes, sin tocar tus gastos fijos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={registrar} className="flex flex-col gap-5">
          <CampoMoneda
            etiqueta="¿Cuánto pagaste?"
            ayuda={
              umbral === null
                ? undefined
                : `Desde ${formatearMoneda(umbral, moneda)}. Lo del día a día va en tus gastos fijos.`
            }
            valor={monto}
            onValorChange={setMonto}
            moneda={moneda}
            disabled={enviando}
          />
          <Campo
            etiqueta="¿De qué fue?"
            placeholder="Ej: Matrícula del semestre"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            disabled={enviando}
          />
          <Campo
            etiqueta="¿Cuándo lo pagaste?"
            type="date"
            max={hoyLocal()}
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            disabled={enviando}
          />

          {error && (
            <p role="alert" className="text-menor text-deuda">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={enviando}>
            {enviando ? "Guardando…" : "Anotar el gasto"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
