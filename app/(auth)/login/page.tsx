"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"

import { Button } from "@/components/ui/button"
import { Campo } from "@/components/ui/campo"

/** El proxy y el DAL redirigen aquí con ?error= cuando niegan el paso. */
const MENSAJES_REDIRECCION: Record<string, string> = {
  acceso:
    "Tu sesión no es válida o tu cuenta ya no está activa. Vuelve a entrar.",
}

function FormularioLogin() {
  const router = useRouter()
  const parametros = useSearchParams()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(
    MENSAJES_REDIRECCION[parametros.get("error") ?? ""] ?? null,
  )

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setEnviando(true)

    try {
      const respuesta = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const datos = await respuesta.json()

      if (!datos.ok) {
        setError(datos.mensaje ?? "No pudimos entrar. Intenta otra vez.")
        return
      }

      // refresh() antes de push(): la cookie de sesión acaba de cambiar y sin
      // esto el proxy decidiría con el caché del router, rebotando al login.
      router.refresh()
      router.push(datos.destino)
    } catch {
      setError("No pudimos conectar con el servidor. Revisa tu conexión.")
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-titulo font-semibold text-ink">Bienvenido de nuevo</h1>
        <p className="mt-1 text-cuerpo text-ink-soft">Entra para ver tu siguiente paso.</p>
      </div>

      <form onSubmit={entrar} className="flex flex-col gap-5" noValidate>
        <Campo
          etiqueta="Correo"
          type="email"
          autoComplete="email"
          placeholder="Ej: camila@correo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Campo
          etiqueta="Contraseña"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && (
          <p role="alert" className="text-menor text-deuda">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={enviando}>
          {enviando ? "Entrando…" : "Entrar"}
        </Button>
      </form>

      <p className="text-menor text-ink-soft">
        ¿No tienes cuenta?{" "}
        <Link href="/register" className="text-primary hover:text-primary-hover">
          Crear una
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  // useSearchParams obliga a un límite de Suspense para no forzar el render
  // dinámico de toda la ruta.
  return (
    <Suspense>
      <FormularioLogin />
    </Suspense>
  )
}
