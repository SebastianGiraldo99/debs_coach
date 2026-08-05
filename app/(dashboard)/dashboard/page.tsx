import Link from "next/link"

import { Button } from "@/components/ui/button"
import { EncabezadoPagina } from "@/components/layout/encabezado-pagina"
import { SiguientePaso } from "@/components/dashboard/siguiente-paso"
import { CifrasClave } from "@/components/dashboard/cifras-clave"
import { PlanAccion } from "@/components/dashboard/plan-accion"
import { AvisoPlan } from "@/components/dashboard/aviso-plan"
import { BotonGenerarPlan } from "@/components/dashboard/boton-generar-plan"
import { ProyeccionPlegable } from "@/components/dashboard/proyeccion-plegable"
import { HistorialCheckins } from "@/components/dashboard/historial-checkins"
import {
  AccionIngresoExtra,
  BarraIngresoExtraMovil,
} from "@/components/dashboard/accion-ingreso-extra"
import { EstadoVacio } from "@/components/estados/estado-vacio"
import { EstadoCargando } from "@/components/estados/estado-cargando"
import { EstadoError } from "@/components/estados/estado-error"
import { requerirUsuario } from "@/lib/auth/dal"
import { cargarDashboard } from "@/lib/dashboard/datos"

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

  // El layout ya exigió sesión y onboarding completo; esta llamada la sirve la
  // caché de React sin consultar la base otra vez.
  const usuario = await requerirUsuario()
  const datos = await cargarDashboard(usuario)

  const encabezado = (
    <EncabezadoPagina
      titulo="Tu plan"
      descripcion={datos.intencion ? `Tu intención: "${datos.intencion}"` : undefined}
      accion={<AccionIngresoExtra moneda={datos.moneda} />}
    />
  )

  // Sin intención no hay plan que mostrar ni que generar: es la guía de todo
  // el motor. Ver `ContextoIncompletoError` en lib/ia/contexto.ts.
  if (!datos.intencion) {
    return (
      <div className="flex flex-col gap-10">
        {encabezado}
        <EstadoVacio
          mensaje="Todavía no nos has dicho qué quieres lograr con tu dinero. Sin eso no podemos armarte un plan."
          accion={
            <Button asChild>
              <Link href="/onboarding/intencion">Definir mi intención</Link>
            </Button>
          }
        />
        <BarraIngresoExtraMovil moneda={datos.moneda} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-10">
      {encabezado}

      {datos.plan ? (
        <>
          <SiguientePaso
            accion={datos.plan.siguientePaso.accion}
            porque={datos.plan.siguientePaso.porque}
          />
          {datos.plan.alerta && <AvisoPlan texto={datos.plan.alerta} />}
        </>
      ) : (
        // Cuenta completa y sin plan: el primer disparo falló al cerrar el
        // onboarding y se entró igual al dashboard. Las cifras de abajo se
        // pintan de todos modos porque no dependen del motor.
        <EstadoError
          titulo="Todavía no tenemos tu plan."
          cuerpo="Tus datos están guardados. Podemos intentarlo otra vez ahora mismo."
          accion={<BotonGenerarPlan />}
        />
      )}

      <CifrasClave
        moneda={datos.moneda}
        disponible={datos.capacidad.capacidadReal}
        deudaTotal={datos.capacidad.deudaTotal}
        numeroDeudas={datos.numeroDeudas}
        bajaDeuda={datos.bajaDeuda}
        mesesFaltan={datos.proyeccion.meses}
      />

      {datos.plan && (
        <PlanAccion
          pasos={datos.plan.pasos}
          otrasIntenciones={datos.otrasIntenciones}
          generadoEn={datos.planGeneradoEn}
          desactualizado={datos.planDesactualizado}
        />
      )}

      <ProyeccionPlegable
        proyeccion={datos.proyeccion}
        checkins={datos.checkins}
        moneda={datos.moneda}
      />
      <HistorialCheckins checkins={datos.checkins} moneda={datos.moneda} />
      <BarraIngresoExtraMovil moneda={datos.moneda} />
    </div>
  )
}
