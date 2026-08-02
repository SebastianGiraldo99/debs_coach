"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Campo } from "@/components/ui/campo"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

/** Envía una invitación (RF-001). El enlace vive 48 horas. */
export function DialogoInvitar({ plazasLibres }: { plazasLibres: number }) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [email, setEmail] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)

  const sinPlazas = plazasLibres <= 0

  async function invitar(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setExito(null)
    setEnviando(true)

    try {
      const respuesta = await fetch("/api/admin/invitaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const datos = await respuesta.json()

      if (!datos.ok) {
        setError(datos.mensaje ?? "No pudimos enviar la invitación.")
        return
      }

      setExito(`Invitación enviada a ${datos.email}.`)
      setEmail("")
      // Cambia el número de plazas libres, que lo calcula el servidor.
      router.refresh()
    } catch {
      setError("No pudimos conectar con el servidor.")
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog
      open={abierto}
      onOpenChange={(v) => {
        setAbierto(v)
        if (!v) {
          setError(null)
          setExito(null)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button disabled={sinPlazas}>Invitar a alguien</Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invitar a alguien</DialogTitle>
          <DialogDescription>
            Le llega un enlace para crear su cuenta. Dura 48 horas, y después
            tendrás que aprobarla tú.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={invitar} className="flex flex-col gap-5" noValidate>
          <Campo
            etiqueta="Correo"
            type="email"
            autoComplete="off"
            placeholder="Ej: camila@correo.com"
            ayuda={`Quedan ${plazasLibres} ${plazasLibres === 1 ? "plaza" : "plazas"}.`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error ?? undefined}
            required
          />

          {exito && (
            <p role="status" className="text-menor text-avance">
              {exito}
            </p>
          )}

          <Button type="submit" disabled={enviando || sinPlazas}>
            {enviando ? "Enviando…" : "Enviar invitación"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
