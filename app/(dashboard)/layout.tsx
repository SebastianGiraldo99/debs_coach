import type { ReactNode } from "react"

import { NavPrincipal } from "@/components/layout/nav-principal"
import { requerirOnboardingCompleto } from "@/lib/auth/dal"

/**
 * Grupo (dashboard): navegación persistente.
 *
 * Aquí vive el control de acceso real del área de usuario. El proxy solo mira
 * la cookie —es optimista y no consulta la base—, así que hasta ahora estas
 * páginas se pintaban para cualquiera con sesión: sin haber hecho el
 * onboarding, e incluso con la cuenta bloqueada por el admin minutos antes.
 */
export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  await requerirOnboardingCompleto()

  return (
    <div className="min-h-dvh">
      <NavPrincipal variante="usuario" />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-10">{children}</main>
    </div>
  )
}
