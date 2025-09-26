// Force Edge runtime and avoid any Node deps
export const config = { runtime: 'edge' };

export default function handler(): Response {
  return new Response(JSON.stringify({ ok: true, now: Date.now() }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
