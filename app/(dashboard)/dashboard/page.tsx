import Link from "next/link"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { EncabezadoPagina } from "@/components/layout/encabezado-pagina"
import { SiguientePaso } from "@/components/dashboard/siguiente-paso"
import { CifrasClave } from "@/components/dashboard/cifras-clave"
import { PlanAccion } from "@/components/dashboard/plan-accion"
import { ProyeccionPlegable } from "@/components/dashboard/proyeccion-plegable"
import { HistorialCheckins } from "@/components/dashboard/historial-checkins"
import { DialogoIngresoExtra } from "@/components/dashboard/dialogo-ingreso-extra"
import { EstadoVacio } from "@/components/estados/estado-vacio"
import { EstadoCargando } from "@/components/estados/estado-cargando"
import { EstadoError } from "@/components/estados/estado-error"
import { intencionActiva } from "@/lib/mock/objetivos"

const ESTADOS_REVISABLES = ["vacio", "cargando", "error"] as const
type EstadoRevisable = (typeof ESTADOS_REVISABLES)[number]

function esEstadoRevisable(valor: string | string[] | undefined): valor is EstadoRevisable {
  return typeof valor === "string" && (ESTADOS_REVISABLES as readonly string[]).includes(valor)
}

// Los estados de sistema son revisables por query param (§5):
// /dashboard?estado=vacio · ?estado=cargando · ?estado=error
export default async function DashboardPage(props: PageProps<"/dashboard">) {
  const { estado } = await props.searchParams

  if (esEstadoRevisable(estado)) {
    return (
      <div className="flex flex-col gap-10">
        <EncabezadoPagina titulo="Tu plan" />
        {estado === "cargando" && <EstadoCargando />}
        {estado === "vacio" && (
          <EstadoVacio
            mensaje="Todavía no tienes objetivos."
            accion={
              <Button asChild>
                <Link href="/onboarding/intencion">Definir mi primera intención</Link>
              </Button>
            }
          />
        )}
        {estado === "error" && (
          <EstadoError
            accion={
              <Button asChild>
                <Link href="/dashboard">Reintentar</Link>
              </Button>
            }
          />
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-10">
      <EncabezadoPagina
        titulo="Tu plan"
        descripcion={`Trabajando en: "${intencionActiva}"`}
        accion={
          <DialogoIngresoExtra
            trigger={
              <Button variant="secondary">
                <Plus className="size-5" />
                Registrar ingreso extra
              </Button>
            }
          />
        }
      />

      <SiguientePaso />
      <CifrasClave />
      <PlanAccion />
      <ProyeccionPlegable />
      <HistorialCheckins />
    </div>
  )
}
