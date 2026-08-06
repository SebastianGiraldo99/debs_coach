import "dotenv/config"

import { enviarRecordatoriosPendientes } from "../lib/cron/recordatorios.ts"
import { prisma } from "../lib/db/prisma.ts"

/**
 * Dispara el trabajo de recordatorios sin esperar a las nueve de la mañana ni
 * tocar el reloj del sistema (RF-028).
 *
 * Para simular el paso del tiempo, `--vencer <email>` retrasa 16 días la
 * última actividad de esa cuenta: su check-in más reciente si tiene, y si no
 * la fecha en que cerró el onboarding. También limpia el último recordatorio,
 * porque si no la propia guarda semanal impediría el envío.
 *
 * Uso:
 *   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/probar-recordatorios.mts
 *   node ... scripts/probar-recordatorios.mts --vencer dashboard@local.test
 *
 * Sin RESEND_API_KEY el envío cae a modo consola y el correo se imprime en el
 * log en vez de salir de verdad. Es como conviene probarlo.
 */

const indice = process.argv.indexOf("--vencer")
const email = indice === -1 ? null : process.argv[indice + 1]

if (email) {
  const usuario = await prisma.usuario.findUnique({
    where: { email },
    select: { id: true, checkIns: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true } } },
  })

  if (!usuario) {
    console.error(`No existe ningún usuario con el correo ${email}.`)
    process.exit(1)
  }

  const hace16Dias = new Date(Date.now() - 16 * 24 * 60 * 60 * 1000)

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { onboardingCompletadoEn: hace16Dias, ultimoRecordatorioEn: null },
  })

  if (usuario.checkIns[0]) {
    await prisma.checkIn.update({
      where: { id: usuario.checkIns[0].id },
      data: { createdAt: hace16Dias },
    })
  }

  console.log(`Cuenta ${email} envejecida 16 días.`)
}

const resumen = await enviarRecordatoriosPendientes()
console.log(
  `Pendientes: ${resumen.revisados} · Enviados: ${resumen.enviados} · Fallidos: ${resumen.fallidos}`,
)

await prisma.$disconnect()
