"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { enviar } from "@/lib/api-cliente"

type Props = {
  usuario: { id: string; nombre: string; email: string }
  /** Se llama con el resumen de lo borrado. La tabla lo pinta y se refresca. */
  onLimpiado: (mensaje: string) => void
}

type Borrados = {
  objetivos: number
  deudas: number
  ingresos: number
  egresos: number
}

/**
 * Devuelve a alguien al onboarding (RF-065), con la confirmación que pide
 * RF-066.
 *
 * La confirmación no es un adorno: el botón vive en una fila de una tabla,
 * pegado al de bloquear, y un clic en la fila equivocada borraría los datos de
 * quien no era. Por eso el diálogo repite el nombre y el correo de la persona
 * —el dato que distingue una fila de otra—, dice qué se borra y qué se
 * conserva, y deja "Cancelar" como la salida natural.
 */
export function DialogoLimpiarOnboarding({ usuario, onLimpiado }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function limpiar() {
    setError(null)
    setOcupado(true)
    const respuesta = await enviar<{ borrados: Borrados }>(
      `/api/admin/usuarios/${usuario.id}/onboarding`,
      "DELETE",
    )
    setOcupado(false)

    if (!respuesta.ok) {
      setError(respuesta.mensaje)
      return
    }

    const { objetivos, deudas, ingresos, egresos } = respuesta.borrados
    const total = objetivos + deudas + ingresos + egresos
    setAbierto(false)
    onLimpiado(
      total === 0
        ? `${usuario.nombre} vuelve al onboarding. No había datos que borrar.`
        : `Onboarding de ${usuario.nombre} limpiado: ${objetivos} ${
            objetivos === 1 ? "intención" : "intenciones"
          }, ${deudas} ${deudas === 1 ? "deuda" : "deudas"}, ${ingresos} ${
            ingresos === 1 ? "ingreso" : "ingresos"
          } y ${egresos} ${egresos === 1 ? "gasto fijo" : "gastos fijos"}.`,
    )
  }

  return (
    <Dialog
      open={abierto}
      onOpenChange={(v) => {
        if (ocupado) return
        setAbierto(v)
        if (!v) setError(null)
      }}
    >
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          Limpiar onboarding
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Limpiar el onboarding</DialogTitle>
          <DialogDescription>
            {usuario.nombre} ({usuario.email}) volverá a pasar por los cuatro pasos la próxima
            vez que entre.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <p className="text-menor font-medium text-ink">Se borra:</p>
            <p className="text-menor text-ink-soft">
              Su intención, sus deudas, sus ingresos y sus gastos fijos. No se puede deshacer.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="text-menor font-medium text-ink">Se conserva:</p>
            <p className="text-menor text-ink-soft">
              Su cuenta y su contraseña, sus check-ins, sus planes anteriores, y los ingresos
              extra y gastos grandes que haya registrado.
            </p>
          </div>

          {error && (
            <p role="alert" className="text-menor text-deuda">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Button
              type="button"
              variant="peligro"
              className="sm:flex-1"
              onClick={limpiar}
              disabled={ocupado}
            >
              {ocupado ? "Limpiando…" : `Sí, limpiar el de ${usuario.nombre}`}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="sm:flex-1"
              onClick={() => setAbierto(false)}
              disabled={ocupado}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
