"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { DialogoLimpiarOnboarding } from "@/components/admin/dialogo-limpiar-onboarding"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Interruptor } from "@/components/ui/interruptor"
import { enviar } from "@/lib/api-cliente"
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
  /** Si puede recalcular su plan cuando quiera (RF-068). */
  puedeRecalcularPlan: boolean
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
  /**
   * El valor que el admin acaba de pedir para el interruptor. Es controlado y su
   * verdad viene del servidor, así que sin esto se ve apagado durante el
   * segundo que tarda el refresh, como si el clic no hubiera servido. Solo se
   * descarta si falla: tras un éxito coincide con lo que traerá el servidor.
   */
  const [permisoPedido, setPermisoPedido] = useState<{ id: string; valor: boolean } | null>(
    null,
  )

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

  /**
   * Enciende o apaga el permiso de recalcular (RF-070). Manda el valor que
   * debe quedar, no "invertir": si la tabla estaba vieja, el resultado es lo
   * que el admin vio al hacer clic.
   */
  async function cambiarPermiso(u: FilaUsuario, activar: boolean) {
    setAviso(null)
    setExito(null)
    setOcupado(u.id)
    setPermisoPedido({ id: u.id, valor: activar })
    const respuesta = await enviar(`/api/admin/usuarios/${u.id}/permisos`, "PUT", {
      recalcularPlan: activar,
    })
    setOcupado(null)

    if (!respuesta.ok) {
      setPermisoPedido(null)
      setAviso(respuesta.mensaje)
      return
    }
    setExito(
      activar
        ? `${u.nombre} ya puede recalcular su plan cuando quiera.`
        : `${u.nombre} ya no puede recalcular su plan a voluntad.`,
    )
    router.refresh()
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
        <table className="w-full min-w-[60rem] text-left text-menor">
          <thead className="border-b border-line bg-surface-alt text-ink-mute">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Nombre</th>
              <th scope="col" className="px-4 py-3 font-medium">Correo</th>
              <th scope="col" className="px-4 py-3 font-medium">Estado</th>
              <th scope="col" className="px-4 py-3 font-medium">Último acceso</th>
              <th scope="col" className="px-4 py-3 font-medium">Onboarding</th>
              <th scope="col" className="px-4 py-3 font-medium">Recalcular plan</th>
              <th scope="col" className="px-4 py-3 font-medium">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-surface">
            {usuarios.map((u) => {
              const accion = u.rol === "admin" ? null : accionPorEstado[u.estado]
              const permitido =
                permisoPedido?.id === u.id ? permisoPedido.valor : u.puedeRecalcularPlan
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
                    {/* La etiqueta accesible nombra a la persona: es lo que
                        distingue un interruptor de otro al recorrer la tabla
                        con lector de pantalla. */}
                    {u.rol !== "admin" && (
                      <div className="flex items-center gap-2 text-ink-soft">
                        <Interruptor
                          activado={permitido}
                          disabled={ocupado === u.id}
                          onCambiar={(activar) => cambiarPermiso(u, activar)}
                          etiqueta={`Permitir que ${u.nombre} recalcule su plan cuando quiera`}
                        />
                        <span aria-hidden="true">{permitido ? "Activado" : "Apagado"}</span>
                      </div>
                    )}
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
