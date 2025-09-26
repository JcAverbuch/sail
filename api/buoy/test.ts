export const config = { runtime: "edge" };

export default function handler(): Response {
  return new Response(JSON.stringify({ ok: true, route: "/api/buoy/test" }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
