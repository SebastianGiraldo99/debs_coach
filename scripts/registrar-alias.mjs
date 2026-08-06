import { register } from "node:module"

/**
 * Engancha el resolvedor del alias `@/` a Node. Va en su propio archivo porque
 * `register()` tiene que correr antes de que se cargue el módulo principal, y
 * eso solo se consigue con `--import`.
 *
 * Se usa a través de `npm run script -- scripts/<archivo>.mts`.
 */
register("./alias.mjs", import.meta.url)
