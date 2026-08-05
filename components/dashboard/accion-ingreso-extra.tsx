import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DialogoIngresoExtra } from "@/components/dashboard/dialogo-ingreso-extra"
import type { Moneda } from "@/lib/formato"

/**
 * "Registrar ingreso extra" (§6.7, RF-018): botón secundario **siempre
 * visible**, y en móvil **fijo al fondo de la pantalla**.
 *
 * Son dos piezas y no una porque el sitio cambia con el ancho: en escritorio
 * vive en la acción del encabezado, en móvil en una barra propia sobre el
 * contenido. Radix admite un solo `DialogTrigger` por diálogo, así que cada
 * una monta el suyo; solo una está visible a la vez, de modo que no hay dos
 * formularios compitiendo por el mismo estado.
 */

/** Para el slot `accion` de `EncabezadoPagina`. Se esconde en móvil. */
export function AccionIngresoExtra({ moneda }: { moneda: Moneda }) {
  return (
    <div className="hidden sm:block">
      <DialogoIngresoExtra
        moneda={moneda}
        trigger={
          <Button variant="secondary">
            <Plus className="size-5" />
            Registrar ingreso extra
          </Button>
        }
      />
    </div>
  )
}

/**
 * La barra fija de móvil. Va al final de la página, no en el layout: solo el
 * dashboard y la pantalla de ingresos la llevan, y ponerla en el layout la
 * colaría en deudas, objetivos y check-in.
 */
export function BarraIngresoExtraMovil({ moneda }: { moneda: Moneda }) {
  return (
    <>
      {/* Hueco del alto de la barra. Sin él, la barra tapa lo último de la
          página y no hay forma de leerlo: `fixed` sale del flujo. */}
      <div aria-hidden className="h-20 sm:hidden" />
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface px-4 pt-3 sm:hidden"
        // El teléfono con gesto de inicio se come la franja de abajo; sin esto
        // el botón queda debajo de la barra del sistema.
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        <DialogoIngresoExtra
          moneda={moneda}
          trigger={
            <Button variant="secondary" className="w-full">
              <Plus className="size-5" />
              Registrar ingreso extra
            </Button>
          }
        />
      </div>
    </>
  )
}
