"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { useState } from "react"

import { cn } from "@/lib/utils"

/**
 * Antes era un <Link href="/login"> que no cerraba nada: la cookie seguía
 * viva, así que el proxy devolvía al usuario a su panel de inmediato y
 * "Salir" no hacía nada visible.
 */
function BotonSalir() {
  const router = useRouter()
  const [saliendo, setSaliendo] = useState(false)

  async function salir() {
    setSaliendo(true)
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch {
      // Da igual: si la petición no llegó, la sesión sigue y el proxy nos
      // devolverá al panel. No hay estado a medias que reparar.
    }
    // refresh() limpia el caché del router, que si no conservaría las
    // páginas privadas ya renderizadas.
    router.refresh()
    router.push("/login")
  }

  return (
    <button
      type="button"
      onClick={salir}
      disabled={saliendo}
      className="flex shrink-0 items-center gap-1.5 text-menor text-ink-soft transition-colors hover:text-ink disabled:opacity-60"
    >
      <LogOut className="size-4" />
      <span>{saliendo ? "Saliendo…" : "Salir"}</span>
    </button>
  )
}

const enlaces = [
  { href: "/dashboard", texto: "Inicio" },
  { href: "/objetivos", texto: "Objetivos" },
  { href: "/deudas", texto: "Deudas" },
  { href: "/ingresos", texto: "Ingresos" },
  { href: "/checkin", texto: "Check-in" },
]

export function NavPrincipal({ variante = "usuario" }: { variante?: "usuario" | "admin" }) {
  const pathname = usePathname()

  return (
    <header className="border-b border-line bg-paper">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-4 px-4 sm:px-8">
        <Link href={variante === "admin" ? "/admin" : "/dashboard"} className="shrink-0 font-semibold text-ink">
          Coach Financiero
        </Link>

        {variante === "usuario" && (
          <nav
            aria-label="Navegación principal"
            className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto"
          >
            {enlaces.map((enlace) => {
              const activo = pathname === enlace.href
              return (
                <Link
                  key={enlace.href}
                  href={enlace.href}
                  aria-current={activo ? "page" : undefined}
                  className={cn(
                    "shrink-0 border-b-2 px-2 py-4 text-menor transition-colors",
                    activo
                      ? "border-primary text-ink"
                      : "border-transparent text-ink-soft hover:text-ink",
                  )}
                >
                  {enlace.texto}
                </Link>
              )
            })}
          </nav>
        )}

        {variante === "admin" && <span className="flex-1 text-menor text-ink-mute">Administración</span>}

        <BotonSalir />
      </div>
    </header>
  )
}
