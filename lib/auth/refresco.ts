import { createHash, randomBytes, randomUUID } from "node:crypto"

import { prisma } from "@/lib/db/prisma"

/**
 * El refresh token de 7 días (RNF-002) — la mitad revocable de la sesión.
 *
 * El JWT de acceso dura 24 h y es stateless: rápido de verificar, imposible de
 * revocar. Esta pieza es la contraparte. Vive en su propia cookie, se guarda
 * hasheada en `sesiones` y **rota en cada uso**: cada vez que se canjea por un
 * acceso nuevo, la fila vieja queda marcada y nace otra.
 *
 * Rotar sirve para detectar robos. Si una cookie copiada se usa después de que
 * el dueño ya rotó —o al revés—, aparece un token ya canjeado, y eso solo pasa
 * si hay dos copias en circulación. Ante esa señal se revoca la **familia**
 * entera: no hay forma de distinguir al ladrón de la víctima, así que se echa a
 * los dos y el dueño vuelve a entrar con su contraseña.
 *
 * Este módulo no toca cookies a propósito: quien puede escribirlas —el proxy
 * con su `NextResponse`, los route handlers con `cookies()`— lo hace con APIs
 * distintas, y meterlas aquí obligaría a un módulo a saber en qué contexto
 * corre. Aquí solo está la parte que habla con la base.
 */

export const COOKIE_REFRESH = "coach_refresh"

/** Siete días, en segundos y en milisegundos. */
export const DIAS_REFRESH = 7
export const MAX_AGE_REFRESH = DIAS_REFRESH * 24 * 60 * 60

/**
 * Ventana de gracia para un token ya rotado.
 *
 * Sin ella, dos peticiones en paralelo del mismo navegador —una navegación y
 * su prefetch, por ejemplo— canjean el mismo refresh a la vez: la segunda
 * encuentra la fila ya rotada, lo lee como robo y cierra la sesión de alguien
 * que no hizo nada raro. Dentro de la ventana se emite un token nuevo sin
 * revocar nada; fuera, sigue siendo la señal de robo que queremos.
 */
const GRACIA_MS = 60_000

/** 32 bytes de aleatoriedad. No es una contraseña: no hace falta que se lea. */
function generarTokenCrudo(): string {
  return randomBytes(32).toString("base64url")
}

/**
 * SHA-256 y no argon2: lo que se guarda es un secreto de 256 bits generado por
 * nosotros, no algo que alguien pueda adivinar a fuerza de diccionario. Lo que
 * hace falta es que un volcado de la base no contenga tokens usables, y para
 * eso un hash rápido basta. Además esto corre en cada rotación.
 */
function hashear(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

function vencimiento(desde = new Date()): Date {
  return new Date(desde.getTime() + MAX_AGE_REFRESH * 1000)
}

/**
 * Abre una sesión nueva: familia nueva, token nuevo. Se llama al iniciar
 * sesión, no al rotar.
 */
export async function emitirRefresh(usuarioId: string): Promise<string> {
  const token = generarTokenCrudo()
  await prisma.sesion.create({
    data: {
      usuarioId,
      tokenHash: hashear(token),
      familia: randomUUID(),
      expiraEn: vencimiento(),
    },
  })
  return token
}

export type RefrescoOk = {
  usuarioId: string
  rol: "usuario" | "admin"
  /** El token que hay que dejar en la cookie. Sustituye al presentado. */
  token: string
}

/**
 * Canjea un refresh por uno nuevo y dice de quién es la sesión.
 *
 * Devuelve `null` en todo lo que no sea un canje limpio: token desconocido,
 * vencido, revocado, o de un usuario que ya no está `activo`. El estado se
 * relee aquí además de en el DAL porque este es el momento en que la sesión se
 * alarga: renovarle el acceso a alguien a quien el admin acaba de bloquear
 * sería exactamente el agujero que RNF-002 viene a tapar.
 */
export async function rotarRefresh(tokenCrudo: string): Promise<RefrescoOk | null> {
  if (!tokenCrudo) return null

  const sesion = await prisma.sesion.findUnique({
    where: { tokenHash: hashear(tokenCrudo) },
    select: {
      id: true,
      usuarioId: true,
      familia: true,
      expiraEn: true,
      rotadaEn: true,
      revocadaEn: true,
      usuario: { select: { rol: true, estado: true } },
    },
  })

  if (!sesion) return null
  if (sesion.revocadaEn) return null
  if (sesion.expiraEn.getTime() <= Date.now()) return null

  if (sesion.rotadaEn) {
    // Reutilización. Dentro de la gracia es una carrera entre peticiones del
    // mismo navegador; fuera, alguien tiene una copia de la cookie.
    if (Date.now() - sesion.rotadaEn.getTime() > GRACIA_MS) {
      await revocarFamilia(sesion.familia)
      return null
    }
  }

  if (sesion.usuario.estado !== "activo") return null

  const token = generarTokenCrudo()
  const ahora = new Date()

  await prisma.$transaction([
    // La vieja se marca, no se borra: sin la fila no habría con qué detectar
    // que alguien la vuelve a presentar.
    prisma.sesion.update({
      where: { id: sesion.id },
      data: { rotadaEn: sesion.rotadaEn ?? ahora },
    }),
    prisma.sesion.create({
      data: {
        usuarioId: sesion.usuarioId,
        tokenHash: hashear(token),
        familia: sesion.familia,
        // El vencimiento NO se recalcula: la sesión entera caduca a los 7 días
        // del inicio. Si cada rotación lo empujara, una pestaña abierta la
        // renovaría para siempre y el plazo de RNF-002 no significaría nada.
        expiraEn: sesion.expiraEn,
      },
    }),
  ])

  return { usuarioId: sesion.usuarioId, rol: sesion.usuario.rol, token }
}

/** Cierre de sesión: mata la familia a la que pertenece el token presentado. */
export async function revocarRefresh(tokenCrudo: string | undefined): Promise<void> {
  if (!tokenCrudo) return
  const sesion = await prisma.sesion.findUnique({
    where: { tokenHash: hashear(tokenCrudo) },
    select: { familia: true },
  })
  if (sesion) await revocarFamilia(sesion.familia)
}

async function revocarFamilia(familia: string): Promise<void> {
  await prisma.sesion.updateMany({
    where: { familia, revocadaEn: null },
    data: { revocadaEn: new Date() },
  })
}

/** Todas las sesiones de un usuario. Para cuando el admin bloquea una cuenta. */
export async function revocarSesionesDe(usuarioId: string): Promise<void> {
  await prisma.sesion.updateMany({
    where: { usuarioId, revocadaEn: null },
    data: { revocadaEn: new Date() },
  })
}

/**
 * Borra lo que ya no autentica ni sirve de rastro. Lo llama el cron diario.
 *
 * Las revocadas se van con un día de margen: si la revocación fue por robo,
 * ese día es la única ventana en la que queda escrito lo que pasó.
 */
export async function limpiarSesionesVencidas(): Promise<number> {
  const ayer = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const { count } = await prisma.sesion.deleteMany({
    where: {
      OR: [{ expiraEn: { lt: new Date() } }, { revocadaEn: { lt: ayer } }],
    },
  })
  return count
}
