/**
 * HeadshotAI — Cloudflare Worker CORS Proxy
 *
 * Deploy this to Cloudflare Workers (free tier) to allow the static
 * GitHub Pages app to call the Replicate API from the browser.
 *
 * Steps:
 *  1. Go to https://workers.cloudflare.com → sign up free
 *  2. Create Worker → paste this entire file → Deploy
 *  3. Copy the Worker URL (e.g. https://headshot-proxy.yourname.workers.dev)
 *  4. Paste it into the app's Settings modal
 */

export default {
  async fetch(request) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return corsResponse(null, 204);
    }

    const url  = new URL(request.url);
    const path = url.pathname + url.search;

    // Only proxy Replicate prediction endpoints
    if (!path.startsWith('/v1/predictions')) {
      return corsResponse(JSON.stringify({ error: 'Only /v1/predictions is proxied.' }), 400, {
        'Content-Type': 'application/json',
      });
    }

    const target = 'https://api.replicate.com' + path;

    const proxyResp = await fetch(target, {
      method:  request.method,
      headers: request.headers,
      body:    request.method === 'GET' ? undefined : request.body,
    });

    const respHeaders = Object.fromEntries(proxyResp.headers);
    return corsResponse(proxyResp.body, proxyResp.status, respHeaders);
  },
};

function corsResponse(body, status, extraHeaders = {}) {
  return new Response(body, {
    status,
    headers: {
      ...extraHeaders,
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
