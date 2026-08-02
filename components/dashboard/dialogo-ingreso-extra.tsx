"use client"

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

// Registrar ingreso extra (§16): tres campos (monto, descripción, fecha).
// En el MVP visual, al enviar simplemente cierra.
export function DialogoIngresoExtra({ trigger }: { trigger: React.ReactNode }) {
  const [abierto, setAbierto] = useState(false)
  const [monto, setMonto] = useState<number | null>(null)
  const [descripcion, setDescripcion] = useState("")
  const hoy = new Date().toISOString().slice(0, 10)
  const [fecha, setFecha] = useState(hoy)

  const registrar = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: conectar API — recalcula el plan (RF-020). En el MVP solo cierra.
    setAbierto(false)
    setMonto(null)
    setDescripcion("")
    setFecha(hoy)
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar ingreso extra</DialogTitle>
          <DialogDescription>
            Un dinero que no entra todos los meses. Ajustaremos tu plan con esto.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={registrar} className="flex flex-col gap-5">
          <CampoMoneda etiqueta="¿Cuánto recibiste?" valor={monto} onValorChange={setMonto} />
          <Campo
            etiqueta="¿De qué fue?"
            placeholder="Ej: Freelance de logotipo"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
          <Campo
            etiqueta="¿Cuándo?"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
          <Button type="submit" className="w-full">
            Registrar ingreso
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
