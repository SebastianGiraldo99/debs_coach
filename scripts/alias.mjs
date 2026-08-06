import { statSync } from "node:fs"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

/**
 * Hook de resolución para que los scripts puedan importar módulos de la app.
 *
 * El código de `lib/` usa el alias `@/…` de TypeScript, que entiende el
 * compilador y entiende Next, pero no Node: el type stripping nativo transpila
 * los tipos y deja los `import` tal cual, así que `@/lib/db/prisma` llega al
 * resolvedor como si fuera un paquete de npm y revienta con ERR_MODULE_NOT_FOUND.
 *
 * Sin esto, cualquier script que quisiera reusar lógica real tendría que
 * duplicarla o obligar a `lib/` a usar rutas relativas solo para complacer a
 * los scripts. Se registra desde `scripts/registrar-alias.mjs`.
 */

const RAIZ = path.resolve(fileURLToPath(import.meta.url), "../..")

/** El orden importa: `.ts` antes que `.js` porque aquí casi todo es TypeScript. */
const EXTENSIONES = [".ts", ".tsx", ".mts", ".js", ".mjs"]

function esArchivo(ruta) {
  try {
    return statSync(ruta).isFile()
  } catch {
    return false
  }
}

/** Reproduce lo que hace el compilador: prueba extensiones y luego index. */
function resolverRuta(base) {
  if (esArchivo(base)) return base
  for (const extension of EXTENSIONES) {
    const candidato = `${base}${extension}`
    if (esArchivo(candidato)) return candidato
  }
  for (const extension of EXTENSIONES) {
    const candidato = path.join(base, `index${extension}`)
    if (esArchivo(candidato)) return candidato
  }
  return null
}

export async function resolve(especificador, contexto, siguiente) {
  if (!especificador.startsWith("@/")) return siguiente(especificador, contexto)

  const resuelto = resolverRuta(path.join(RAIZ, especificador.slice(2)))
  if (!resuelto) {
    throw new Error(
      `No se encontró "${especificador}". El alias @/ apunta a ${RAIZ}; revisa la ruta.`,
    )
  }

  return siguiente(pathToFileURL(resuelto).href, contexto)
}
