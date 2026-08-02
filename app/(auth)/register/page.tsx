import Link from "next/link"

import { FormularioRegistro } from "@/components/auth/formulario-registro"
import { buscarInvitacionVigente } from "@/lib/auth/invitaciones"

/**
 * /register?token=… — RF-002.
 *
 * Server Component a propósito: el token se valida en el servidor ANTES de
 * pintar nada. Si se validara en el cliente habría que exponer un endpoint
 * que confirma si un token existe, y eso permitiría probar tokens a ciegas.
 *
 * En Next 16 `searchParams` es una promesa.
 */
export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  const invitacion = token ? await buscarInvitacionVigente(token) : null

  if (!invitacion) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-titulo font-semibold text-ink">
            Esta invitación no sirve
          </h1>
          <p className="mt-1 text-cuerpo text-ink-soft">
            {token
              ? "El enlace ya venció o alguien lo usó. Los enlaces duran 48 horas."
              : "Te falta el enlace de invitación. Ábrelo desde el correo que recibiste."}
          </p>
          <p className="mt-3 text-cuerpo text-ink-soft">
            Pídele al administrador que te envíe uno nuevo.
          </p>
        </div>
        <p className="text-menor text-ink-soft">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-primary hover:text-primary-hover">
            Entrar
          </Link>
        </p>
      </div>
    )
  }

  return <FormularioRegistro token={token!} email={invitacion.emailDestino} />
}
