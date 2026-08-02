"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Campo } from "@/components/ui/campo"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const entrar = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: conectar API. En el MVP solo navega al dashboard.
    router.push("/dashboard")
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-titulo font-semibold text-ink">Bienvenido de nuevo</h1>
        <p className="mt-1 text-cuerpo text-ink-soft">Entra para ver tu siguiente paso.</p>
      </div>

      <form onSubmit={entrar} className="flex flex-col gap-5">
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
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" className="w-full">
          Entrar
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
