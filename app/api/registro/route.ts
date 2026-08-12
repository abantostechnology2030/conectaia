import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { getConfig, esSi, aNumero } from '@/lib/config'
import { mover } from '@/lib/creditos'
import { modoEfectivo } from '@/lib/modos'
import { normalizarDni, dniValido, ERROR_DNI } from '@/lib/dni'

export async function POST(req: Request) {
  const cfg = await getConfig()
  if (!esSi(cfg.registro_abierto)) {
    return Response.json({ error: 'El registro está cerrado por ahora' }, { status: 403 })
  }

  const b = await req.json().catch(() => ({}))

  const nombres = String(b.nombres ?? '').trim()
  const apellidos = String(b.apellidos ?? '').trim()
  const dni = normalizarDni(b.dni)
  const email = String(b.email ?? '').trim().toLowerCase()
  const password = String(b.password ?? '')
  const celular = String(b.celular ?? '').trim()
  const ciudad = String(b.ciudad ?? '').trim()
  const modo = modoEfectivo(b.modo)

  if (!nombres || !apellidos) {
    return Response.json({ error: 'Escribe tus nombres y apellidos' }, { status: 400 })
  }
  if (!dniValido(dni)) {
    return Response.json({ error: ERROR_DNI }, { status: 400 })
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return Response.json({ error: 'Escribe un correo válido' }, { status: 400 })
  }
  if (password.length < 6) {
    return Response.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
  }
  if (!ciudad) {
    return Response.json({ error: 'Escribe tu ciudad' }, { status: 400 })
  }
  // En el alta el celular es OBLIGATORIO: es por donde se hablan las dos partes
  // cuando alguien paga un desbloqueo, y una cuenta sin él llega hasta el cobro
  // y ahí se queda —el crédito gastado en un contacto al que no se puede
  // escribir—. En el perfil sigue pudiendo cambiarse.
  if (!/^\d{9}$/.test(celular.replace(/\s/g, ''))) {
    return Response.json({ error: 'El celular debe tener 9 dígitos' }, { status: 400 })
  }

  // El DNI se mira en la MISMA consulta que el correo: son las dos formas de
  // repetir cuenta, y hay que distinguirlas para poder decirle al usuario cuál
  // de las dos le está estorbando.
  const existe = await prisma.usuario.findFirst({
    where: { OR: [{ email }, { dni }] },
    select: { email: true },
  })
  if (existe) {
    return existe.email === email
      ? Response.json({ error: 'Ya existe una cuenta con ese correo' }, { status: 409 })
      : Response.json({ error: 'Ya existe una cuenta con ese DNI' }, { status: 409 })
  }

  const regalo = aNumero(cfg.creditos_bienvenida, 0)

  const crear = () =>
    prisma.$transaction(async (tx) => {
      const u = await tx.usuario.create({
        data: {
          rol: 'usuario',
          email,
          password: await bcrypt.hash(password, 10),
          nombres,
          apellidos,
          dni,
          celular: celular.replace(/\s/g, ''),
          // El WhatsApp arranca igual que el celular; se puede cambiar en el perfil.
          whatsapp: celular.replace(/\s/g, ''),
          ciudad,
          // Nace CON su lado ya elegido: la pregunta se hace una sola vez, en el
          // propio formulario de registro, y llega marcada desde la puerta de la
          // portada por la que entró. Así al iniciar sesión no hay nada que
          // preguntar y se entra directo al panel que le toca.
          //
          // Quien llegue al registro por su cuenta y no marque nada se queda con
          // `busco`, que es lo que decide `modoEfectivo`: nacer sin lado dejaría
          // media cuenta inservible, porque ya no hay ninguna pantalla que
          // pregunte.
          modo,
          estado: 'activo',
          creditos: 0,
        },
      })

      // Los créditos de bienvenida entran como movimiento, no como valor inicial
      // del campo: así el histórico cuadra desde el primer día.
      if (regalo > 0) {
        await mover(tx, {
          usuarioId: u.id,
          tipo: 'ajuste',
          cantidad: regalo,
          motivo: 'Créditos de bienvenida',
        })
      }

      return u
    })

  // La comprobación de más arriba no basta: dos altas a la vez con el mismo
  // correo o el mismo DNI la pasan las dos, y solo el índice único las separa.
  // Sin este `catch` la segunda saldría por el 500 genérico de `guard.ts`, que
  // no dice qué corregir.
  const usuario = await crear().catch((e: unknown) => {
    if (e && typeof e === 'object' && 'code' in e && e.code === 'P2002') return null
    throw e
  })
  if (!usuario) {
    return Response.json({ error: 'Ya existe una cuenta con ese correo o ese DNI' }, { status: 409 })
  }

  return Response.json({ ok: true, id: usuario.id })
}
