import { requerirUsuario } from "@/lib/auth/dal"
import { FormularioDeudas } from "./formulario-deudas"

export default async function OnboardingDeudasPage() {
  const usuario = await requerirUsuario()
  return <FormularioDeudas moneda={usuario.monedaBase} />
}
