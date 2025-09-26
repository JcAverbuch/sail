export const config = { runtime: "edge" };

const UA = "sail.isjuliatoast.com (demo)";

function json(body: any, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...extra },
  });
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const lat = Number(url.searchParams.get("lat"));
  const lon = Number(url.searchParams.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon))
    return json({ error: "lat, lon required" }, 400);

  try {
    const p = await fetch(`https://api.weather.gov/points/${lat},${lon}`, {
      headers: { "User-Agent": UA, Accept: "application/geo+json" },
    });
    if (!p.ok) return json({ error: `points ${p.status}` }, 502);
    const pj = await p.json();

    const forecastUrl =
      pj?.properties?.forecast || pj?.properties?.forecastZone;
    if (!forecastUrl) return json({ error: "no forecast URL" }, 502);

    const f = await fetch(forecastUrl, {
      headers: { "User-Agent": UA, Accept: "application/geo+json" },
    });
    if (!f.ok) return json({ error: `forecast ${f.status}` }, 502);
    const fj = await f.json();

    return json(
      { lat, lon, forecast: fj },
      200,
      { "cache-control": "s-maxage=900, stale-while-revalidate=1800" }
    );
  } catch (e: any) {
    return json({ error: e?.message || "nws error" }, 500);
  }
}
