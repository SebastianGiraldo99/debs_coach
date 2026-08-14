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
| `docs/plan.md` | En qué orden. **Parcialmente desactualizado** — ver más abajo. Su Sprint 7 (PM2, Nginx, PostgreSQL en el host) quedó sustituido por Docker. |
| `docs/OPERACIONES.md` | Cómo se despliega, se actualiza y se restaura. Se lee con la app caída. |

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

- **`proxy.ts`** — comprobación **optimista**. Lee el JWT de la cookie y no
  consulta la base para autorizar: corre en cada request, incluidos los
  prefetch, y la doc de Next lo desaconseja como capa de autorización. Su
  matcher **excluye `/api`**. La única consulta que se permite es la del
  refresco, y solo cuando el acceso ya venció (ver "La sesión").
- **`lib/auth/dal.ts`** — la autorización **real**, pegada a los datos y
  memorizada con `cache()` de React. Un JWT sigue siendo válido 24 h aunque el
  admin haya bloqueado la cuenta hace un minuto, así que el estado se relee de
  la base en cada acceso.
- **`lib/auth/api.ts`** — guardias para route handlers, que responden con
  códigos de estado en vez de `redirect()`. `exigirAdmin` devuelve **404, no
  403**: a quien no es admin no se le confirma que la ruta existe.

**Regla que no se rompe:** el `usuarioId` sale **siempre** de la sesión, nunca
del cuerpo ni de la URL.

## La sesión — dos cookies (RNF-002)

`coach_session` es el JWT de acceso: 24 h, stateless, se verifica sin tocar la
base. `coach_refresh` es un token opaco de 7 días que sí existe en la tabla
`sesiones`, guardado hasheado con SHA-256. Esa mitad con estado es lo que hace
revocable a la sesión —un JWT no se puede retirar— y vive en
`lib/auth/refresco.ts`.

- **El refresh rota en cada uso** y las rotaciones comparten `familia`. Que
  aparezca un token ya rotado significa que hay dos copias en circulación, así
  que se revoca **la familia entera**: no hay forma de saber cuál de las dos es
  el ladrón, y echar a los dos deja al dueño volviendo a entrar con su
  contraseña.
- **Hay una ventana de gracia de 60 s** para esa detección. Sin ella, dos
  peticiones en paralelo del mismo navegador —una navegación y su prefetch—
  canjean el mismo token y la segunda parecería un robo. Dentro de la ventana
  se emite otro token sin revocar nada.
- **El vencimiento NO se recalcula al rotar.** La sesión caduca a los 7 días de
  su inicio; si cada rotación lo empujara, una pestaña abierta la renovaría
  para siempre y el plazo no significaría nada.
- **El refresco solo puede ocurrir en dos sitios**, porque son los únicos que
  pueden escribir cookies: `proxy.ts` para las páginas y `exigirUsuario()` de
  `lib/auth/api.ts` para las rutas de API —que el matcher del proxy excluye—.
  Durante el render de un Server Component escribir una cookie es un error de
  Next, así que el DAL nunca refresca: lee lo que el proxy ya dejó.
- En `lib/auth/api.ts` el refresco va **antes** de `usuarioActual()`: esa
  función está memorizada con `cache()` y un `null` resuelto antes se quedaría
  fijo para todo el request.
- **Bloquear a alguien revoca sus sesiones.** El DAL ya le negaba los datos,
  pero dejarle el refresh vivo significaría que al desbloquearlo entra sin
  volver a autenticarse.
- El cron diario borra lo vencido. Las revocadas se van con un día de retraso:
  si la revocación fue por robo, ese día es el único rastro de lo que pasó.

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

## El Check-in

`POST /api/checkin` recibe las tres preguntas de RF-029 y **lo apartado para
cada meta con monto**, que no es una cuarta pregunta sino el detalle de la
tercera: el dinero que entró de más fue a algún sitio.

- **Primero se persiste lo que la persona reportó, después se llama al motor.**
  Al revés, un fallo del proveedor borraría los pagos que acaba de anotar.
  `CheckIn.respuestaIa` y `planGenerado` son opcionales por eso, y un check-in
  sin plan **sigue contando** para la fecha del siguiente (RF-033).
- El abono **se recorta al saldo**: pagar de más es saldar, no generar un saldo
  a favor que la app no sabe representar.
- El denominador del avance por deuda **incluye las saldadas**. Si no, saldar
  una deuda bajaría el porcentaje, que es al revés de lo que pasó.
- `Evento.progresoPct` es el avance de la **intención principal**, no un
  promedio: mezclar un 80% de deuda saldada con un 10% de una cuota inicial da
  un 45% que no describe nada. El detalle por objetivo va en `CheckIn.snapshot`.
- La capacidad se recalcula **dentro** de la transacción. `calcularCapacidadReal`
  usa el cliente de fuera y no vería ninguna de las escrituras anteriores.
- El sí/no del flujo **no viene preseleccionado**: un "no" por defecto haría que
  quien no lee la pregunta reporte que no abrió deudas, y eso envenena el plan
  sin que nadie se entere.
- **Con deudas activas y el total abonado en $0 no se pasa del paso 1.** La
  condición lleva `deudas.length > 0` por fuerza: sin esa parte, quien ya no
  debe nada no tendría dónde escribir una cifra y el check-in sería un callejón
  sin salida —su próxima fecha no avanzaría y el cron le mandaría recordatorios
  para siempre—. Queda un caso vivo por decisión del usuario: quien tuvo un mes
  malo y no abonó nada tampoco pasa. Si algún día molesta, la salida es una
  casilla explícita de "no pagué nada este periodo", no quitar el bloqueo.

**Metas con monto.** `Objetivo.montoObjetivo` es opcional y **nunca se deduce
del texto**: clasificar intenciones escritas a mano sería adivinar, y adivinar
mal pone una barra de progreso donde no la hay. `montoAcumulado` lo reporta la
persona; repartir la capacidad real entre las intenciones daría el avance sobre
lo que *debería* haber apartado, que no es lo que apartó.

## Los Objetivos

`lib/objetivos/compromiso.ts` guarda las dos reglas —tope de 3 (RF-022) y
candado de 30 días (RF-024)— y las leen a la vez la pantalla y los tres
endpoints. El 30 duplicado en dos sitios acababa con un botón prometiendo lo
que la API rechaza.

- **Marcar una intención como lograda NO dispara el Motor IA**, aunque
  `docs/plan.md` lo pida. `TriggerPlan` tiene tres valores y RF-034 los fija;
  un cuarto sería cambiar el requerimiento desde una migración. El plan se
  recalibra en el próximo check-in, y eso es exactamente lo que dice la
  propuesta que aparece al cerrar la meta: prometer menos y cumplirlo.
- **El candado cubre el texto y el monto.** Subir la meta de 10 a 20 millones
  cambia el plan tanto como reescribir la frase.
- **Guardar sin cambiar nada no reinicia los 30 días.** Quien abre el diálogo,
  lo lee y le da a guardar no cambió de objetivo; cobrarle un mes por eso sería
  un castigo por curiosear.
- **Editar no escribe evento**: `TipoEvento` no tiene `objetivo_editado` y
  añadirlo obligaría a migrar el enum para alimentar un historial que nadie
  pinta. Crear y lograr sí lo escriben, y el `payload` de `objetivo_logrado`
  congela intención y montos.
- **"Ya la logré" funciona dentro de los 30 días.** El candado es contra cambiar
  de idea, no contra terminar. Cerrar sí es definitivo: no se reabre, se crea
  otra —y la nueva arranca su propio compromiso—.
- La propuesta de RF-027 va por `?nueva=1`: el botón navega y **la página**
  decide si ofrecerla, porque es la que sabe cuántas quedan activas. Con las 3
  ocupadas no se propone nada, que es lo honesto.

## El cron

`instrumentation.ts` → `lib/cron/scheduler.ts`. **`register()` corre en todos
los entornos, incluido Edge**, así que el planificador se importa de forma
dinámica y solo bajo `NEXT_RUNTIME === "nodejs"`: un import estático arrastraría
`node-cron` y Prisma al bundle de Edge y el build fallaría.

- Corre **todos los días a las 9:00** (`America/Bogota`), no cada quince: quién
  está vencido lo decide la consulta mirando el último check-in de cada
  persona, que son fechas distintas.
- `Usuario.ultimoRecordatorioEn` evita el correo diario a quien se salta un
  check-in. Solo se marca **si el envío salió bien**.
- El job va envuelto en try/catch: una excepción sin capturar dentro de
  `node-cron` tumbaría el proceso entero.
- Para probarlo sin esperar: `RESEND_API_KEY= npm run script --
  scripts/probar-recordatorios.mts --vencer <email>`.

## El icono dentro de un DialogTrigger

**lucide-react v1 lleva `"use client"`.** Un `<Plus/>` creado en un Server
Component es una *referencia de cliente*, y el `Slot` de Radix (`DialogTrigger
asChild`) no la sabe clonar durante el render del servidor: **el botón entero
desaparece del HTML** y solo aparece al hidratar, con el error de hidratación
correspondiente. Reventaba en cuatro pantallas —dashboard, deudas, ingresos,
objetivos— desde el Sprint 4; se encontró en el recorrido de QA del Sprint 8.

La regla: **el icono de un trigger nace dentro del cliente.** Por eso los
diálogos traen su propio botón de alta (`trigger` es opcional) y
`accion-ingreso-extra.tsx` lleva `"use client"`. Un trigger de **solo texto**
—"Editar", "Ya la logré"— sí se puede seguir pasando desde el servidor.

Para comprobarlo sin adivinar: cargar la página en un contexto con JavaScript
desactivado —eso es el HTML del servidor— y contar los botones. El que falta es
el que rompe.

## El contenedor

`Dockerfile` + `compose.yaml`, con el Nginx del host delante. La operación
entera está en `docs/OPERACIONES.md`; aquí solo lo que muerde si se toca.

- **`output: "standalone"` en `next.config.ts`.** La imagen final no lleva
  `node_modules` completos. El precio: `public/` y `.next/static/` **no se
  copian solos** —lo dice la doc de Next— y el Dockerfile lo hace a mano. Si se
  quitan esas dos líneas, la app sirve HTML sin CSS y nadie ve un error.
- **Debian slim, no Alpine.** `argon2` es nativo y sus binarios precompilados
  son para glibc; en musl habría que compilarlo en cada build.
- **Las migraciones son un servicio aparte** (`migraciones`), construido con la
  etapa `constructor` porque la imagen final no lleva el CLI de Prisma. La app
  espera a que termine bien: una migración rota detiene el despliegue en vez de
  dejar la app viva contra un schema que no le corresponde.
- **La app publica solo en `127.0.0.1:3000`.** El único que debe alcanzarla es
  el Nginx del host; en `0.0.0.0` sería accesible por IP saltándose el HTTPS y
  las cabeceras de seguridad.
- **`/api/salud` no toca la base a propósito.** Si Postgres parpadea, lo que
  hay que arreglar es Postgres; reiniciar una app sana alarga el corte. Nginx
  además lo devuelve como 404 hacia fuera.
- El `.dockerignore` excluye `.env` en primer lugar: los secretos entran por
  `env_file` en runtime, nunca horneados en una capa —de donde saldrían con un
  `docker history`—.

**Scripts que importan módulos de la app** necesitan `npm run script --
scripts/<archivo>.mts`. El type stripping de Node deja los `import` tal cual y
el alias `@/` le llega como si fuera un paquete de npm; `scripts/alias.mjs` es
el hook de resolución que lo arregla.

## Estado por sprint

| Sprint | Estado |
|---|---|
| 0 — Fundaciones | ✅ proxy, DAL, argon2, seed del admin |
| 1 — Auth, invitaciones, panel admin | ✅ completo y probado contra la base |
| 2 — Onboarding | ✅ captura datos reales y marca `onboardingCompletadoEn` |
| 3 — Motor IA | ✅ genera, valida y persiste el plan; probado contra OpenAI de verdad |
| 4 — Dashboard e ingreso extra | ✅ dashboard, deudas e ingresos sobre datos reales; probado end-to-end |
| 5 — Check-in y cron | ✅ flujo, API, progreso por objetivo y recordatorio; probado contra la base |
| 6 — Objetivos | ✅ CRUD de intenciones, candado de 30 días y cierre; probado contra la base |
| 7 — Sesión y contenedor | 🟨 refresh token probado en base y en navegador; el Docker está escrito pero **sin construir** |
| 8 — QA y puesta en producción | 🟨 **en curso** — el recorrido visual está hecho y aprobado; faltan las pruebas de seguridad y el despliegue |

### Lo que queda, en orden

1. ~~IDOR con dos cuentas reales (RNF-005)~~ — **hecho de verdad**, 15/15 sin
   hallazgos. Ver "La prueba de IDOR" más abajo.
2. ~~Que el admin no vea cifras de nadie (RNF-006)~~ — probado por el usuario.
3. ~~Borrar `app/(dashboard)/estilo/`~~ — eliminada. Vive en el historial de git
   por si hace falta volver a mirar el sistema completo de un vistazo.
4. **Construir la imagen por primera vez** — hazlo en el VPS, no en el Mac: así
   el primer build ocurre en linux/amd64, que es la arquitectura que importa.
5. **Desplegar** siguiendo `docs/OPERACIONES.md` §1.

Antes del paso 5 hacen falta cosas que solo puede preparar el usuario.
Comprobadas por DNS el 2026-08-13:

- ✅ **Subdominio**: `coach.agotech.cloud` resuelve a la misma IP que
  `agotech.cloud`. Es el `APP_URL` de producción; tiene que coincidir con el
  `server_name` de Nginx y con el dominio del certificado.
- ✅ **Resend**: DKIM (`resend._domainkey.mail.agotech.cloud`), SPF y MX
  (`send.mail.agotech.cloud` → `feedback-smtp.sa-east-1.amazonses.com`) y un
  DMARC `p=none` en la raíz. Falta solo confirmar en el panel de Resend que el
  dominio figure verificado; el DNS ya está.
- ⬜ `OPENAI_API_KEY` de producción.
- ⬜ Un `JWT_SECRET` nuevo — `scripts/generar-secreto-jwt.mts`.
- ⬜ El usuario `coach_app` con su base dentro de `shared_postgres`.

**El archivo de entorno del VPS lo escribe el usuario a mano**, copiándolo al
servidor. Hubo un script que lo generaba preguntando los valores; se descartó
por decisión suya. Si alguien lo rehace, lo que había que cuidar era:
URL-encodear la contraseña dentro de `DATABASE_URL` —una `@` sin escapar da un
`P1001` que parece un problema de red—, permisos 600 y que el archivo quede en
`/opt/debs_coach/.env`, que es donde lo busca el `env_file` del compose.

**Un agente no puede entrar al VPS.** Verificado de nuevo el 2026-08-13:
`ssh -o BatchMode=yes root@agotech.cloud` responde `Permission denied
(publickey…)`. Los pasos 4 y 5 los ejecuta el usuario.

### La prueba de IDOR (RNF-005)

`scripts/idor-sembrar.mts` monta dos cuentas completas y `scripts/idor-probar.mts`
ataca con la sesión de una los recursos de la otra. **15/15 sin hallazgos.**

```bash
RESEND_API_KEY= OPENAI_API_KEY= npm run dev     # deja libre el 3000, o usa BASE_URL
npm run script -- scripts/idor-sembrar.mts      # imprime los ids en JSON
BASE_URL=http://localhost:3000 npm run script -- scripts/idor-probar.mts '<ese JSON>'
npm run script -- scripts/limpiar-datos-prueba.mts
```

Tres cosas que hacen que la prueba signifique algo, y que se pierden si alguien
la "simplifica":

- **Los uuid son reales y ajenos.** La versión anterior usaba uuid
  inexistentes, que devuelven 404 *aunque la consulta no filtre por dueño*: no
  probaba nada. Es la razón de ser de los dos usuarios.
- **Cada ataque lleva su control positivo**: la misma petición contra el
  recurso propio de A, que debe dar 200. Sin eso, un cuerpo que zod rechaza
  daría 404 en todo y el script se leería como una app segura. El cuerpo tiene
  que ser **válido** para llegar hasta la capa de autorización.
- **En el check-in un id ajeno no da 404**, se ignora en silencio a propósito
  (ver "El Check-in"). Ahí la comprobación no es el status —responde 200— sino
  que el saldo y el `montoAcumulado` de B no se movieron, releídos de la base.

Cubre los `[id]` de la URL —deudas, ingresos, objetivos, `logrado`— y los ids
que viajan en el **cuerpo**, que son los que se olvidan: `pagos[].deudaId` y
`aportes[].objetivoId` del check-in, y el `ingresoExtraId` de generar-plan. Este
último se comprueba sobre `construirContexto`, no sobre la prosa del plan: el
contexto es exactamente lo que el modelo llegaría a leer y no depende del
proveedor ni gasta tokens. También verifica que `/api/admin/usuarios/[id]`
responda **404 y no 403** a quien no es admin, y 401 sin cookie.

### Las pruebas manuales: hechas, y lo que salieron de ellas

El dashboard del Sprint 4 pasó por navegador. Salieron dos cosas, las dos ya
arregladas, y las dos siguen siendo las de mayor riesgo de romper sin querer:

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

El flujo de check-in del Sprint 5 también pasó por navegador, incluida la
pantalla de resultado, y quedó aprobado sin cambios.

Los objetivos del Sprint 6 se probaron **contra la base, no en navegador**: los
tres endpoints con curl y sesión real (editar, candado de 30 días, guardar sin
cambios, tope de 3, cerrar, cerrar dos veces, uuid ajeno → 404) y el HTML de la
pantalla en sus tres formas —con cupo, sin cupo y con la propuesta de RF-027—.

**El recorrido del Sprint 8 cerró todo lo visual en navegador y el usuario lo
aprobó**, incluida la barra fija de móvil (§6.7) a 375px, que era lo único del
área de usuario que nadie había visto. Salieron cuatro cosas, las cuatro ya
resueltas:

- **El error de hidratación de los triggers con icono** (ver más arriba), que
  llevaba ahí desde el Sprint 4 en cuatro pantallas. Arreglado y verificado: las
  cinco pantallas cargan sin un solo error de consola.
- **La fila de navegación con scroll horizontal se cambió por un menú de
  hamburguesa** por debajo de 768px, con el botón en la esquina **izquierda** y
  primero en el DOM. Iba contra las directrices, que lo prohibían
  explícitamente; el documento quedó corregido con el motivo.
- **En el check-in no se pasa del paso 1 sin abonos** (ver "El Check-in").
- El botón de acción del encabezado **cae debajo del título** en pantallas
  intermedias, porque `EncabezadoPagina` envuelve y el bloque de texto ocupa
  `max-w-[65ch]`. Se le enseñó al usuario y lo dejó como está; si algún día
  molesta, es una línea en ese componente.

El ciclo de sesión (RNF-002) también pasó por navegador: renovación con el
acceso vencido, rotación del refresh, expulsión del ladrón que reutiliza un
token viejo y logout que deja el refresh inservible.

**Cómo se condujo ese recorrido, por si hay que repetirlo.** No hay
`chromium-cli` en esta máquina, pero sí Chrome: se instaló `playwright` en el
scratchpad y se lanzó con `chromium.launch({ channel: "chrome" })`, sin
descargar navegador. Dos trucos que valieron la pena:

- Un contexto con `javaScriptEnabled: false` da **el HTML del servidor sin
  hidratar**. Comparar sus botones con los del contexto normal es lo que
  destapó el fallo de los iconos.
- Escuchar `pageerror` y `console` con tipo `error` en cada navegación
  convierte "parece que va bien" en una lista de fallos.

Para montar el escenario, ver "Datos de prueba" en Flujo de desarrollo. Sin
`OPENAI_API_KEY` el motor cae a `planLocal()` con las cifras reales, que
alcanza para probar la pantalla sin gastar tokens.

### Decisiones ya tomadas — no las reabras

**El recordatorio quincenal va con `node-cron` dentro del proceso de la app
(RF-028).** `docs/plan.md` lo pide en `instrumentation.ts` y la ETR nombra
`node-cron` en su diagrama de arquitectura, así que no es un detalle de
implementación sino arquitectura escrita. La trampa: ese hook corre **una vez
por proceso**, de modo que con dos instancias el correo sale por duplicado. Por
eso `compose.yaml` lleva **una sola réplica** y lo dice en un comentario: con 11
usuarios como máximo una instancia sobra, y escalarlo fallaría en silencio
—nadie se entera hasta que alguien recibe el mismo correo tres veces—.

**PM2 se descartó: la app va en Docker.** `docs/plan.md` y la ETR describen un
despliegue con PM2 y PostgreSQL instalado en el host; el VPS real ya corre todo
en contenedores, así que el despliegue es `compose.yaml` + el Nginx del host, y
`ecosystem.config.js` no existe ni hace falta.

**El botón de ingreso extra ya está fijo al fondo en móvil (§6.7).** Vive en
`components/dashboard/accion-ingreso-extra.tsx`, que exporta las dos piezas:
`AccionIngresoExtra` para el slot del encabezado en escritorio y
`BarraIngresoExtraMovil` para la barra fija. Cada una monta su propio diálogo
porque Radix admite un solo `DialogTrigger`; solo una está visible a la vez. La
barra lleva delante un hueco de su mismo alto, porque `fixed` sale del flujo y
si no tapa lo último de la página.

**Postgres en producción: el `shared_postgres` que ya existe.** Era la decisión
abierta del Sprint 7 y la cerró el usuario. La app se une a la red externa
`shared_net` y apunta a `shared_postgres:5432`; no se levanta una base nueva ni
se migran datos, solo se crean el usuario `coach_app` y la base
`coach_financiero` dentro del contenedor que ya está. Los pasos 2 y 3 del
Sprint 7 de `docs/plan.md` —instalar PostgreSQL en el host, tocar
`pg_hba.conf`— **no aplican**.

**Aclaración de algo que NO es una duda:** RF-029 fija **tres preguntas**
—pagos, nuevas deudas, ingresos extra— y el "paso 4" que describe
`docs/plan.md` es la pantalla de resultado, no una cuarta pregunta. No hay
contradicción entre ambos documentos; queda escrito para que nadie lo
"arregle".

Y una trampa de nombres: `docs/plan.md` cita `FormDeudas` y `FormIngresoExtra`,
que **no existen**. Los componentes reales son `components/forms/fila-deuda.tsx`
y `components/dashboard/dialogo-ingreso-extra.tsx`. Reusarlos, no rehacerlos.

**`lib/mock/` ya no existe.** La última pantalla que leía de ahí era
`objetivos`, y el Sprint 6 la conectó; `egresos.ts` se fue con ella —estaba
huérfano desde antes del Sprint 4, nunca tuvo pantalla—. Si `docs/plan.md` o
`docs/DIRECTRICES_DISENO.md` mandan a la carpeta, describen la maqueta, no el
código de hoy: **no la recrees**. Toda pantalla consulta la base.

Pendientes conocidos:
- **La imagen de Docker nunca se ha construido.** No hay Docker en la máquina
  de desarrollo, así que `Dockerfile` y `compose.yaml` están escritos y
  razonados pero sin ejecutar. Lo que sí se probó, y es la parte que más
  fácilmente se rompe, es la salida `standalone`: arranca, sirve las páginas y
  los estáticos —tras copiar `public/` y `.next/static/` a mano, como hace el
  Dockerfile— y el planificador del cron se programa dentro de ella. El primer
  `docker compose up --build` es del Sprint 8.
- **El túnel SSH se cae solo y hay que reabrirlo a mano.** Un agente no puede:
  la llave pide autenticación interactiva y responde `Permission denied
  (publickey)`. Si aparece `P1001` a mitad de una sesión, es esto — pídeselo al
  usuario en vez de dar vueltas.
- Cerrar el onboarding deja **dos eventos `plan_generado`** seguidos: la foto
  inicial que escribe `/api/onboarding/completar` (sin `planIaId`, con las
  cifras de partida) y el plan de verdad. Al pintar el historial hay que
  distinguirlos por el payload.
- `PlanGuardado.generadoEn` se calcula con `toISOString()`, o sea en UTC:
  después de las 7 p.m. en Colombia guarda el día siguiente. Hoy nadie lo
  muestra —el dashboard usa `PlanIa.createdAt`— pero si se pinta, hay que
  arreglarlo antes.
- **La revocación por robo no expulsa a la víctima al instante**, y es a
  propósito: su JWT de acceso sigue siendo válido hasta 24 h porque un JWT no se
  puede retirar. Al ladrón sí se le corta de inmediato; la víctima cae cuando su
  acceso vence y el refresh revocado ya no la rescata. Verificado en navegador.
- **El aviso de plan desactualizado solo mira cifras.** `datos.ts` compara
  capacidad y deuda, así que cerrar una intención o editarla deja el plan
  aconsejando sobre una meta que ya no está, sin avisar. No es urgente —el
  siguiente check-in lo recalibra— pero si alguien quiere cerrarlo, la señal
  barata es comparar `PlanIa.createdAt` con el evento `objetivo_logrado` más
  reciente.
- `GET /api/admin/usuarios` no existe a propósito: la página consulta la base
  directamente y `router.refresh()` la repinta. Un endpoint sin consumidor sería
  superficie de ataque sin función.

## Flujo de desarrollo

**El repo ya está en GitHub**: `origin` apunta a
`https://github.com/SebastianGiraldo99/debs_coach.git` y `main` está subido. El
despliegue del VPS clona de ahí (`docs/OPERACIONES.md` §1.2). **El push lo hace
el usuario**, no se hace solo.

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
