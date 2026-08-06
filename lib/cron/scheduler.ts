import cron from "node-cron"

import { enviarRecordatoriosPendientes } from "@/lib/cron/recordatorios"

/**
 * El planificador de tareas del servidor. Hoy solo hay una: el recordatorio
 * de check-in (RF-028).
 *
 * OJO CON EL DESPLIEGUE — esto corre **una vez por proceso**. Con PM2 en modo
 * cluster habría un planificador por instancia y cada usuario recibiría tantos
 * correos como instancias haya. Por eso `ecosystem.config.js` fija
 * `exec_mode: "fork"` e `instances: 1`, y cambiarlo falla en silencio: nadie
 * se entera hasta que alguien recibe el mismo correo tres veces.
 *
 * El trabajo corre todos los días, no cada quince: quién está vencido lo
 * decide la consulta mirando la fecha del último check-in de cada persona. Un
 * cron quincenal tendría que acertar el día de cada usuario, que son
 * distintos porque cada quien terminó el onboarding cuando quiso.
 */

/** Todos los días a las 9:00. Un correo a esa hora se lee; a las 3 a.m. no. */
const EXPRESION = "0 9 * * *"

/** La app es de uso colombiano; sin esto el servidor usaría UTC. */
const ZONA = "America/Bogota"

/**
 * `register()` de `instrumentation.ts` puede correr más de una vez en
 * desarrollo, cuando el servidor se recarga. Sin esta guarda se acumularían
 * planificadores y el trabajo correría varias veces por día.
 */
let programado = false

export function iniciarPlanificador(): void {
  if (programado) return
  programado = true

  cron.schedule(
    EXPRESION,
    async () => {
      try {
        const resumen = await enviarRecordatoriosPendientes()
        console.log(
          `[cron] Recordatorios de check-in: ${resumen.enviados} enviados, ` +
            `${resumen.fallidos} fallidos, ${resumen.revisados} pendientes.`,
        )
      } catch (error) {
        // Una excepción sin capturar dentro de un job de node-cron tumbaría el
        // proceso entero, y con él la aplicación. Un recordatorio que no sale
        // no vale una caída: mañana se reintenta.
        console.error("[cron] El trabajo de recordatorios falló:", error)
      }
    },
    { timezone: ZONA },
  )

  console.log(`[cron] Recordatorios de check-in programados (${EXPRESION}, ${ZONA}).`)
}
