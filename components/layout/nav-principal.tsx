"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut } from "lucide-react"

import { cn } from "@/lib/utils"

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

        <Link
          href="/login"
          className="flex shrink-0 items-center gap-1.5 text-menor text-ink-soft hover:text-ink"
        >
          <LogOut className="size-4" />
          <span>Salir</span>
        </Link>
      </div>
    </header>
  )
}
