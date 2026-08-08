"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LogOut, Menu, X } from "lucide-react"
import { useEffect, useId, useState } from "react"

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

/**
 * La navegación cambia de forma con el ancho (§6):
 *
 * - Desde `md` (768px), la fila de enlaces de siempre.
 * - Por debajo, un menú desplegable tras el botón de hamburguesa.
 *
 * La fila con scroll horizontal que había antes se probó en navegador y se
 * descartó: en un teléfono no se ve que haya más enlaces a la derecha, así que
 * media navegación quedaba escondida detrás de un gesto que nadie adivina.
 *
 * Sigue descartada la **tab bar inferior**: ahí abajo vive el botón fijo de
 * "Registrar ingreso extra" (§6.7) y competirían por el mismo pulgar.
 *
 * El corte va en `md` y no en `sm` para que la fila no llegue nunca a
 * desbordarse: a 640px los cinco enlaces más la marca y el botón de salir
 * caben justos, y "justo" en tipografía ajena al diseñador es "no cabe".
 */
export function NavPrincipal({ variante = "usuario" }: { variante?: "usuario" | "admin" }) {
  const pathname = usePathname()
  const [abierto, setAbierto] = useState(false)
  const idPanel = useId()

  // Escape cierra, como cualquier cosa que se abre encima del contenido.
  useEffect(() => {
    if (!abierto) return
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false)
    }
    document.addEventListener("keydown", alPulsar)
    return () => document.removeEventListener("keydown", alPulsar)
  }, [abierto])

  const claseEnlace = (activo: boolean, vertical: boolean) =>
    cn(
      "shrink-0 text-menor transition-colors",
      vertical
        ? // Vertical el marcador va a la izquierda: un borde inferior a todo
          // el ancho se lee como separador de lista, no como "estás aquí".
          "border-l-2 px-4 py-3"
        : "border-b-2 px-2 py-4",
      activo
        ? "border-primary text-ink"
        : "border-transparent text-ink-soft hover:text-ink",
    )

  return (
    <header className="relative border-b border-line bg-paper">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-4 px-4 sm:px-8">
        {/* Primero en el DOM, no solo a la izquierda: así el orden de
            tabulación empieza donde empieza la vista. */}
        {variante === "usuario" && (
          <button
            type="button"
            onClick={() => setAbierto((v) => !v)}
            aria-expanded={abierto}
            aria-controls={idPanel}
            aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
            // 44×44 de área táctil (§17), aunque el icono mida 24. El margen
            // negativo alinea el ICONO con el borde del contenido; sin él, lo
            // que queda alineado es la caja táctil y el dibujo se ve metido
            // hacia dentro.
            className="-ml-2 flex size-11 shrink-0 items-center justify-center text-ink-soft transition-colors hover:text-ink md:hidden"
          >
            {abierto ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        )}

        <Link href={variante === "admin" ? "/admin" : "/dashboard"} className="shrink-0 font-semibold text-ink">
          Coach Financiero
        </Link>

        {variante === "usuario" && (
          <nav
            aria-label="Navegación principal"
            className="hidden min-w-0 flex-1 items-center gap-1 md:flex"
          >
            {enlaces.map((enlace) => (
              <Link
                key={enlace.href}
                href={enlace.href}
                aria-current={pathname === enlace.href ? "page" : undefined}
                className={claseEnlace(pathname === enlace.href, false)}
              >
                {enlace.texto}
              </Link>
            ))}
          </nav>
        )}

        {variante === "admin" && <span className="flex-1 text-menor text-ink-mute">Administración</span>}

        {/* Escritorio: salir vive en la barra. En móvil se va dentro del menú,
            para que a 375px la barra sea solo la hamburguesa y la marca. */}
        <div className={cn("ml-auto", variante === "usuario" && "hidden md:block")}>
          <BotonSalir />
        </div>
      </div>

      {variante === "usuario" && abierto && (
        <>
          {/* Toca fuera y se cierra. Va detrás del panel y por delante del
              contenido, sin oscurecerlo: el menú no es un modal. */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setAbierto(false)}
            className="fixed inset-0 top-14 z-30 cursor-default md:hidden"
          />
          <nav
            id={idPanel}
            aria-label="Navegación principal"
            // Un solo manejador para todo el panel: tocar cualquier enlace lo
            // cierra. Reaccionar al cambio de `pathname` con un efecto haría lo
            // mismo, pero encadenando un render de más —y tocar el enlace de la
            // página actual no cambia la ruta, así que el menú se quedaría
            // abierto—.
            onClick={() => setAbierto(false)}
            className="absolute inset-x-0 top-full z-40 flex flex-col border-b border-line bg-paper py-2 shadow-card md:hidden"
          >
            {enlaces.map((enlace) => (
              <Link
                key={enlace.href}
                href={enlace.href}
                aria-current={pathname === enlace.href ? "page" : undefined}
                className={claseEnlace(pathname === enlace.href, true)}
              >
                {enlace.texto}
              </Link>
            ))}
            <div className="mt-1 border-t border-line px-4 pt-3">
              <BotonSalir />
            </div>
          </nav>
        </>
      )}
    </header>
  )
}
