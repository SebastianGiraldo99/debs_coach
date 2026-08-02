import type { ReactNode } from "react"

import { NavPrincipal } from "@/components/layout/nav-principal"

// Grupo (admin): su propia barra, sin enlaces de usuario (RNF-006).
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <NavPrincipal variante="admin" />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-10">{children}</main>
    </div>
  )
}
