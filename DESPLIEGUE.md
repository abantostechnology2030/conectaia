# Desplegar ConectaIA

> ## ✅ YA ESTÁ DESPLEGADO — https://conectaia.solucionesctec.com
>
> | | |
> |---|---|
> | **Servidor** | Hetzner `87.99.144.139` (`eskulclass-server`), compartido con 6 apps más |
> | **Ruta** | `/var/www/conectaia` · **PM2**: `conectaia` · **puerto 3003** |
> | **Nginx** | `/etc/nginx/sites-enabled/conectaia.solucionesctec.com` |
> | **SSL** | Let's Encrypt, renovación automática |
> | **Copias** | `/root/backups/conectaia/` — diarias a las 03:20, 14 días |
> | **Llave SSH** | `C:\Users\user\.ssh\publipropiedades_deploy` (la misma de publipropiedades) |
>
> ⚠️ **`www.conectaia.solucionesctec.com` NO resuelve todavía.** Falta el registro DNS; el
> certificado se emitió solo para el dominio sin `www`. Cuando exista el registro:
> `certbot --nginx -d conectaia.solucionesctec.com -d www.conectaia.solucionesctec.com`
>
> Lo que sigue es la guía completa, por si hay que rehacerlo o llevarlo a otro servidor.

---

Dominio: **conectaia.solucionesctec.com** · Repositorio:
`git@github.com:abantostechnology2030/conectaia.git` · Puerto interno: **3003**

El servidor sirve varias aplicaciones (3000 calificaprof, 3001 publipropiedades, 3002
iper-innova), así que ConectaIA mantiene el 3003 también en producción y Nginx hace de portero.

---

## 0. Antes de empezar

Hace falta en el servidor: **Node 20+**, **npm**, **git**, **nginx**, **pm2** (`npm i -g pm2`) y
**certbot** (`sudo apt install certbot python3-certbot-nginx`).

Y en el DNS, apuntando a la IP del servidor:

```
A    www.conectaia    <IP-del-servidor>
A    conectaia        <IP-del-servidor>
```

⚠️ **El DNS tiene que estar propagado ANTES del paso 5.** Certbot valida el dominio conectándose
a él; si todavía no resuelve, falla y hay que repetirlo.

---

## 1. Subir el código a GitHub (desde la máquina de desarrollo)

El repositorio ya está inicializado y con el primer commit hecho. Falta el `push`, que **no se
pudo hacer desde aquí**: esta máquina no tiene una clave SSH autorizada en esa cuenta de GitHub.

**Opción A — con SSH** (recomendada, es el remoto ya configurado):

```bash
# 1. Crear la clave, si no hay
ssh-keygen -t ed25519 -C "conectaia"

# 2. Copiar la pública y pegarla en GitHub:
#    Settings -> SSH and GPG keys -> New SSH key
cat ~/.ssh/id_ed25519.pub

# 3. Comprobar y subir
ssh -T git@github.com
git push -u origin main
```

**Opción B — con HTTPS y un token**, si prefieres no usar SSH:

```bash
git remote set-url origin https://github.com/abantostechnology2030/conectaia.git
git push -u origin main     # pide usuario y un token personal como contraseña
```

---

## 2. Traer el código al servidor

```bash
sudo mkdir -p /var/www && cd /var/www
sudo git clone git@github.com:abantostechnology2030/conectaia.git conectaia
sudo chown -R $USER:$USER /var/www/conectaia
cd /var/www/conectaia
```

---

## 3. Entorno y dependencias

```bash
cp .env.example .env
openssl rand -base64 32        # copia el resultado
nano .env                      # pégalo en AUTH_SECRET
```

⚠️ **`AUTH_SECRET` tiene que ser NUEVO, generado en el servidor.** Es lo que firma las sesiones:
con el de desarrollo, cualquiera que lo conozca puede fabricarse una sesión válida en producción.

```bash
npm ci                # `postinstall` genera el cliente de Prisma
npm run db:push       # crea las tablas
npm run db:seed       # catálogo, paquetes y la cuenta de administrador
npm run build
```

⚠️ **Cambia la contraseña del administrador nada más entrar.** El seed lo crea con
`admin@conectaia.com` / `admin123`, que es público: está en este repositorio.

⚠️ **`npm run db:seed` crea también las cuentas de demostración** (maría y carlos, `demo123`).
Si no las quieres en producción, bórralas desde `/admin/usuarios` después del primer arranque.

---

## 4. Arrancar con PM2

```bash
mkdir -p logs
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup            # ejecuta el comando que imprima, para que reviva al reiniciar
pm2 logs conectaia     # comprobar que arrancó
```

Debe responder en local:

```bash
curl -I http://127.0.0.1:3003
```

---

## 5. Nginx y certificado

```bash
sudo cp despliegue/nginx-conectaia.conf /etc/nginx/sites-available/conectaia
sudo ln -s /etc/nginx/sites-available/conectaia /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

sudo certbot --nginx -d www.conectaia.solucionesctec.com -d conectaia.solucionesctec.com
```

Certbot reescribe el archivo solo: añade el bloque del 443 y la redirección desde el 80. La
renovación automática ya queda puesta (`sudo certbot renew --dry-run` para comprobarlo).

⚠️ **Las cabeceras `X-Forwarded-*` del `proxy_pass` no son opcionales.** NextAuth va con
`trustHost: true` y reconstruye la URL a partir de lo que le llegue: sin `X-Forwarded-Proto https`
cree que está en http, marca la cookie de sesión como insegura y el navegador la rechaza. El
síntoma es desconcertante — el login "funciona" y acto seguido estás fuera.

---

## 6. Comprobar que quedó bien

```bash
curl -I https://www.conectaia.solucionesctec.com          # 200
curl -I https://conectaia.solucionesctec.com              # 200 (sin www)
```

Y a mano, en el navegador:

1. La portada carga con la ilustración
2. Entrar como administrador y **cambiar la contraseña**
3. Crear una cuenta de prueba y publicar algo
4. Aprobarlo desde `/admin/necesidades` — el badge del menú tiene que subir
5. Subir una foto en una publicación (comprueba `client_max_body_size` y los permisos de
   `public/uploads/`)

---

## Actualizar después

```bash
cd /var/www/conectaia
git pull
npm ci
npm run db:push        # solo si cambió prisma/schema.prisma
npm run build
pm2 restart conectaia
```

---

## Copias de seguridad

Dos cosas, y las dos importan:

```bash
# La base entera es UN archivo
cp /var/www/conectaia/prisma/dev.db  /ruta/copias/dev-$(date +%F).db

# Y las fotos que subieron los usuarios, que NO están en el repositorio
tar czf /ruta/copias/uploads-$(date +%F).tgz -C /var/www/conectaia/public uploads
```

⚠️ **`public/uploads/` no está en git a propósito** (son datos de usuarios, no código). Si solo se
respalda la base, las publicaciones quedan con fotos rotas.

Conviene ponerlo en un `cron` diario.

---

## Lo que NO está resuelto y hay que decidir

- **SQLite es un solo archivo y un solo proceso.** Por eso PM2 arranca **una** instancia. Sirve de
  sobra para empezar; si algún día hace falta escalar, primero hay que cambiar de base de datos, no
  subir el número de instancias.
- **No hay copias automáticas.** El `cron` de arriba hay que ponerlo.
- **Las cuentas de demostración y la contraseña del administrador son públicas** — están en el
  repositorio. Cambiarlas es parte del despliegue, no algo para después.
