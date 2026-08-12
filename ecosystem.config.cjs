/**
 * PM2: el proceso de ConectaIA en el servidor.
 *
 *   pm2 start ecosystem.config.cjs
 *   pm2 save && pm2 startup     # para que reviva tras un reinicio
 *
 * `.cjs` y no `.js` a propósito: PM2 carga este archivo con `require()`, y el
 * `package.json` del proyecto no declara `"type": "commonjs"`. Con extensión
 * `.js` Node lo interpretaría según el paquete y PM2 fallaría al leerlo.
 */
module.exports = {
  apps: [
    {
      name: 'conectaia',
      // `npm start` ya lleva el puerto (`next start -p 3003`). Se llama al
      // binario de Next directamente para que PM2 vigile el proceso de verdad
      // y no a un `npm` que lo lanza y se queda en medio.
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3003',
      cwd: __dirname,

      // Una sola instancia: SQLite es un archivo y varios procesos escribiendo
      // a la vez sobre él se pisan. Si algún día hace falta escalar, primero
      // hay que cambiar de base de datos.
      instances: 1,
      exec_mode: 'fork',

      env: {
        NODE_ENV: 'production',
        // El resto (DATABASE_URL, AUTH_SECRET) sale del archivo .env del
        // servidor. NO se ponen aquí: este archivo sí está en el repositorio.
      },

      // Reinicio automático si el proceso muere, con freno para no entrar en
      // bucle si el fallo es de arranque.
      autorestart: true,
      max_restarts: 10,
      min_uptime: '20s',
      restart_delay: 4000,

      // Si la memoria se dispara, reiniciar antes de que el sistema lo mate.
      max_memory_restart: '512M',

      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      merge_logs: true,
      time: true,
    },
  ],
}
