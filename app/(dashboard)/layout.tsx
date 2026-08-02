import type { ReactNode } from "react"

import { NavPrincipal } from "@/components/layout/nav-principal"

// Grupo (dashboard): navegación persistente.
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <NavPrincipal variante="usuario" />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-10">{children}</main>
    </div>
  )
}
