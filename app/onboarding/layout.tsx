import type { ReactNode } from "react"
import { redirect } from "next/navigation"

import { requerirUsuario } from "@/lib/auth/dal"

/**
 * Exige sesión válida y estado `activo`. El proxy solo comprueba que haya
 * cookie; aquí se verifica contra la base que la cuenta siga aprobada.
 *
 * Si el onboarding ya está hecho, esta zona sobra: rehacerlo borraría y
 * reescribiría los datos, porque los pasos reemplazan las listas enteras.
 */
export default async function OnboardingLayout({
  children,
}: {
  children: ReactNode
}) {
  const usuario = await requerirUsuario()
  if (usuario.onboardingCompletadoEn) redirect("/dashboard")

  return <>{children}</>
}
