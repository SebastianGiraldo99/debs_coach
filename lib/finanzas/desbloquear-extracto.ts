import crearQpdf, { type QpdfInstance } from "@neslinesli93/qpdf-wasm"

// Si algo falla antes del try interno de Emscripten (por ejemplo, en
// `locateFile`), la promesa del módulo no se resuelve ni se rechaza nunca. Sin
// este plazo, la petición quedaba colgada hasta que Nginx respondía con 504.
const PLAZO_CARGA_QPDF_MS = 15_000

type SistemaVirtual = QpdfInstance["FS"] & {
  init: (entrada: null, salida: (byte: number) => void, error: (byte: number) => void) => void
  writeFile: (ruta: string, contenido: Uint8Array) => void
}

export async function desbloquearExtracto(pdf: Buffer, contrasena: string) {
  let claveInvalida = false
  let finLinea = ""
  const opciones = {
    // Emscripten llama a `locateFile(archivo, prefijo)` con el `__dirname` de
    // su propio `qpdf.js` como prefijo, que es donde está `qpdf.wasm`. El
    // paquete es externo (`serverExternalPackages`), así que ese directorio es
    // el real de node_modules. La versión anterior calculaba la ruta con
    // `createRequire().resolve()`, pero Turbopack reescribe esa llamada por el
    // id numérico del módulo: `dirname()` recibía un número y lanzaba solo en
    // el build de producción. (Los tipos del paquete declaran `() => string`,
    // de ahí el rest.)
    locateFile: (...[archivo, prefijo]: string[]) => prefijo + archivo,
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

  let temporizador: ReturnType<typeof setTimeout> | undefined
  const plazo = new Promise<never>((_, rechazar) => {
    temporizador = setTimeout(
      () => rechazar(new Error("QPDF no terminó de cargar a tiempo")),
      PLAZO_CARGA_QPDF_MS,
    )
  })
  const qpdf = await Promise.race([crearQpdf(opciones), plazo]).finally(() => clearTimeout(temporizador))
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
