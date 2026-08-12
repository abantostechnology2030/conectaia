import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

// Aquí se preguntaba "¿qué quieres hacer en ConectaIA?" al entrar por primera
// vez. Ya no: la pregunta se hace UNA sola vez, al crear la cuenta, con la
// opción ya marcada desde la puerta de la portada por la que se entró. Quien
// inicia sesión va directo a su panel.
//
// La ruta sigue existiendo, y solo redirige, porque estuvo enlazada desde el
// panel y desde las guardas de ruta: un enlace guardado o un botón "atrás" del
// navegador tienen que llevar a algún sitio con sentido, no a un 404.
//
// Para cambiar de lado o tener los dos, el sitio es el panel (tarjeta "Pásate
// a…") o Mi perfil.
export default async function Bienvenida() {
  redirect('/panel')
}
