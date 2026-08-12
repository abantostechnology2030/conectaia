import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { getConfig, esSi, aNumero } from '@/lib/config'
import { mover } from '@/lib/creditos'
import { modoEfectivo } from '@/lib/modos'

export async function POST(req: Request) {
  const cfg = await getConfig()
  if (!esSi(cfg.registro_abierto)) {
    return Response.json({ error: 'El registro está cerrado por ahora' }, { status: 403 })
  }

  const b = await req.json().catch(() => ({}))

  const nombres = String(b.nombres ?? '').trim()
  const apellidos = String(b.apellidos ?? '').trim()
  const email = String(b.email ?? '').trim().toLowerCase()
  const password = String(b.password ?? '')
  const celular = String(b.celular ?? '').trim()
  const ciudad = String(b.ciudad ?? '').trim()
  const modo = modoEfectivo(b.modo)

  if (!nombres || !apellidos) {
    return Response.json({ error: 'Escribe tus nombres y apellidos' }, { status: 400 })
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
  if (celular && !/^\d{9}$/.test(celular.replace(/\s/g, ''))) {
    return Response.json({ error: 'El celular debe tener 9 dígitos' }, { status: 400 })
  }

  const existe = await prisma.usuario.findUnique({ where: { email }, select: { id: true } })
  if (existe) {
    return Response.json({ error: 'Ya existe una cuenta con ese correo' }, { status: 409 })
  }

  const regalo = aNumero(cfg.creditos_bienvenida, 0)

  const usuario = await prisma.$transaction(async (tx) => {
    const u = await tx.usuario.create({
      data: {
        rol: 'usuario',
        email,
        password: await bcrypt.hash(password, 10),
        nombres,
        apellidos,
        celular: celular ? celular.replace(/\s/g, '') : null,
        // El WhatsApp arranca igual que el celular; se puede cambiar en el perfil.
        whatsapp: celular ? celular.replace(/\s/g, '') : null,
        ciudad,
        // Nace CON su lado ya elegido: la pregunta se hace una sola vez, en el
        // propio formulario de registro, y llega marcada desde la puerta de la
        // portada por la que entró. Así al iniciar sesión no hay nada que
        // preguntar y se entra directo al panel que le toca.
        //
        // Quien llegue al registro por su cuenta y no marque nada se queda con
        // `ambos`: ver la aplicación entera se corrige desde el perfil, nacer
        // sin lado dejaría media cuenta inservible.
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

  return Response.json({ ok: true, id: usuario.id })
}
