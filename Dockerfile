# ──────────────────────────────────────────────────────────────────────────────
# Coach Financiero — imagen de producción.
#
# Tres etapas para que la imagen final no cargue con el compilador ni con las
# dependencias de build. La etapa `constructor` se reutiliza tal cual desde
# compose.yaml para correr las migraciones: ahí sí está el CLI de Prisma, que
# en la imagen final sobra.
#
# Debian slim y no Alpine a propósito: `argon2` es un módulo nativo y sus
# binarios precompilados son para glibc. En musl habría que compilarlo en cada
# build —y con él instalar python3, make y g++ en la imagen final—.
# ──────────────────────────────────────────────────────────────────────────────

FROM node:24-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1


# ─── Dependencias ─────────────────────────────────────────────────────────────
# En su propia etapa para que un cambio en el código no reinstale nada: mientras
# package-lock.json no cambie, Docker reutiliza esta capa entera.
FROM base AS dependencias

# Para compilar argon2 si no hubiera binario precompilado para esta plataforma.
# Si lo hay —el caso normal en linux/amd64— estas herramientas no se usan, pero
# tenerlas evita que el build falle de golpe en una arquitectura distinta.
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci


# ─── Construcción ─────────────────────────────────────────────────────────────
FROM base AS constructor

COPY --from=dependencias /app/node_modules ./node_modules
COPY . .

# `prisma generate` va ANTES del build: el cliente generado es lo que
# TypeScript resuelve al compilar. Sin esto el build falla con tipos que "no
# existen" aunque estén en el schema.
RUN npx prisma generate

# El build necesita que exista la variable, no que la base responda: nada
# consulta durante la compilación, pero `lib/db/prisma.ts` revienta si falta.
# La de verdad la inyecta compose en tiempo de ejecución.
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build"
ENV JWT_SECRET="solo-para-el-build-no-se-usa-en-runtime"
RUN npm run build


# ─── Ejecución ────────────────────────────────────────────────────────────────
FROM base AS ejecucion

ENV NODE_ENV=production
# El servidor tiene que escuchar en todas las interfaces: en 127.0.0.1 solo lo
# alcanzaría algo dentro del propio contenedor, y Nginx quedaría fuera.
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Usuario sin privilegios. `node` ya viene en la imagen oficial.
USER node

# `standalone` trae su propio server.js y los node_modules que hicieron falta
# de verdad. `public/` y `.next/static/` NO se copian solos —lo dice la doc de
# Next— y sin ellos la app sirve HTML sin estilos ni fuentes.
COPY --from=constructor --chown=node:node /app/.next/standalone ./
COPY --from=constructor --chown=node:node /app/.next/static ./.next/static
COPY --from=constructor --chown=node:node /app/public ./public

EXPOSE 3000

# Sin npm por medio: `npm start` deja un proceso intermedio que se come las
# señales, y el contenedor tarda diez segundos en morir en cada despliegue.
CMD ["node", "server.js"]
