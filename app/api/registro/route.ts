import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { getConfig, esSi, aNumero } from '@/lib/config'
import { mover } from '@/lib/creditos'
import { modoEfectivo } from '@/lib/modos'
import { normalizarDni, dniValido, ERROR_DNI } from '@/lib/dni'
import { normalizarRuc, rucValido, ERROR_RUC } from '@/lib/ruc'

export async function POST(req: Request) {
  const cfg = await getConfig()
  if (!esSi(cfg.registro_abierto)) {
    return Response.json({ error: 'El registro está cerrado por ahora' }, { status: 403 })
  }

  const b = await req.json().catch(() => ({}))

  // "natural" | "empresa". Decide qué bloque de identidad se exige más abajo;
  // cualquier otro valor recibido se trata como "natural", que es el caso de
  // siempre.
  const tipoCuenta = b.tipoCuenta === 'empresa' ? 'empresa' : 'natural'

  const nombres = String(b.nombres ?? '').trim()
  const apellidos = String(b.apellidos ?? '').trim()
  const dni = normalizarDni(b.dni)
  const razonSocial = String(b.razonSocial ?? '').trim()
  const ruc = normalizarRuc(b.ruc)
  const representanteLegal = String(b.representanteLegal ?? '').trim()
  const direccion = String(b.direccion ?? '').trim()
  const email = String(b.email ?? '').trim().toLowerCase()
  const password = String(b.password ?? '')
  const celular = String(b.celular ?? '').trim()
  const ciudad = String(b.ciudad ?? '').trim()
  const modo = modoEfectivo(b.modo)

  // Menor de edad / persona con discapacidad solo tienen sentido para una
  // persona natural: una empresa no puede serlo, así que se ignora cualquier
  // valor que llegue marcado si el alta es de tipo "empresa".
  const esMenorEdad = tipoCuenta === 'natural' && (b.esMenorEdad === true || b.esMenorEdad === 'true')
  const esPersonaConDiscapacidad =
    tipoCuenta === 'natural' &&
    (b.esPersonaConDiscapacidad === true || b.esPersonaConDiscapacidad === 'true')
  // Los dos casos piden exactamente los mismos datos del tutor: no hace falta
  // duplicar la validación por caso, solo saber si aplica alguno de los dos.
  const necesitaTutor = esMenorEdad || esPersonaConDiscapacidad

  const tutorNombres = String(b.tutorNombres ?? '').trim()
  const tutorApellidos = String(b.tutorApellidos ?? '').trim()
  const tutorDni = normalizarDni(b.tutorDni)
  const tutorCelular = String(b.tutorCelular ?? '').trim()
  const tutorEmail = String(b.tutorEmail ?? '').trim().toLowerCase()
  const tutorParentesco = String(b.tutorParentesco ?? '').trim()

  if (tipoCuenta === 'natural') {
    if (!nombres || !apellidos) {
      return Response.json({ error: 'Escribe tus nombres y apellidos' }, { status: 400 })
    }
    if (!dniValido(dni)) {
      return Response.json({ error: ERROR_DNI }, { status: 400 })
    }
  } else {
    if (!razonSocial) {
      return Response.json({ error: 'Escribe la razón social' }, { status: 400 })
    }
    if (!rucValido(ruc)) {
      return Response.json({ error: ERROR_RUC }, { status: 400 })
    }
    if (!representanteLegal) {
      return Response.json({ error: 'Escribe el nombre del representante legal' }, { status: 400 })
    }
    if (!direccion) {
      return Response.json({ error: 'Escribe la dirección de la empresa' }, { status: 400 })
    }
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

  // Menor de edad o persona con discapacidad: se piden los mismos datos
  // mínimos del tutor en el propio alta, para poder verificarlo si hace
  // falta. El detalle adicional (documentos, etc.) se completa después desde
  // el Perfil, no aquí.
  if (necesitaTutor) {
    if (!tutorNombres || !tutorApellidos) {
      return Response.json({ error: 'Escribe los nombres y apellidos del tutor' }, { status: 400 })
    }
    if (!dniValido(tutorDni)) {
      return Response.json({ error: 'El DNI del tutor debe tener 8 dígitos' }, { status: 400 })
    }
    if (!/^\d{9}$/.test(tutorCelular.replace(/\s/g, ''))) {
      return Response.json({ error: 'El celular del tutor debe tener 9 dígitos' }, { status: 400 })
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(tutorEmail)) {
      return Response.json({ error: 'Escribe un correo válido para el tutor' }, { status: 400 })
    }
    if (!tutorParentesco) {
      return Response.json({ error: 'Escribe el parentesco del tutor' }, { status: 400 })
    }
  }

  // El correo se mira junto con el DNI (natural) o el RUC (empresa): son las
  // formas de repetir cuenta, y hay que distinguirlas para poder decirle al
  // usuario cuál de las dos le está estorbando.
  const existe = await prisma.usuario.findFirst({
    where: {
      OR: tipoCuenta === 'natural' ? [{ email }, { dni }] : [{ email }, { ruc }],
    },
    select: { email: true },
  })
  if (existe) {
    if (existe.email === email) {
      return Response.json({ error: 'Ya existe una cuenta con ese correo' }, { status: 409 })
    }
    return Response.json(
      { error: tipoCuenta === 'natural' ? 'Ya existe una cuenta con ese DNI' : 'Ya existe una cuenta con ese RUC' },
      { status: 409 },
    )
  }

  const regalo = aNumero(cfg.creditos_bienvenida, 0)

  const crear = () =>
    prisma.$transaction(async (tx) => {
      const u = await tx.usuario.create({
        data: {
          rol: 'usuario',
          email,
          password: await bcrypt.hash(password, 10),
          tipoCuenta,
          // Para una empresa, `nombres` guarda la razón social y `apellidos`
          // queda vacío: es el nombre que se enseña en toda la app (ver la
          // nota en el schema), y así no hace falta tocar los más de veinte
          // sitios que arman `${nombres} ${apellidos}`.
          nombres: tipoCuenta === 'empresa' ? razonSocial : nombres,
          apellidos: tipoCuenta === 'empresa' ? '' : apellidos,
          dni: tipoCuenta === 'natural' ? dni : null,
          ...(tipoCuenta === 'empresa' && {
            razonSocial,
            ruc,
            representanteLegal,
            direccion,
          }),
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
          esMenorEdad,
          esPersonaConDiscapacidad,
          ...(necesitaTutor && {
            tutorNombres,
            tutorApellidos,
            tutorDni,
            tutorCelular: tutorCelular.replace(/\s/g, ''),
            tutorEmail,
            tutorParentesco,
          }),
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
  // correo, DNI o RUC la pasan las dos, y solo el índice único las separa.
  // Sin este `catch` la segunda saldría por el 500 genérico de `guard.ts`, que
  // no dice qué corregir.
  const usuario = await crear().catch((e: unknown) => {
    if (e && typeof e === 'object' && 'code' in e && e.code === 'P2002') return null
    throw e
  })
  if (!usuario) {
    return Response.json(
      {
        error:
          tipoCuenta === 'natural'
            ? 'Ya existe una cuenta con ese correo o ese DNI'
            : 'Ya existe una cuenta con ese correo o ese RUC',
      },
      { status: 409 },
    )
  }

  return Response.json({ ok: true, id: usuario.id })
}
