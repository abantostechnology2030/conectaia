import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next 16 bloquea los recursos de desarrollo (/_next/*) si se entra por una IP
  // distinta de localhost: la página carga pero sin JavaScript, el formulario de
  // login se envía como GET y nunca se llama a signIn(). Con esto se puede probar
  // la app desde el celular o desde otra PC de la red. Solo afecta a `next dev`.
  allowedDevOrigins: ['192.168.100.13'],
};

export default nextConfig;
