import { Badge } from "@/components/ui/badge"
import { EncabezadoPagina } from "@/components/layout/encabezado-pagina"
import { usuariosAdmin, type UsuarioAdmin } from "@/lib/mock/usuarios-admin"
import { formatearFecha } from "@/lib/formato"

const etiquetaEstado: Record<UsuarioAdmin["estado"], string> = {
  activo: "Activo",
  inactivo: "Inactivo",
  invitado: "Invitado",
}

const tonoEstado: Record<UsuarioAdmin["estado"], "avance" | "neutro" | "atencion"> = {
  activo: "avance",
  inactivo: "neutro",
  invitado: "atencion",
}

export default function AdminPage() {
  return (
    <div className="flex flex-col gap-8">
      <EncabezadoPagina
        titulo="Usuarios"
        descripcion="Estado y accesos. Por privacidad, no se muestran datos financieros de ninguna persona."
      />

      <div className="overflow-x-auto rounded-card border border-line">
        <table className="w-full min-w-[36rem] text-left text-menor">
          <thead className="border-b border-line bg-surface-alt text-ink-mute">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                Nombre
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Correo
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Estado
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Último acceso
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-surface">
            {usuariosAdmin.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-medium text-ink">{u.nombre}</td>
                <td className="px-4 py-3 text-ink-soft">{u.email}</td>
                <td className="px-4 py-3">
                  <Badge tono={tonoEstado[u.estado]}>{etiquetaEstado[u.estado]}</Badge>
                </td>
                <td className="px-4 py-3 tabular-nums text-ink-soft">
                  {formatearFecha(u.ultimoAcceso)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
