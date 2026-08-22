"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { DialogoLimpiarOnboarding } from "@/components/admin/dialogo-limpiar-onboarding"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatearFecha } from "@/lib/formato"

export type EstadoUsuario = "pendiente" | "activo" | "bloqueado"

export type FilaUsuario = {
  id: string
  nombre: string
  email: string
  estado: EstadoUsuario
  rol: "usuario" | "admin"
  ultimoAcceso: string | null
  /** `null` mientras no lo haya terminado. Es progreso, no dato financiero. */
  onboardingCompletadoEn: string | null
}

const etiquetaEstado: Record<EstadoUsuario, string> = {
  pendiente: "Pendiente",
  activo: "Activo",
  bloqueado: "Bloqueado",
}

/**
 * Sin rojo para "bloqueado" (§18): la terracota está reservada a la deuda,
 * que es un dato y no una falla. Un bloqueo es una decisión del admin, no un
 * error, así que va en gris.
 */
const tonoEstado: Record<EstadoUsuario, "avance" | "neutro" | "atencion"> = {
  pendiente: "atencion",
  activo: "avance",
  bloqueado: "neutro",
}

const accionPorEstado: Record<EstadoUsuario, { accion: string; texto: string } | null> = {
  pendiente: { accion: "aprobar", texto: "Aprobar" },
  activo: { accion: "bloquear", texto: "Bloquear" },
  bloqueado: { accion: "desbloquear", texto: "Desbloquear" },
}

export function TablaUsuarios({ usuarios }: { usuarios: FilaUsuario[] }) {
  const router = useRouter()
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)

  async function ejecutar(id: string, accion: string) {
    setAviso(null)
    setExito(null)
    setOcupado(id)
    try {
      const respuesta = await fetch(`/api/admin/usuarios/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion }),
      })
      const datos = await respuesta.json()

      if (!datos.ok) {
        setAviso(datos.mensaje ?? "No pudimos completar la acción.")
        return
      }
      if (datos.advertencia) setAviso(datos.advertencia)

      // La tabla la pinta un Server Component: refresh() la vuelve a pedir
      // con el estado nuevo en vez de duplicar aquí la lógica de estados.
      router.refresh()
    } catch {
      setAviso("No pudimos conectar con el servidor.")
    } finally {
      setOcupado(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {aviso && (
        <p role="alert" className="text-menor text-atencion">
          {aviso}
        </p>
      )}

      {exito && (
        <p role="status" className="text-menor text-avance">
          {exito}
        </p>
      )}

      <div className="overflow-x-auto rounded-card border border-line">
        <table className="w-full min-w-[52rem] text-left text-menor">
          <thead className="border-b border-line bg-surface-alt text-ink-mute">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Nombre</th>
              <th scope="col" className="px-4 py-3 font-medium">Correo</th>
              <th scope="col" className="px-4 py-3 font-medium">Estado</th>
              <th scope="col" className="px-4 py-3 font-medium">Último acceso</th>
              <th scope="col" className="px-4 py-3 font-medium">Onboarding</th>
              <th scope="col" className="px-4 py-3 font-medium">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-surface">
            {usuarios.map((u) => {
              const accion = u.rol === "admin" ? null : accionPorEstado[u.estado]
              return (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-medium text-ink">
                    {u.nombre}
                    {u.rol === "admin" && (
                      <span className="ml-2 text-ink-mute">(tú)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge tono={tonoEstado[u.estado]}>{etiquetaEstado[u.estado]}</Badge>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-ink-soft">
                    {u.ultimoAcceso ? formatearFecha(u.ultimoAcceso) : "Nunca"}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-ink-soft">
                    {u.onboardingCompletadoEn
                      ? formatearFecha(u.onboardingCompletadoEn)
                      : "Sin terminar"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {accion && (
                        <Button
                          variant={accion.accion === "bloquear" ? "peligro" : "secondary"}
                          size="sm"
                          disabled={ocupado === u.id}
                          onClick={() => ejecutar(u.id, accion.accion)}
                        >
                          {ocupado === u.id ? "…" : accion.texto}
                        </Button>
                      )}
                      {/* Sin condicionar a que el onboarding esté completo: quien
                          se quedó a medias también puede necesitar empezar de
                          cero, y la columna de al lado le dice al admin en qué
                          caso está. La cuenta del propio admin no se toca. */}
                      {u.rol !== "admin" && (
                        <DialogoLimpiarOnboarding
                          usuario={{ id: u.id, nombre: u.nombre, email: u.email }}
                          onLimpiado={(mensaje) => {
                            setAviso(null)
                            setExito(mensaje)
                            router.refresh()
                          }}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
