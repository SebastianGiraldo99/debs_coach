import { Button } from "@/components/ui/button"

/**
 * Descargar todos los datos en Excel (RF-071).
 *
 * Un enlace y no un botón con fetch: el navegador se encarga de la descarga y
 * funciona sin JavaScript. Sin icono a propósito: un icono de lucide dentro del
 * `Slot` de `asChild` desaparece del HTML del servidor (ver CLAUDE.md).
 *
 * El texto dice para qué sirve y qué contiene, porque el archivo sale de la
 * app: quien lo descarga debe saber que lleva todas sus cifras.
 */
export function ExportarDatos() {
  return (
    <section aria-labelledby="exportar-titulo" className="flex flex-col gap-3 border-t border-line pt-8">
      <h2 id="exportar-titulo" className="text-seccion font-semibold text-ink">
        Tus datos
      </h2>
      <p className="max-w-[65ch] text-cuerpo text-ink-soft text-pretty">
        Descarga todo lo que has registrado en un Excel, con una hoja por tema: deudas, ingresos,
        gastos, objetivos, check-ins y tu plan. Sirve para revisarlo a tu manera o dárselo a otra
        herramienta. Lleva todas tus cifras, así que compártelo solo con quien confíes.
      </p>
      <Button asChild variant="secondary" className="self-start">
        <a href="/api/exportar" download>
          Descargar mis datos en Excel
        </a>
      </Button>
    </section>
  )
}
