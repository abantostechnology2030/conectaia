// El caso del PDR §45 exactamente como lo describe: Carlos con ⭐4.8.
// Se ejecuta con: npx tsx scripts/probar-match-pdr.ts
import { puntuar } from '../lib/matching'

const necesidad = {
  categoriaId: 1,
  subcategoriaId: 1,
  ciudad: 'Cajamarca',
  claves:
    'pintar habitacion aproximadamente incluye techo mismo color requiere lijado resanado algunas partes pintura interiores',
  precioOfrecido: 100,
}

const servicio = {
  categoriaId: 1,
  subcategoriaId: 1,
  ciudad: 'Cajamarca',
  claves: 'pintura interiores habitaciones salas oficinas lijado resanado acabados finos',
  precioDesde: 80,
  disponibilidad: 'Lunes a sábado',
  reputacion: 4.8,
}

const d = puntuar(necesidad, servicio)
console.log(`PDR §45 — Carlos con 4.8 estrellas: ${d.puntaje}%`)
for (const f of d.factores) {
  console.log(`  ${f.nombre.padEnd(14)} ${f.puntos.toFixed(1).padStart(5)} / ${String(f.maximo).padStart(2)}   ${f.nota}`)
}
