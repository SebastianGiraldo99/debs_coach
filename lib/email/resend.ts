import { Resend } from "resend"

/**
 * Envío de correo transaccional vía Resend.
 *
 * Resend es un servicio alojado: no corre nada en el VPS. Requiere que el
 * dominio remitente esté verificado con registros DNS (DKIM + SPF).
 *
 * Los correos de la app son la única vía de acceso al producto —la invitación
 * es el único camino de alta (RF-001, RF-002)— así que aquí ningún fallo
 * puede pasar en silencio. Ver `ResultadoEnvio`.
 */

/**
 * El cliente se construye de forma diferida y no en el módulo: el constructor
 * de Resend LANZA si la key viene vacía, así que instanciarlo arriba tumbaría
 * la app entera al importar este archivo, no solo el envío.
 */
let cliente: Resend | null = null

function obtenerCliente(): Resend {
  cliente ??= new Resend(process.env.RESEND_API_KEY)
  return cliente
}

/** Nombre visible del remitente y firma del pie. Una sola constante para que
 *  la bandeja de entrada y el cuerpo del correo no se desincronicen. */
const NOMBRE_REMITENTE = "Coach Financiero Agotech"

const DIRECCION_POR_DEFECTO = "coach@mail.agotech.cloud"

/**
 * Compone el `from` en formato RFC 5322 (`Nombre <dir@dominio>`).
 *
 * Si EMAIL_FROM trae solo la dirección, se le antepone el nombre: sin nombre
 * visible los clientes de correo muestran el local-part —"coach"— que no
 * dice nada al destinatario.
 */
function remitente(): string {
  const valor = process.env.EMAIL_FROM?.trim()
  if (!valor) return `${NOMBRE_REMITENTE} <${DIRECCION_POR_DEFECTO}>`
  if (valor.includes("<")) return valor
  return `${NOMBRE_REMITENTE} <${valor}>`
}

/** Sin API key trabajamos en modo consola: permite desarrollar el flujo de
 *  invitaciones antes de tener el dominio verificado en Resend. */
function modoConsola(): boolean {
  return !process.env.RESEND_API_KEY
}

/**
 * Espejo de los tokens de `app/globals.css`. Se duplican aquí a propósito:
 * los clientes de correo no soportan variables CSS ni hojas externas, así
 * que todo estilo va inline y en hexadecimal. Si cambian los tokens del
 * diseño, hay que actualizar esta constante a mano.
 */
const PALETA = {
  paper: "#fbf9f6",
  surface: "#ffffff",
  ink: "#1a1815",
  inkSoft: "#5b554e",
  inkMute: "#8a8279",
  line: "#e7e2da",
  primary: "#0e4f4b",
  onPrimary: "#fbf9f6",
} as const

const FUENTE =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

export type ResultadoEnvio =
  | { ok: true; id: string }
  | { ok: false; motivo: string }

interface Contenido {
  /** Encabezado del cuerpo. No se repite el asunto. */
  titulo: string
  /** Párrafos del cuerpo, en texto plano. Se escapan al renderizar. */
  parrafos: string[]
  cta?: { texto: string; url: string }
  /** Línea final en gris pequeño (vigencias, aclaraciones). */
  nota?: string
}

function escapar(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/**
 * Layout basado en tablas. Es deliberado: Outlook de escritorio renderiza
 * con el motor de Word y descarta flexbox, grid y buena parte de los
 * márgenes en `div`. Las tablas son el único layout que se ve igual en
 * Gmail, Apple Mail y Outlook.
 */
function construirHtml({ titulo, parrafos, cta, nota }: Contenido): string {
  const cuerpo = parrafos
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${PALETA.inkSoft};">${escapar(p)}</p>`,
    )
    .join("")

  const boton = cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0;">
         <tr>
           <td style="background-color:${PALETA.primary};border-radius:8px;">
             <a href="${escapar(cta.url)}"
                style="display:inline-block;padding:12px 24px;font-family:${FUENTE};font-size:16px;font-weight:600;color:${PALETA.onPrimary};text-decoration:none;">${escapar(cta.texto)}</a>
           </td>
         </tr>
       </table>`
    : ""

  const pie = nota
    ? `<p style="margin:24px 0 0;font-size:14px;line-height:1.5;color:${PALETA.inkMute};">${escapar(nota)}</p>`
    : ""

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapar(titulo)}</title>
</head>
<body style="margin:0;padding:0;background-color:${PALETA.paper};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${PALETA.paper};padding:32px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background-color:${PALETA.surface};border:1px solid ${PALETA.line};border-radius:12px;">
        <tr>
          <td style="padding:32px;font-family:${FUENTE};">
            <h1 style="margin:0 0 20px;font-size:22px;line-height:1.3;font-weight:600;color:${PALETA.ink};">${escapar(titulo)}</h1>
            ${cuerpo}
            ${boton}
            ${pie}
          </td>
        </tr>
      </table>
      <p style="margin:20px 0 0;font-family:${FUENTE};font-size:13px;color:${PALETA.inkMute};">${NOMBRE_REMITENTE}</p>
    </td>
  </tr>
</table>
</body>
</html>`
}

/** Versión de texto plano. Sin ella los filtros antispam penalizan el envío. */
function construirTexto({ titulo, parrafos, cta, nota }: Contenido): string {
  const partes = [titulo, "", ...parrafos]
  if (cta) partes.push("", `${cta.texto}: ${cta.url}`)
  if (nota) partes.push("", nota)
  partes.push("", `— ${NOMBRE_REMITENTE}`)
  return partes.join("\n")
}

async function enviar(
  destino: string,
  asunto: string,
  contenido: Contenido,
): Promise<ResultadoEnvio> {
  if (modoConsola()) {
    console.info(
      `[email:consola] Sin RESEND_API_KEY. Correo no enviado.\n` +
        `  de: ${remitente()}\n  para: ${destino}\n  asunto: ${asunto}\n` +
        (contenido.cta ? `  enlace: ${contenido.cta.url}\n` : ""),
    )
    return { ok: true, id: "modo-consola" }
  }

  // `emails.send` NO lanza excepción ante errores de la API: devuelve
  // { data, error }. Ignorar el retorno haría que una key inválida o un
  // dominio sin verificar fallara en silencio.
  const { data, error } = await obtenerCliente().emails.send({
    from: remitente(),
    to: destino,
    subject: asunto,
    html: construirHtml(contenido),
    text: construirTexto(contenido),
  })

  if (error) {
    console.error(`[email] Fallo enviando "${asunto}" a ${destino}:`, error)
    return { ok: false, motivo: error.message }
  }

  return { ok: true, id: data!.id }
}

export async function enviarInvitacion(
  emailDestino: string,
  token: string,
): Promise<ResultadoEnvio> {
  return enviar(emailDestino, "Tu invitación a Coach Financiero", {
    titulo: "Te invitaron a Coach Financiero",
    parrafos: [
      "Coach Financiero te ayuda a ordenar tus deudas y tus ingresos, y a construir un plan realista para cumplir tus objetivos.",
      "Crea tu cuenta desde el siguiente enlace.",
    ],
    cta: {
      texto: "Crear mi cuenta",
      url: `${process.env.APP_URL}/register?token=${token}`,
    },
    nota: "El enlace vence en 48 horas. Si no lo usas a tiempo, pídele al administrador que te envíe uno nuevo.",
  })
}

export async function enviarAprobacion(
  emailDestino: string,
): Promise<ResultadoEnvio> {
  return enviar(emailDestino, "Tu acceso ya está activo", {
    titulo: "Tu cuenta quedó aprobada",
    parrafos: [
      "Ya puedes entrar a Coach Financiero.",
      "La primera vez te vamos a hacer algunas preguntas sobre tus ingresos, tus gastos y tus deudas. Con eso armamos tu plan.",
    ],
    cta: { texto: "Entrar", url: `${process.env.APP_URL}/login` },
  })
}

export async function enviarRecordatorioCheckin(
  emailDestino: string,
  nombre: string,
): Promise<ResultadoEnvio> {
  return enviar(emailDestino, "Es momento de tu check-in", {
    titulo: `Hola, ${nombre}`,
    parrafos: [
      "Pasaron 15 días desde tu último check-in. Cuéntanos cómo te fue: qué pagaste, si apareció alguna deuda nueva y si tuviste ingresos extra.",
      "Con eso ajustamos tu plan a lo que está pasando de verdad.",
    ],
    cta: { texto: "Hacer mi check-in", url: `${process.env.APP_URL}/checkin` },
  })
}

/**
 * Avisa al admin que alguien se registró y espera aprobación manual (RF-003).
 * Sin este correo el usuario queda en estado `pendiente` sin que nadie lo sepa.
 */
export async function enviarNotificacionAdmin(
  emailAdmin: string,
  nombreUsuario: string,
  emailUsuario: string,
): Promise<ResultadoEnvio> {
  return enviar(emailAdmin, "Hay un registro esperando aprobación", {
    titulo: "Nuevo registro pendiente",
    parrafos: [
      `${nombreUsuario} (${emailUsuario}) creó su cuenta y está esperando que la apruebes.`,
      "Hasta que la apruebes no puede iniciar sesión.",
    ],
    cta: { texto: "Ir al panel", url: `${process.env.APP_URL}/admin` },
  })
}
