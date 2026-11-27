import { TIPO_FLUJO_EXTRACTO, type EventoExtracto, type ResultadoExtracto } from "@/lib/finanzas/extractos"

export async function leerResultadoExtracto(
  respuesta: Response,
  alAnalizar: () => void,
): Promise<ResultadoExtracto> {
  if (respuesta.status === 413) {
    return { ok: false, mensaje: "El servidor rechazó el tamaño del envío. Prueba con un PDF más pequeño." }
  }

  const tipo = respuesta.headers.get("content-type") ?? ""
  if (tipo.startsWith("application/json")) return respuesta.json()
  if (!tipo.startsWith(TIPO_FLUJO_EXTRACTO) || !respuesta.body) {
    return {
      ok: false,
      mensaje: `El servidor no pudo procesar el extracto (HTTP ${respuesta.status}). Puedes volver a intentarlo.`,
    }
  }

  const lector = respuesta.body.pipeThrough(new TextDecoderStream()).getReader()
  let pendiente = ""
  try {
    for (;;) {
      const { done, value } = await lector.read()
      if (done) break
      const lineas = (pendiente + value).split("\n")
      pendiente = lineas.pop() ?? ""
      for (const linea of lineas) {
        const evento: EventoExtracto = JSON.parse(linea)
        if (evento.tipo === "analizando") alAnalizar()
        if (evento.tipo === "resultado") return evento.resultado
      }
    }
  } finally {
    await lector.cancel().catch(() => undefined)
    lector.releaseLock()
  }
  return { ok: false, mensaje: "La conexión se cerró antes de recibir el análisis. Vuelve a intentarlo." }
}
