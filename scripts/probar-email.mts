/**
 * Diagnóstico de envío de correo. Verifica la configuración y manda un
 * correo real de prueba usando el mismo código que usa la app.
 *
 * Uso:
 *   node --env-file=.env scripts/probar-email.mts tu@correo.com
 *
 * Extensión .mts a propósito: permite correrlo hoy con Node puro
 * (--experimental-strip-types) sin depender de tsx, que todavía no está
 * instalado. Cuando entre tsx en el Sprint 0 se puede renombrar a .ts.
 */
import { enviarInvitacion } from "../lib/email/resend.ts"

const destino = process.argv[2]

if (!destino) {
  console.error("Falta el destinatario.\n  node --env-file=.env scripts/probar-email.mts tu@correo.com")
  process.exit(1)
}

// ── Revisión previa de configuración ─────────────────────────────────────
const key = process.env.RESEND_API_KEY
const from = process.env.EMAIL_FROM
const appUrl = process.env.APP_URL

console.log("Configuración")
console.log("  RESEND_API_KEY : " + (key ? `definida (${key.slice(0, 3)}…${key.length} chars)` : "VACÍA → modo consola, no se enviará nada"))
console.log("  EMAIL_FROM     : " + (from ?? "(sin definir, se usa el default del código)"))
console.log("  APP_URL        : " + (appUrl ?? "(sin definir)"))

const problemas: string[] = []

if (key && !key.startsWith("re_")) {
  problemas.push("RESEND_API_KEY no empieza por 're_'. ¿Copiaste la key completa?")
}
if (from && !/@([\w-]+\.)*mail\.agotech\.cloud>?\s*$/.test(from.trim())) {
  problemas.push(
    `EMAIL_FROM usa un dominio distinto al verificado (mail.agotech.cloud). Resend rechazará el envío con 403.`,
  )
}
if (!appUrl || appUrl.includes("tudominio.com")) {
  problemas.push("APP_URL sigue en el placeholder: el enlace del correo no va a funcionar.")
}

if (problemas.length > 0) {
  console.log("\nAvisos")
  for (const p of problemas) console.log("  - " + p)
}

// ── Envío ────────────────────────────────────────────────────────────────
console.log(`\nEnviando invitación de prueba a ${destino}…\n`)

const resultado = await enviarInvitacion(destino, "token-de-prueba-123")

if (resultado.ok) {
  console.log(`OK. Resend aceptó el correo. id=${resultado.id}`)
  console.log("Revisa la bandeja (y spam). En resend.com/emails ves el estado de entrega.")
} else {
  console.error(`FALLÓ: ${resultado.motivo}`)
  console.error(
    "\nCausas típicas:\n" +
      "  403 → EMAIL_FROM no coincide con el dominio verificado\n" +
      "  401 → API key inválida o revocada\n" +
      "  422 → dominio aún sin verificar en el panel de Resend",
  )
  process.exit(1)
}
