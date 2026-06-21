import { Resend } from "resend"

export const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = process.env.EMAIL_FROM ?? "coach@tudominio.com"

export async function enviarInvitacion(emailDestino: string, token: string) {
  const url = `${process.env.APP_URL}/register?token=${token}`
  await resend.emails.send({
    from: FROM,
    to: emailDestino,
    subject: "Invitación a Coach Financiero",
    html: `<p>Fuiste invitado a unirte a Coach Financiero.</p>
           <p><a href="${url}">Crear mi cuenta</a></p>
           <p>Este link expira en 48 horas.</p>`,
  })
}

export async function enviarAprobacion(emailDestino: string) {
  await resend.emails.send({
    from: FROM,
    to: emailDestino,
    subject: "Tu acceso fue aprobado — Coach Financiero",
    html: `<p>¡Tu cuenta fue aprobada! Ya podés ingresar a <a href="${process.env.APP_URL}/login">Coach Financiero</a>.</p>`,
  })
}

export async function enviarRecordatorioCheckin(
  emailDestino: string,
  nombre: string
) {
  await resend.emails.send({
    from: FROM,
    to: emailDestino,
    subject: "Es momento de tu check-in quincenal 📊",
    html: `<p>Hola ${nombre},</p>
           <p>Han pasado 15 días desde tu último check-in. Entrá a revisar tu plan y registrar tus avances.</p>
           <p><a href="${process.env.APP_URL}/checkin">Hacer check-in ahora</a></p>`,
  })
}
