import { DialogoInvitar } from "@/components/admin/dialogo-invitar"
import { TablaUsuarios, type FilaUsuario } from "@/components/admin/tabla-usuarios"
import { EncabezadoPagina } from "@/components/layout/encabezado-pagina"
import { requerirAdmin } from "@/lib/auth/dal"
import { MAX_USUARIOS, plazasOcupadas } from "@/lib/auth/invitaciones"
import { prisma } from "@/lib/db/prisma"

/**
 * Panel de administración — RF-006.
 *
 * El `select` es explícito y deliberadamente corto: el admin no puede ver
 * datos financieros de nadie (RNF-006). Traer el usuario entero abriría la
 * puerta a que se filtre un campo sensible al añadirlo al schema más adelante.
 *
 * `onboardingCompletadoEn` sí entra: es progreso, no dinero —una fecha, no una
 * cifra— y es lo que le dice al admin si tiene sentido limpiar el onboarding
 * de alguien (RF-064 y RF-065).
 */
export default async function AdminPage() {
  await requerirAdmin()

  const [usuarios, ocupadas] = await Promise.all([
    prisma.usuario.findMany({
      select: {
        id: true,
        nombre: true,
        email: true,
        estado: true,
        rol: true,
        ultimoAcceso: true,
        onboardingCompletadoEn: true,
      },
      // Los pendientes primero: son los que piden una decisión.
      orderBy: [{ estado: "asc" }, { createdAt: "asc" }],
    }),
    plazasOcupadas(),
  ])

  const filas: FilaUsuario[] = usuarios.map((u) => ({
    ...u,
    ultimoAcceso: u.ultimoAcceso?.toISOString() ?? null,
    onboardingCompletadoEn: u.onboardingCompletadoEn?.toISOString() ?? null,
  }))

  return (
    <div className="flex flex-col gap-8">
      <EncabezadoPagina
        titulo="Usuarios"
        descripcion="Estado y accesos. Por privacidad, no se muestran datos financieros de ninguna persona."
      />

      <div className="flex items-center justify-between gap-4">
        <p className="text-menor text-ink-soft">
          {ocupadas} de {MAX_USUARIOS} plazas ocupadas
          <span className="text-ink-mute"> (cuenta las invitaciones sin usar)</span>
        </p>
        <DialogoInvitar plazasLibres={MAX_USUARIOS - ocupadas} />
      </div>

      <TablaUsuarios usuarios={filas} />
    </div>
  )
}
