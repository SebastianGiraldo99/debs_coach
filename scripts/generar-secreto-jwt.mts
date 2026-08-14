import { randomBytes } from "node:crypto"

/**
 * Genera un JWT_SECRET nuevo (RNF-002).
 *
 * Equivale a `openssl rand -base64 32`, que es lo que documentan
 * `.env.example` y `docs/OPERACIONES.md` §1.2. Existe como script para no
 * depender de que openssl esté instalado y para que la advertencia de abajo
 * viaje pegada al valor: quien rota el secreto casi nunca sabe que rotarlo no
 * echa a nadie.
 *
 * 32 bytes porque `lib/auth/session.ts` firma con HS256 y la clave se deriva
 * de la cadena tal cual (`TextEncoder`). Menos de 32 bytes de entropía deja la
 * firma por debajo de lo que el algoritmo supone.
 *
 * Uso:
 *   npm run script -- scripts/generar-secreto-jwt.mts
 *
 * El valor se imprime y NO se escribe en ningún archivo, a propósito: el
 * secreto de producción lo pega la persona en el archivo de entorno del
 * servidor, que es el único sitio donde debe existir.
 */

const secreto = randomBytes(32).toString("base64")

console.log(`\nJWT_SECRET="${secreto}"\n`)
console.log("Pégalo en el archivo de entorno del servidor. No lo compartas por chat ni lo")
console.log("guardes en el repositorio.\n")
console.log("Si estás ROTANDO el secreto de una app que ya está en uso, ojo:")
console.log("los JWT de acceso dejan de verificar, pero el refresh es un token opaco que")
console.log("vive en la tabla `sesiones` y NO depende de este secreto. El proxy lo canjea")
console.log("por un acceso nuevo, así que nadie sale: las sesiones siguen vivas hasta 7")
console.log("días. Para expulsar a todo el mundo de verdad —un secreto filtrado— hay que")
console.log("además borrar las filas de `sesiones` (docs/OPERACIONES.md §6).\n")
