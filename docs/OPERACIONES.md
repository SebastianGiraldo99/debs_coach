# Operaciones

Cómo se despliega, se actualiza y se rescata esta aplicación. Es el documento
que se lee con la app caída, así que va en orden de urgencia y sin rodeos.

**El resumen de la arquitectura de despliegue:** la app corre en un contenedor
Docker en el VPS, publicado solo en `127.0.0.1:3000`. Delante está el Nginx del
host, que termina el HTTPS. La base es el `shared_postgres` que ya vivía en ese
VPS, alcanzable por la red `shared_net`. Nada de esto se instala en el host
salvo Docker, git y el propio Nginx.

---

## 1. Primer despliegue

Requisitos en el VPS: Docker con el plugin `compose`, git, Nginx y el
contenedor `shared_postgres` corriendo.

### 1.1 Crear la base y su usuario

Dentro del Postgres que ya existe. La app **no** usa el superusuario:

```bash
docker exec -it shared_postgres psql -U postgres
```

```sql
CREATE USER coach_app WITH PASSWORD 'una-password-larga-y-aleatoria';
CREATE DATABASE coach_financiero OWNER coach_app;
\q
```

### 1.2 Clonar y configurar

```bash
sudo mkdir -p /opt/coach && sudo chown "$USER" /opt/coach
git clone <URL_DEL_REPO> /opt/coach
cd /opt/coach
cp .env.example .env
```

Rellenar `.env`. Lo que cambia respecto a desarrollo:

| Variable | Valor en el VPS |
|---|---|
| `DATABASE_URL` | `postgresql://coach_app:PASSWORD@shared_postgres:5432/coach_financiero?schema=public` — el host es el **nombre del contenedor**, no `127.0.0.1` |
| `APP_URL` | `https://tu-dominio` — de aquí salen los links de todos los correos |
| `JWT_SECRET` | Uno nuevo: `openssl rand -base64 32`, o `npm run script -- scripts/generar-secreto-jwt.mts`. **No** el de desarrollo |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Las credenciales reales del administrador |

Si la contraseña lleva caracteres especiales hay que URL-encodearlos en
`DATABASE_URL` (`@` → `%40`, `#` → `%23`, …). Una contraseña con un `@` sin
escapar produce un `P1001` que parece un problema de red y no lo es.

### 1.3 Levantar

```bash
docker compose up -d --build
```

El servicio `migraciones` corre `prisma migrate deploy` y termina; solo entonces
arranca `app`. Si una migración falla, la app **no** se levanta: es
deliberado, porque una app viva contra un schema que no le corresponde hace
daño silencioso.

### 1.4 Crear el administrador

La app es solo por invitación y nadie puede registrarse por su cuenta: alguien
tiene que ser el primero.

```bash
docker compose run --rm migraciones npx prisma db seed
```

Idempotente: si el admin ya existe no le pisa la contraseña.

### 1.5 Nginx y certificado

```bash
sudo cp deployment/nginx.conf.example /etc/nginx/sites-available/coach-financiero.conf
sudo sed -i 's/TU_DOMINIO/coach.tudominio.com/g' /etc/nginx/sites-available/coach-financiero.conf
sudo ln -s /etc/nginx/sites-available/coach-financiero.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d coach.tudominio.com
```

### 1.6 Comprobar

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://coach.tudominio.com/login   # 200
docker compose ps                                                            # app: healthy
```

Y entrar por navegador con el usuario admin.

---

## 2. Actualizar a una versión nueva

```bash
cd /opt/coach
git pull
docker compose up -d --build
```

`--build` no es opcional: sin él, compose relanza la imagen vieja y el `git
pull` no sirve de nada. Las migraciones corren solas antes de que la app
arranque.

Para volver atrás:

```bash
git log --oneline -5
git checkout <commit-anterior>
docker compose up -d --build
```

Ojo: **volver atrás en el código no deshace una migración**. Si el despliegue
que falló añadió columnas, revertir el código es seguro; si borró alguna, hay
que restaurar el respaldo (§4).

---

## 3. Logs y diagnóstico

```bash
docker compose logs -f app          # en vivo
docker compose logs --tail 200 app  # lo último
docker compose ps                   # estado y salud
```

Los logs rotan solos (10 MB × 5 archivos, configurado en `compose.yaml`), así
que no hace falta logrotate en el host.

Qué buscar según el síntoma:

| Síntoma | Dónde mirar |
|---|---|
| `P1001` / `DatabaseNotReachable` | `shared_postgres` está caído o `DATABASE_URL` apunta mal. `docker ps` y revisar que la app y la base compartan `shared_net` |
| El plan sale con `origen: "local"` | La llamada a OpenAI falló. El motivo queda en el payload del evento `plan_generado`. Sin `OPENAI_API_KEY` es lo esperado |
| Nadie recibe recordatorios | `docker compose logs app \| grep cron` — el planificador imprime una línea al arrancar |
| Correos duplicados | Hay más de una réplica de `app` corriendo. Ver el aviso en `compose.yaml` |
| 502 en Nginx | El contenedor no está publicando en `127.0.0.1:3000`. `docker compose ps` y `curl -I http://127.0.0.1:3000/api/salud` desde el host |

---

## 4. Respaldos

El script vuelca desde el contenedor de Postgres, comprime y aplica retención
de 30 días. Se instala en el cron del **host**, no de la app:

```bash
sudo crontab -e
```

```
0 3 * * * /opt/coach/scripts/backup-db.sh >> /var/log/coach-backup.log 2>&1
```

Comprobar que funciona antes de confiar en él:

```bash
/opt/coach/scripts/backup-db.sh
ls -lh /var/backups/coach/
```

Un respaldo que nadie ha restaurado nunca no es un respaldo. Conviene probar
la restauración una vez, en una base de pruebas, antes de necesitarla de
verdad.

### Restaurar

```bash
/opt/coach/scripts/restore-db.sh /var/backups/coach/coach-2026-08-06.sql.gz
```

Pide escribir `RESTAURAR`, guarda una copia del estado actual en `/tmp` por si
el respaldo estuviera corrupto, para la app, restaura y la vuelve a levantar.

---

## 5. Tareas periódicas

| Tarea | Cada cuánto | Cómo |
|---|---|---|
| Recordatorio de check-in | Diario 9:00 (Bogotá) | Automático, dentro de la app (`instrumentation.ts`) |
| Limpieza de sesiones vencidas | Diario 9:00 | Automático, mismo planificador |
| Respaldo de la base | Diario 3:00 | Cron del host, §4 |
| Marcar invitaciones vencidas | Semanal | `docker compose run --rm migraciones npm run script -- scripts/limpiar-invitaciones.mts` |
| Renovar certificado | Automático | Timer de certbot. Verificar con `sudo certbot renew --dry-run` |

Las dos primeras corren **dentro del proceso de la app**, no en el cron del
sistema. Es la razón por la que no puede haber más de una réplica.

---

## 6. Operaciones sobre usuarios

Todo lo administrativo se hace desde el panel `/admin` de la propia app:
invitar, aprobar, bloquear. No hay comandos para esto y no debería haberlos.

Lo único que se hace por consola es crear al primer admin (§1.4) y, si alguna
vez hiciera falta, rotar su contraseña — desde la app, entrando con ella.

**El admin no puede ver datos financieros de nadie**, por diseño. Si alguien
pide "mirar los datos de un usuario para ayudarlo", la respuesta es que no se
puede: las consultas del panel están escritas para no devolver esas columnas.
