"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Campo } from "@/components/ui/campo"

export default function RegisterPage() {
  const router = useRouter()
  const [nombre, setNombre] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmacion, setConfirmacion] = useState("")
  const [errorConfirmacion, setErrorConfirmacion] = useState<string | undefined>()

  const crear = (e: React.FormEvent) => {
    e.preventDefault()
    // Validación visual simulada al enviar (§3): sin persistencia real.
    if (confirmacion && confirmacion !== password) {
      setErrorConfirmacion("Las contraseñas no coinciden")
      return
    }
    // TODO: conectar API. En el MVP navega al onboarding.
    router.push("/onboarding")
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-titulo font-semibold text-ink">Crea tu cuenta</h1>
        <p className="mt-1 text-cuerpo text-ink-soft">Toma menos de un minuto.</p>
      </div>

      <form onSubmit={crear} className="flex flex-col gap-5">
        <Campo
          etiqueta="¿Cómo te llamas?"
          autoComplete="name"
          placeholder="Ej: Camila"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
        <Campo
          etiqueta="Correo"
          type="email"
          autoComplete="email"
          placeholder="Ej: camila@correo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Campo
          etiqueta="Contraseña"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Campo
          etiqueta="Repite la contraseña"
          type="password"
          autoComplete="new-password"
          error={errorConfirmacion}
          value={confirmacion}
          onChange={(e) => {
            setConfirmacion(e.target.value)
            if (errorConfirmacion) setErrorConfirmacion(undefined)
          }}
          onBlur={() => {
            if (confirmacion && confirmacion !== password) {
              setErrorConfirmacion("Las contraseñas no coinciden")
            }
          }}
        />
        <Button type="submit" className="w-full">
          Crear cuenta
        </Button>
      </form>

      <p className="text-menor text-ink-soft">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="text-primary hover:text-primary-hover">
          Entrar
        </Link>
      </p>
    </div>
  )
}
