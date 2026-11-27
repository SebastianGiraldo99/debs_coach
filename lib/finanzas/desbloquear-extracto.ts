import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import crearQpdf, { type QpdfInstance } from "@neslinesli93/qpdf-wasm"

const resolver = createRequire(import.meta.url)

type SistemaVirtual = QpdfInstance["FS"] & {
  init: (entrada: null, salida: (byte: number) => void, error: (byte: number) => void) => void
  writeFile: (ruta: string, contenido: Uint8Array) => void
}

export async function desbloquearExtracto(pdf: Buffer, contrasena: string) {
  let claveInvalida = false
  let finLinea = ""
  const opciones = {
    locateFile: () => join(dirname(resolver.resolve("@neslinesli93/qpdf-wasm")), "qpdf.wasm"),
    preRun: [(instancia: QpdfInstance) => {
      // Silencia la salida de QPDF para que el documento y la clave queden
      // fuera de los logs, aun cuando el archivo sea inválido.
      const fs = instancia.FS as SistemaVirtual
      fs.init(null, () => {}, (byte) => {
        if (byte === 10) {
          claveInvalida ||= finLinea.endsWith(": invalid password")
          finLinea = ""
          return
        }
        finLinea = (finLinea + String.fromCharCode(byte)).slice(-32)
      })
    }],
  }

  const qpdf = await crearQpdf(opciones)
  // QPDF opera en un sistema de archivos virtual. La clave se pasa a
  // WebAssembly en memoria, sin invocar un proceso ni un shell.
  const fs = qpdf.FS as SistemaVirtual
  fs.writeFile("/entrada.pdf", pdf)
  const clave = `--password=${contrasena}`
  const salidaAnterior = process.exitCode

  try {
    const estado = qpdf.callMain([
      clave,
      "--warning-exit-0",
      "--decrypt",
      "/entrada.pdf",
      "/salida.pdf",
    ])
    if (estado === 0) return { ok: true, pdf: Buffer.from(fs.readFile("/salida.pdf")) } as const

    return { ok: false, claveInvalida } as const
  } finally {
    // El envoltorio de Emscripten modifica el código de salida del proceso,
    // incluso al ejecutar un comando de diagnóstico. Las llamadas son síncronas.
    process.exitCode = salidaAnterior
  }
}
