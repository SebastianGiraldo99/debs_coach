import { cache } from "react"
import { redirect } from "next/navigation"

import { obtenerSession } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"

/**
 * Data Access Layer — la capa de autorización de verdad.
 *
 * El proxy solo mira la cookie: es rápido pero ciego. Un JWT sigue siendo
 * válido durante 24 h aunque el admin haya bloqueado al usuario hace un
 * minuto, así que cada acceso a datos tiene que volver a preguntarle a la
 * base. Estas funciones son ese control.
 *
 * Van envueltas en `cache()` de React: dentro de un mismo render, layout y
 * página comparten una sola consulta en vez de repetirla.
 *
 * Regla que no se rompe: el `usuarioId` sale SIEMPRE de la sesión, nunca de
 * un parámetro del cliente. Es lo que evita los IDOR del checklist de QA.
 */

export type UsuarioSesion = {
  id: string
  nombre: string
  email: string
  rol: "usuario" | "admin"
  monedaBase: "COP" | "USD"
  /** `null` mientras no haya terminado el onboarding. */
  onboardingCompletadoEn: Date | null
}

/**
 * Usuario autenticado y vigente, o null. No redirige: úsala cuando la página
 * deba comportarse distinto con y sin sesión.
 */
export const usuarioActual = cache(async (): Promise<UsuarioSesion | null> => {
  const sesion = await obtenerSession()
  if (!sesion?.userId) return null

  const usuario = await prisma.usuario.findUnique({
    where: { id: sesion.userId },
    select: {
      id: true,
      nombre: true,
      email: true,
      rol: true,
      estado: true,
      monedaBase: true,
      onboardingCompletadoEn: true,
    },
  })

  // Puede no existir si lo borraron con la sesión todavía viva.
  if (!usuario || usuario.estado !== "activo") return null

  return {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol,
    monedaBase: usuario.monedaBase,
    onboardingCompletadoEn: usuario.onboardingCompletadoEn,
  }
})

/**
 * Exige sesión válida y estado `activo`. Si no, manda al login con el motivo:
 * un usuario `pendiente` o `bloqueado` tiene cookie buena pero acceso negado,
 * y sin el aviso vería un login que parece rechazarlo sin explicación.
 */
export async function requerirUsuario(): Promise<UsuarioSesion> {
  const usuario = await usuarioActual()
  if (!usuario) redirect("/login?error=acceso")
  return usuario
}

/** Exige además rol de administrador. */
export async function requerirAdmin(): Promise<UsuarioSesion> {
  const usuario = await requerirUsuario()
  if (usuario.rol !== "admin") redirect("/dashboard")
  return usuario
}

/**
 * Para el área de usuario: exige haber terminado el onboarding.
 *
 * Esta comprobación no puede vivir en el proxy porque necesita consultar la
 * base, y la doc de Next lo desaconseja explícitamente.
 *
 * Antes se deducía contando objetivos, lo que costaba una consulta extra y
 * confundía dos cosas: tener un objetivo no es lo mismo que haber terminado
 * el onboarding —también se recogen ingresos, egresos y deudas—. Ahora lo
 * dice `onboardingCompletadoEn`, que ya viene en la consulta del usuario.
 */
export async function requerirOnboardingCompleto(): Promise<UsuarioSesion> {
  const usuario = await requerirUsuario()
  if (!usuario.onboardingCompletadoEn) redirect("/onboarding")
  return usuario
}
