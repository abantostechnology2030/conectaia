# ConectaIA

Marketplace bidireccional de servicios. Una misma cuenta publica lo que **necesita** y lo que
**sabe hacer**; la plataforma encuentra las coincidencias y cobra un crédito a quien decide
iniciar el contacto.

```
NECESIDAD  ↕  SERVICIO OFRECIDO
```

## Puesta en marcha

```bash
npm install
npm run db:push     # crea prisma/dev.db
npm run db:seed     # catálogo, paquetes, admin y cuentas de demostración
npm run dev         # http://localhost:3003
```

## Cuentas de prueba

| Correo | Contraseña | Quién es |
|---|---|---|
| `admin@conectaia.com` | `admin123` | Administrador |
| `maria@conectaia.com` | `demo123` | Solo busca: publica una necesidad de pintura |
| `carlos@conectaia.com` | `demo123` | Solo ofrece: publica un servicio de pintura |

Entra con Carlos y mira `/oportunidades`: la necesidad de María ya aparece ahí, con su porcentaje
de compatibilidad calculado.

## Qué ve cada usuario

Al entrar por primera vez, la app pregunta **si necesita un servicio o si lo ofrece**, y activa
solo las opciones de ese lado: quien solo quiere contratar no ve "Ofrezco un servicio" ni "Mis
postulaciones", y al revés.

Sigue siendo **una sola cuenta**: el otro lado se activa cuando quiera desde *Mi perfil* o desde el
aviso del panel, y cambiarlo **no borra ni despublica nada**.

## Cómo funciona el cobro

Publicar y postularse es gratis. Se consume **1 crédito** cuando alguien decide desbloquear un
contacto, y lo paga **solo quien da ese paso**:

- **María acepta la oferta de Carlos** → paga María.
- **Carlos ve la necesidad de María y decide contactarla** → paga Carlos.

En ambos casos, después las dos partes ven los datos de la otra. Nunca se cobra a los dos por el
mismo contacto.

## Comandos

```bash
npm run dev       # servidor de desarrollo (puerto 3003)
npm run build     # compilación de producción
npm run db:reset  # borra lo transaccional y vuelve a sembrar
npm run probar    # reinicia la base y corre 93 comprobaciones de flujo end-to-end
```

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Prisma 6 + SQLite ·
NextAuth v5 · bcryptjs. Sin IA: el matching es estructurado y determinista, y vive aislado en
`lib/matching.ts` para poder sustituirlo más adelante.

## Documentación

`CLAUDE.md` tiene el contexto completo: reglas de negocio, modelo de datos, cómo se calcula el
matching, convenciones y los fallos que no dan error.
