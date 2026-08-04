import { AlertCircle } from "lucide-react"

/**
 * La alerta del plan: lo que el motor detectó y hay que mirar antes que nada
 * —gastos por encima de los ingresos, un mínimo que no se alcanza a cubrir—.
 *
 * Ámbar, nunca rojo: el rojo está reservado a la deuda, que es un dato y no
 * una falla (§18). No es `role="alert"` porque no ocurrió nada ahora mismo:
 * es una nota que acompaña al plan y se anunciaría en cada carga.
 */
export function AvisoPlan({ texto }: { texto: string }) {
  return (
    <div className="flex items-start gap-2 rounded-card border border-atencion-mid bg-atencion-soft p-5">
      <AlertCircle className="mt-0.5 size-5 shrink-0 text-atencion-mid" aria-hidden="true" />
      <p className="max-w-[65ch] text-cuerpo text-atencion text-pretty">{texto}</p>
    </div>
  )
}
