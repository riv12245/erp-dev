import dns from 'node:dns';

// Local resolver workaround only. Production uses its platform DNS.
if ((process.env.NODE_ENV ?? 'development') === 'development' && process.env.LOCAL_CLOUDFLARE_DNS !== 'false') {
  dns.setServers(['1.1.1.1']);
  console.log('[DNS] Cloudflare configurado');
}
