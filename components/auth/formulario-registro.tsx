"use client"

import Link from "next/link"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Campo } from "@/components/ui/campo"

const MIN_PASSWORD = 8

export function FormularioRegistro({
  token,
  email,
}: {
  token: string
  email: string
}) {
  const [nombre, setNombre] = useState("")
  const [password, setPassword] = useState("")
  const [confirmacion, setConfirmacion] = useState("")
  const [errorConfirmacion, setErrorConfirmacion] = useState<string | undefined>()
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [listo, setListo] = useState(false)

  async function crear(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (confirmacion !== password) {
      setErrorConfirmacion("Las contraseñas no coinciden")
      return
    }
    if (password.length < MIN_PASSWORD) {
      setError(`La contraseña necesita al menos ${MIN_PASSWORD} caracteres.`)
      return
    }

    setEnviando(true)
    try {
      const respuesta = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, nombre, password }),
      })
      const datos = await respuesta.json()

      if (!datos.ok) {
        setError(datos.mensaje ?? "No pudimos crear tu cuenta. Intenta otra vez.")
        return
      }
      setListo(true)
    } catch {
      setError("No pudimos conectar con el servidor. Revisa tu conexión.")
    } finally {
      setEnviando(false)
    }
  }

  // El registro no da acceso: lo solicita. Decirlo aquí evita que el usuario
  // intente entrar y choque contra un login que parece rechazarlo.
  if (listo) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-titulo font-semibold text-ink">Tu cuenta quedó creada</h1>
          <p className="mt-1 text-cuerpo text-ink-soft">
            Falta que el administrador la apruebe. Te avisamos por correo a{" "}
            <span className="text-ink">{email}</span> en cuanto pase.
          </p>
        </div>
        <p className="text-menor text-ink-soft">
          <Link href="/login" className="text-primary hover:text-primary-hover">
            Volver a entrar
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-titulo font-semibold text-ink">Crea tu cuenta</h1>
        <p className="mt-1 text-cuerpo text-ink-soft">Toma menos de un minuto.</p>
      </div>

      <form onSubmit={crear} className="flex flex-col gap-5" noValidate>
        <Campo
          etiqueta="Correo"
          type="email"
          value={email}
          readOnly
          disabled
          ayuda="Es el correo al que llegó tu invitación. No se puede cambiar."
        />
        <Campo
          etiqueta="¿Cómo te llamas?"
          autoComplete="name"
          placeholder="Ej: Camila"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
        />
        <Campo
          etiqueta="Contraseña"
          type="password"
          autoComplete="new-password"
          ayuda={`Al menos ${MIN_PASSWORD} caracteres.`}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
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
          required
        />

        {error && (
          <p role="alert" className="text-menor text-deuda">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={enviando}>
          {enviando ? "Creando…" : "Crear cuenta"}
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
