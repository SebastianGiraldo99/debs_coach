import { randomBytes } from "node:crypto"

import { prisma } from "@/lib/db/prisma"

/**
 * Invitaciones — RF-001 y RF-002. Son el único camino de alta: nadie puede
 * registrarse por su cuenta.
 */

/** Tope de la ETR (línea 533): 1 admin + 10 usuarios. */
export const MAX_USUARIOS = 11

/** Vigencia del enlace. El correo se lo dice al invitado. */
const HORAS_VIGENCIA = 48

/**
 * 32 bytes de aleatoriedad criptográfica en hex (64 caracteres).
 *
 * Se guarda en claro y no hasheado a propósito: una invitación robada no da
 * acceso por sí sola —el usuario nace en estado `pendiente` y necesita que el
 * admin lo apruebe—, así que el hash añadiría una indirección en cada lectura
 * sin cerrar ningún riesgo real.
 */
export function generarToken(): string {
  return randomBytes(32).toString("hex")
}

export function calcularVencimiento(desde = new Date()): Date {
  return new Date(desde.getTime() + HORAS_VIGENCIA * 60 * 60 * 1000)
}

export type InvitacionVigente = {
  id: string
  emailDestino: string
}

/**
 * Devuelve la invitación solo si sigue sirviendo: estado `pendiente` y sin
 * vencer. Que exista la fila no basta —puede estar usada o caducada—, y esa
 * comprobación tiene que repetirse al enviar el formulario, no solo al
 * abrirlo: entre una cosa y otra pueden pasar horas.
 */
export async function buscarInvitacionVigente(
  token: string,
): Promise<InvitacionVigente | null> {
  if (!token) return null

  const invitacion = await prisma.invitacion.findUnique({
    where: { token },
    select: { id: true, emailDestino: true, estado: true, expiresAt: true },
  })

  if (!invitacion) return null
  if (invitacion.estado !== "pendiente") return null
  if (invitacion.expiresAt.getTime() <= Date.now()) return null

  return { id: invitacion.id, emailDestino: invitacion.emailDestino }
}

/**
 * Plazas ocupadas: usuarios existentes más invitaciones todavía vivas.
 *
 * Las invitaciones cuentan porque ya tienen dueño; si no, se podrían repartir
 * veinte enlaces para once plazas y el rechazo le llegaría al invitado al
 * registrarse, cuando ya no puede hacer nada.
 */
export async function plazasOcupadas(): Promise<number> {
  const [usuarios, invitaciones] = await Promise.all([
    prisma.usuario.count(),
    prisma.invitacion.count({
      where: { estado: "pendiente", expiresAt: { gt: new Date() } },
    }),
  ])
  return usuarios + invitaciones
}

/** Normaliza para comparar: el correo no distingue mayúsculas en la práctica. */
export function normalizarEmail(email: string): string {
  return email.toLowerCase().trim()
}
