@AGENTS.md

# Coach Financiero (debs_coach)

App web privada de coaching financiero con IA. Acceso **solo por invitación**,
máximo **11 usuarios** (1 admin + 10). La IA no es un chat: es un motor backend
que se dispara en tres momentos (fin de onboarding, check-in, ingreso extra).

Todo el código —identificadores, comentarios, mensajes de error— va en
**español**. Los commits también.

## Documentación

| Archivo | Para qué |
|---|---|
| `docs/ESPECIFICACION_TECNICA.md` | Qué hace. Fuente de verdad de RF/RNF. Cita los RF con cuidado: el numerado no es intuitivo (RF-001 es *invitar*, RF-004 es *iniciar sesión*). |
| `docs/DIRECTRICES_DISENO.md` | Cómo se ve y cómo se escribe. §19 es el tono de voz. |
| `docs/plan.md` | En qué orden. **Parcialmente desactualizado** — ver más abajo. |

## Cambios de ruptura ya verificados

Descubiertos ejecutando, no leyendo. `AGENTS.md` tiene razón: consulta
`node_modules/next/dist/docs/` antes de escribir.

- **Next 16 renombró Middleware → Proxy.** El archivo es `proxy.ts` en la raíz.
  No existe `middleware.ts`, aunque `docs/plan.md` todavía lo pida.
- **`params` y `searchParams` son promesas** en páginas y route handlers.
- **Prisma 7 eliminó el motor Rust y exige un Driver Adapter.**
  `new PrismaClient({...})` sin `adapter` lanza *"requires either 'adapter' or
  'accelerateUrl'"*. Se usa `@prisma/adapter-pg`. **`prisma.config.ts` solo
  alimenta al CLI** (migrate, seed, studio): la URL hay que pasársela aparte al
  cliente de runtime, en `lib/db/prisma.ts`.
- **`prisma migrate dev` no regenera el cliente** de forma fiable. Si TS se
  queja de un campo que sí existe en el schema, corre `npx prisma generate`.
- **`migrate dev` es interactivo** y falla al eliminar valores de un enum. Ruta
  no interactiva: `migrate diff --from-config-datasource --to-schema` para
  generar el SQL, ponerlo en `prisma/migrations/<timestamp>_nombre/` y aplicar
  con `migrate deploy`.
- **Node 24 hace type stripping nativo**, sin flags. No hace falta `tsx`; los
  scripts usan extensión `.mts`.
- **zod 4**: `z.email()` es top-level, no `z.string().email()`. Los enums
  necesitan `{ error: "..." }` o responden en inglés con los valores internos.

## Arquitectura de acceso — dos capas

No las confundas:

- **`proxy.ts`** — comprobación **optimista**. Solo lee el JWT de la cookie.
  Cero consultas a la base: corre en cada request, incluidos los prefetch, y la
  doc de Next lo desaconseja como capa de autorización. Su matcher **excluye
  `/api`**.
- **`lib/auth/dal.ts`** — la autorización **real**, pegada a los datos y
  memorizada con `cache()` de React. Un JWT sigue siendo válido 24 h aunque el
  admin haya bloqueado la cuenta hace un minuto, así que el estado se relee de
  la base en cada acceso.
- **`lib/auth/api.ts`** — guardias para route handlers, que responden con
  códigos de estado en vez de `redirect()`. `exigirAdmin` devuelve **404, no
  403**: a quien no es admin no se le confirma que la ruta existe.

**Regla que no se rompe:** el `usuarioId` sale **siempre** de la sesión, nunca
del cuerpo ni de la URL.

## Estado por sprint

| Sprint | Estado |
|---|---|
| 0 — Fundaciones | ✅ proxy, DAL, argon2, seed del admin |
| 1 — Auth, invitaciones, panel admin | ✅ completo y probado contra la base |
| 2 — Onboarding | ✅ captura datos reales y marca `onboardingCompletadoEn` |
| 3 — Motor IA | ⬜ **siguiente** |
| 4 — Dashboard | ⬜ |
| 5 — Check-in y cron | ⬜ |
| 6 — Objetivos | ⬜ |
| 7 — QA y despliegue | ⬜ |

**12 archivos siguen leyendo `lib/mock/`**: las 5 páginas de `(dashboard)`
—dashboard, deudas, ingresos, objetivos, checkin— y 7 componentes de
`components/dashboard|graficas|checkin`. Se conectan en los sprints 4 a 6.

Los mocks son el contrato visual —replican los campos del schema— así que
conectar una pantalla es **sustituir el import por la consulta real, no rehacer
la vista**.

`components/forms/` ya está migrado: las etiquetas de los enums viven en
`lib/finanzas/etiquetas.ts` y se derivan de `@prisma/client`. **No añadas
dependencias nuevas hacia `lib/mock/`**; al conectar una pantalla, elimina las
que tenga.

Pendientes conocidos:
- `/checkin` es un formulario de un solo campo, no el flujo de 3 pasos que
  exige RF-029. Se rehace en el Sprint 5.
- `app/(dashboard)/estilo/` es una página de desarrollo; se elimina antes de
  producción.
- `GET /api/admin/usuarios` no existe a propósito: la página consulta la base
  directamente y `router.refresh()` la repinta. Un endpoint sin consumidor sería
  superficie de ataque sin función.

## Flujo de desarrollo

**PostgreSQL vive en Docker en el VPS, sin exponer.** Hace falta un túnel SSH,
y se cae con frecuencia — si ves `DatabaseNotReachable` o `P1001`, es esto:

```bash
ssh -fN -o ServerAliveInterval=30 -L 5433:127.0.0.1:5432 root@agotech.cloud
```

`DATABASE_URL` apunta al puerto **local 5433**. El túnel es transparente para
Prisma: no necesita configuración especial.

**Para no enviar correos reales al probar**, arranca en modo consola. El enlace
de invitación se imprime en el log, que es como se captura el token:

```bash
RESEND_API_KEY= npm run dev
```

**Datos de prueba**: usa siempre direcciones `@local.test` (TLD reservado por la
RFC 2606) y limpia después:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/limpiar-datos-prueba.mts
```

**No puedes leer `.env`** — lo bloquean `.claude/settings.json` y un hook. La
plantilla documentada es `.env.example`; los valores los pone el usuario. El
hook salta con cualquier comando que contenga la cadena `.env`, incluso en un
mensaje de commit: pásalos por archivo con `git commit -F`.

**El proyecto está en `~/Documents`, que sincroniza iCloud.** Aparecen archivos
duplicados `"… 2.ts"` dentro de `.next/` que rompen el typecheck. Se arregla con
`rm -rf .next`.

Antes de commitear: `npx tsc --noEmit`, `npm run lint` y `npm run build`.

## Decisiones de producto que un cambio rompería

- **Moneda**: la DB guarda el monto en su moneda de denominación y **nunca lo
  reescribe convertido**. El MVP sale sin tasas de cambio, así que todos los
  montos de un usuario comparten su `monedaBase`.
- **`estado` vs `onboardingCompletadoEn`**: el primero es control de **acceso**
  y lo decide el admin; el segundo es **progreso** del usuario. La ETR llama
  "activo" a ambos; por eso están separados.
- **La fórmula central**: `Ingresos − Egresos (impuestos + supervivencia) =
  capacidad real`. Por eso `impuestos` es una categoría de egreso propia. No se
  recorta a cero si da negativo.
- **Máximo 2 gráficas en toda la app**, plegadas por defecto en el dashboard.
  Exactamente 3 cifras sobre el pliegue. Sin gradientes, sin emojis, sin
  gamificación. Los tokens de `app/globals.css` son la única fuente de color y
  tipografía: ningún componente lleva hexadecimales.
- **El admin nunca ve datos financieros** de nadie. Los `select` del panel son
  explícitos y cortos por eso.
