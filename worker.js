/**
 * HeadshotAI — Cloudflare Worker CORS Proxy for Replicate API
 * Deploy to Cloudflare Workers free tier (workers.cloudflare.com)
 */

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age':       '86400',
};

export default {
  async fetch(request) {
    // Always handle preflight first — must return CORS headers immediately
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    const url  = new URL(request.url);
    const path = url.pathname + url.search;

    if (!path.startsWith('/v1/predictions')) {
      return new Response(JSON.stringify({ error: 'Only /v1/predictions is proxied.' }), {
        status: 404,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    try {
      // Build clean forwarded headers (drop Host to avoid conflicts)
      const fwdHeaders = new Headers();
      for (const [k, v] of request.headers.entries()) {
        if (k.toLowerCase() !== 'host') fwdHeaders.set(k, v);
      }

      const proxyResp = await fetch('https://api.replicate.com' + path, {
        method:  request.method,
        headers: fwdHeaders,
        body:    request.method === 'GET' ? undefined : request.body,
      });

      // Copy Replicate response headers then add CORS on top
      const outHeaders = new Headers();
      for (const [k, v] of proxyResp.headers.entries()) {
        outHeaders.set(k, v);
      }
      for (const [k, v] of Object.entries(CORS)) {
        outHeaders.set(k, v);
      }

      return new Response(proxyResp.body, {
        status:  proxyResp.status,
        headers: outHeaders,
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status:  502,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }
  },
};
