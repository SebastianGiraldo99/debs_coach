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

## El Motor IA

Un solo camino de entrada: `generarYGuardarPlan()` en `lib/ia/servicio.ts`.
`POST /api/ia/generar-plan` es una cáscara sobre esa función; el check-in y el
ingreso extra la llamarán directamente desde el servidor, sin pasar por HTTP.

El cuerpo del endpoint admite `{ trigger, ingresoExtraId? }` y nada más. Ni un
campo de texto libre llega al prompt: **todo lo que el modelo lee sale de la
base**, consultado con el `usuarioId` de la sesión (RF-035, RF-036).

- **El contrato del plan lo manda la pantalla, no `docs/plan.md`.** El plan
  pide `mensaje_motivacional` / `plan_pagos[]`; lo que se implementó es la
  forma que ya renderizan `components/dashboard/` sobre `lib/mock/plan.ts`:
  `siguientePaso`, `pasos[]` (con ids `paso_02`…), `mesesLibertad`, `mensaje`,
  `alerta`. Vive en `lib/ia/schema.ts`, que es también el validador.
- **La IA no hace aritmética.** Devuelve prosa accionable. Las cifras duras
  —capacidad, deuda total, mínimos— salen de `calcularCapacidadReal` y se
  congelan en `contenido.cifras` del plan: el consejo se dio sobre esos
  números y releerlos meses después lo volvería incoherente.
- **`generarPlan()` nunca lanza.** Sin API key, con error del proveedor o con
  un JSON que no valida, cae a `planLocal()` (`lib/ia/mock.ts`), que calcula
  un plan por avalancha con los datos reales. Queda marcado `origen: "local"`
  y el motivo en el payload del evento. Nadie se queda sin plan.
- **Los logs del motor no llevan cifras ni prosa.** Ante un JSON inválido se
  loguean las rutas de los campos que fallaron, no sus valores.
- Timeout de 45 s (`AbortSignal.timeout`) para el total, un reintento y solo
  ante fallos de transporte: una respuesta malformada no se repregunta.
- **`temperature` no se manda a todos los modelos.** Los de razonamiento
  responden `400 … only the default (1) value is supported`. El motor lo
  aprende del primer 400, reintenta sin el campo y recuerda el modelo en
  memoria: cambiar `OPENAI_MODEL` no exige tocar código (RF-038). Con
  `gpt-5.6-luna` la respuesta tarda unos 17 s.
- Dos planes del mismo trigger en menos de 20 s no se generan dos veces: se
  devuelve el recién hecho. Es la defensa contra el doble envío.
- El primer disparo lo hace `app/onboarding/egresos/page.tsx` tras cerrar el
  onboarding. Si falla, entra igual al dashboard: dejar a alguien atrapado en
  un formulario ya cerrado es peor que un dashboard sin plan.

## El Dashboard

`lib/dashboard/datos.ts` es la única entrada: una función, todas las consultas
en paralelo, y las vistas reciben props. Ningún componente de
`components/dashboard/` consulta la base por su cuenta — así las cifras, la
gráfica y el plan hablan siempre del mismo momento.

- **Las tres cifras son de hoy; el plan es de cuando se generó.** La capacidad
  y la deuda se recalculan en cada carga. Las de `plan.cifras` quedaron
  congeladas y sostienen la prosa del consejo. Cuando se separan más de la
  tolerancia de `datos.ts`, "Tu plan" añade *"con las cifras que tenías
  entonces"* en vez de esconder la diferencia.
- **`proyectarDeuda()` (`lib/finanzas/proyeccion.ts`) alimenta a la vez la
  cifra "Faltan N meses" y la gráfica.** Calculadas por separado se
  contradecían. Simula por avalancha, con interés, pagando primero los mínimos.
  No es el `mesesLibertad` del plan, que viene del modelo y envejece con él.
- Sin margen mensual **no hay curva**: la gráfica cede el sitio a una frase. Una
  línea plana a 50 años no es una proyección.
- **El historial de check-ins sale de `eventos`**, no de `check_ins`:
  `progresoPct` es una columna hecha para eso. El Sprint 5 debe escribir el
  evento `check_in` con `progresoPct` y el payload `{ pagado, deudaTotal }` que
  documenta `lib/checkins/historial.ts`. El parseo es tolerante: un payload
  distinto deja la lista vacía, no rompe la pantalla.
- **Editar deudas o ingresos no dispara el Motor IA.** Los tres disparadores
  están fijados (RF-034) y el CRUD no es uno; el aviso de plan desactualizado
  es la respuesta a eso. El ingreso extra sí dispara, y por eso vive en
  `/api/ingresos/extra` y no en el CRUD de `/api/ingresos`.
- El `POST /api/ingresos/extra` **guarda primero y llama al motor después**, y
  responde 200 aunque el plan falle (`planActualizado: false`). El dato que
  reportó la persona es lo único que la app no puede reconstruir.
- **Las columnas `@db.Date` se formatean con `formatearFechaUtc`.** Prisma las
  devuelve como medianoche UTC y `formatearFecha` lee la hora local: en
  Colombia el día se corre uno hacia atrás.

## Estado por sprint

| Sprint | Estado |
|---|---|
| 0 — Fundaciones | ✅ proxy, DAL, argon2, seed del admin |
| 1 — Auth, invitaciones, panel admin | ✅ completo y probado contra la base |
| 2 — Onboarding | ✅ captura datos reales y marca `onboardingCompletadoEn` |
| 3 — Motor IA | ✅ genera, valida y persiste el plan; probado contra OpenAI de verdad |
| 4 — Dashboard e ingreso extra | ✅ dashboard, deudas e ingresos sobre datos reales; probado end-to-end |
| 5 — Check-in y cron | ⬜ **siguiente** — prueba manual del 4 ya pasada |
| 6 — Objetivos | ⬜ |
| 7 — QA y despliegue | ⬜ |

### La prueba manual del Sprint 4: hecha, y lo que salió de ella

El dashboard pasó por navegador. Salieron dos cosas, las dos ya arregladas:

- **El campo de dinero no agrupaba los miles hasta salir del campo.** Ahora
  agrupa en cada pulsación. La parte difícil no era agrupar sino el cursor: al
  insertar un separador el navegador lo deja donde estaba y el caret se corre
  una posición por cada punto nuevo. `CampoMoneda` cuenta los caracteres que la
  persona tecleó antes del cursor y busca esa misma posición en el texto ya
  formateado, así que editar en medio del número no manda el cursor al final.
  Si tocas ese campo, no rompas eso.
- **Nadie conoce su tasa de interés.** `lib/finanzas/tasa.ts` la deduce del
  saldo, la cuota y las cuotas que faltan, por bisección sobre la anualidad
  —no tiene forma cerrada—. La tasa no es decorativa: ordena el método
  avalancha en el plan y en la proyección. El número de cuotas **no se
  persiste**; la tasa sí. De paso, el onboarding pasó a pedir el pago mínimo,
  que no preguntaba: todas las deudas creadas ahí quedaban sin mínimo.

Queda **una sola cosa sin ver en navegador**: la barra fija de móvil que se
acaba de implementar (§6.7). Compruébala a 375px antes de darla por buena.

Para montar el escenario, ver "Datos de prueba" en Flujo de desarrollo. Sin
`OPENAI_API_KEY` el motor cae a `planLocal()` con las cifras reales, que
alcanza para probar la pantalla sin gastar tokens.

### Decisiones ya tomadas — no las reabras

**El recordatorio quincenal va con `node-cron` y PM2 en modo `fork`
(RF-028).** `docs/plan.md` lo pide en `instrumentation.ts` y la ETR nombra
`node-cron` en su diagrama de arquitectura, así que no es un detalle de
implementación sino arquitectura escrita. La trampa: ese hook corre **una vez
por proceso**, de modo que con PM2 en cluster el correo sale tantas veces como
instancias haya. Por eso el Sprint 7 **tiene que fijar `exec_mode: "fork"` e
`instances: 1`** en `ecosystem.config.js`, y dejarlo dicho ahí en un
comentario: con 11 usuarios como máximo una instancia sobra, y cambiarlo a
cluster fallaría en silencio —nadie se entera hasta que alguien recibe el
mismo correo tres veces—.

**El botón de ingreso extra ya está fijo al fondo en móvil (§6.7).** Vive en
`components/dashboard/accion-ingreso-extra.tsx`, que exporta las dos piezas:
`AccionIngresoExtra` para el slot del encabezado en escritorio y
`BarraIngresoExtraMovil` para la barra fija. Cada una monta su propio diálogo
porque Radix admite un solo `DialogTrigger`; solo una está visible a la vez. La
barra lleva delante un hueco de su mismo alto, porque `fixed` sale del flujo y
si no tapa lo último de la página.

### Decisión abierta — la decide el usuario

**Dónde vive Postgres en producción (Sprint 7).** `docs/plan.md` manda
instalar PostgreSQL local en el VPS y ajustar `pg_hba.conf`. Pero **ya corre
en Docker en ese VPS** —es contra lo que se desarrolla por el túnel SSH— así
que el plan describe un servidor que no es el que existe. Antes de desplegar
hay que decidir si se usa el contenedor que ya está o se levanta otro, y
rehacer los pasos 2 y 3 del Sprint 7 en consecuencia.

**Aclaración de algo que NO es una duda:** RF-029 fija **tres preguntas**
—pagos, nuevas deudas, ingresos extra— y el "paso 4" que describe
`docs/plan.md` es la pantalla de resultado, no una cuarta pregunta. No hay
contradicción entre ambos documentos; queda escrito para que nadie lo
"arregle".

Y una trampa de nombres: `docs/plan.md` cita `FormDeudas` y `FormIngresoExtra`,
que **no existen**. Los componentes reales son `components/forms/fila-deuda.tsx`
y `components/dashboard/dialogo-ingreso-extra.tsx`. Reusarlos, no rehacerlos.

**3 archivos siguen leyendo `lib/mock/`**: las páginas de `objetivos` y
`checkin`, y `components/checkin/checkin-formulario.tsx`. Se conectan en los
sprints 5 y 6. (`lib/finanzas/etiquetas.ts` y `lib/ia/schema.ts` solo lo
mencionan en comentarios.)

Los mocks son el contrato visual —replican los campos del schema— así que
conectar una pantalla es **sustituir el import por la consulta real, no rehacer
la vista**. **No añadas dependencias nuevas hacia `lib/mock/`**; al conectar
una pantalla, elimina el mock que se quede sin consumidores.

Pendientes conocidos:
- Cerrar el onboarding deja **dos eventos `plan_generado`** seguidos: la foto
  inicial que escribe `/api/onboarding/completar` (sin `planIaId`, con las
  cifras de partida) y el plan de verdad. Al pintar el historial hay que
  distinguirlos por el payload.
- `PlanGuardado.generadoEn` se calcula con `toISOString()`, o sea en UTC:
  después de las 7 p.m. en Colombia guarda el día siguiente. Hoy nadie lo
  muestra —el dashboard usa `PlanIa.createdAt`— pero si se pinta, hay que
  arreglarlo antes.
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
RFC 2606). Para probar el área de usuario sin pasar por el onboarding a mano,
siembra una cuenta completa —objetivos, ingresos, egresos y deudas— y límpiala
después (el `onDelete: Cascade` se lleva todo lo que cuelga):

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/sembrar-usuario-prueba.mts
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/limpiar-datos-prueba.mts
```

La cuenta sembrada es `dashboard@local.test` / `prueba-dashboard-2026`, con el
onboarding cerrado y **sin plan**: lo primero que se ve es el estado "Todavía
no tenemos tu plan" con su botón de reintento.

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
