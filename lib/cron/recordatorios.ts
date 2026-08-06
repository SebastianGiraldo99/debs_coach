import { prisma } from "@/lib/db/prisma"
import { enviarRecordatorioCheckin } from "@/lib/email/resend"

/**
 * El recordatorio quincenal de check-in (RF-028).
 *
 * La función es independiente del cron a propósito: así se puede disparar a
 * mano para probarla —ver `scripts/probar-recordatorios.mts`— sin esperar a
 * las nueve de la mañana ni tocar el reloj del sistema.
 *
 * Quién recibe: cuentas activas que ya terminaron el onboarding y llevan 15
 * días o más sin hacer check-in. Quien nunca hizo ninguno cuenta desde que
 * cerró el onboarding, que es cuando empezó su plan.
 *
 * Nadie recibe dos correos en la misma semana aunque el trabajo corra todos
 * los días. Sin ese freno, quien se salta un check-in recibiría un recordatorio
 * diario indefinidamente, y eso no es insistir: es acabar en la carpeta de
 * spam junto con los correos que sí importan.
 */

const DIAS_ENTRE_CHECKINS = 15
const DIAS_ENTRE_RECORDATORIOS = 7

export type ResumenRecordatorios = {
  revisados: number
  enviados: number
  fallidos: number
}

function haceDias(dias: number): Date {
  return new Date(Date.now() - dias * 24 * 60 * 60 * 1000)
}

export async function enviarRecordatoriosPendientes(): Promise<ResumenRecordatorios> {
  const corte = haceDias(DIAS_ENTRE_CHECKINS)
  const corteRecordatorio = haceDias(DIAS_ENTRE_RECORDATORIOS)

  const candidatos = await prisma.usuario.findMany({
    where: {
      estado: "activo",
      onboardingCompletadoEn: { not: null, lte: corte },
      OR: [{ ultimoRecordatorioEn: null }, { ultimoRecordatorioEn: { lte: corteRecordatorio } }],
    },
    select: {
      id: true,
      nombre: true,
      email: true,
      // Solo hace falta saber si hay uno reciente, no traerlos todos.
      checkIns: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
    },
  })

  // El filtro de "sin check-in reciente" se hace aquí y no en el where porque
  // depende del último check-in de cada uno, y expresarlo en SQL a través de
  // la relación complicaría la consulta para ahorrar un bucle sobre 11 filas
  // como mucho.
  const pendientes = candidatos.filter((u) => {
    const ultimo = u.checkIns[0]
    return !ultimo || ultimo.createdAt <= corte
  })

  let enviados = 0
  let fallidos = 0

  for (const usuario of pendientes) {
    const resultado = await enviarRecordatorioCheckin(usuario.email, usuario.nombre)

    if (!resultado.ok) {
      fallidos++
      // Sin la dirección ni el nombre: el log no es sitio para datos de nadie.
      console.error(`[cron] Falló el recordatorio de un usuario: ${resultado.motivo}`)
      continue
    }

    enviados++
    // Se marca solo si salió. Si el proveedor falló, mañana se reintenta en vez
    // de dar por avisado a alguien que nunca recibió nada.
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimoRecordatorioEn: new Date() },
    })
  }

  return { revisados: pendientes.length, enviados, fallidos }
}
