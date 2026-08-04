"use client"

import { useRouter } from "next/navigation"
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
import type { Moneda } from "@/lib/formato"

/**
 * Registrar ingreso extra (§16, RF-018 a RF-020): tres campos —monto,
 * descripción, fecha— y un recálculo del plan al enviar.
 *
 * El diálogo se queda abierto mientras el motor trabaja, con el botón
 * anunciando en qué va. Cerrarlo antes dejaría al usuario mirando un
 * dashboard con el plan viejo sin saber si su dinero se registró.
 */

/** La fecha de hoy en la zona del navegador. `toISOString` daría la de UTC, que en Colombia adelanta el día a partir de las 7 p.m. */
function hoyLocal(): string {
  const ahora = new Date()
  return new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10)
}

export function DialogoIngresoExtra({
  trigger,
  moneda = "COP",
}: {
  trigger: React.ReactNode
  moneda?: Moneda
}) {
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

    const respuesta = await enviar<{ planActualizado: boolean; mensaje?: string }>(
      "/api/ingresos/extra",
      "POST",
      { monto, descripcion, fecha },
    )
    setEnviando(false)

    if (!respuesta.ok) {
      setError(respuesta.mensaje)
      return
    }

    // El ingreso quedó guardado aunque el plan no se haya podido recalcular;
    // se dice sin dramatizar y se cierra igual, porque el dato ya está a salvo.
    setAbierto(false)
    limpiar()
    router.refresh()
  }

  return (
    <Dialog
      open={abierto}
      onOpenChange={(v) => {
        // No se cierra a mitad de la llamada: el plan se está recalculando y
        // el diálogo es lo único que lo está contando.
        if (enviando) return
        setAbierto(v)
        if (!v) limpiar()
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar ingreso extra</DialogTitle>
          <DialogDescription>
            Un dinero que no entra todos los meses. Ajustaremos tu plan con esto.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={registrar} className="flex flex-col gap-5">
          <CampoMoneda
            etiqueta="¿Cuánto recibiste?"
            valor={monto}
            onValorChange={setMonto}
            moneda={moneda}
            disabled={enviando}
          />
          <Campo
            etiqueta="¿De qué fue?"
            placeholder="Ej: Freelance de logotipo"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            disabled={enviando}
          />
          <Campo
            etiqueta="¿Cuándo?"
            type="date"
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
            {enviando ? "Ajustando tu plan…" : "Registrar ingreso"}
          </Button>
          {enviando && (
            <p aria-live="polite" className="text-menor text-ink-soft">
              Guardamos el ingreso y estamos rehaciendo tu plan con ese dinero. Puede tardar unos
              segundos.
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}
