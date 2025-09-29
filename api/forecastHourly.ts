// api/forecastHourly.ts
export const config = { runtime: "edge" };

const UA = "sail.isjuliatoast.com (demo)";

// Parse "15 mph" or "10 to 20 mph" → mph (pick max if range)
function mphFromString(s?: string | null): number | null {
  if (!s) return null;
  const m = s.match(/(\d+)(?:\s*to\s*(\d+))?\s*mph/i);
  if (!m) return null;
  const a = Number(m[1]);
  const b = m[2] ? Number(m[2]) : null;
  if (!Number.isFinite(a)) return null;
  return b && Number.isFinite(b) ? Math.max(a, b) : a;
}
const MPH_TO_KT = 0.868976;

// Cardinal text → degrees
function dirTextToDeg(s?: string | null): number | null {
  if (!s) return null;
  const d = s.toUpperCase().trim();
  const map: Record<string, number> = {
    N: 0, NNE: 22.5, NE: 45, ENE: 67.5, E: 90, ESE: 112.5,
    SE: 135, SSE: 157.5, S: 180, SSW: 202.5, SW: 225, WSW: 247.5,
    W: 270, WNW: 292.5, NW: 315, NNW: 337.5,
  };
  return d in map ? map[d] : null;
}

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
  const hours = Number(url.searchParams.get("hours") ?? 12); // 1–48 supported

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return json({ error: "lat, lon required" }, 400);
  }

  try {
    // 1) points → forecastHourly URL
    const p = await fetch(`https://api.weather.gov/points/${lat},${lon}`, {
      headers: { "User-Agent": UA, "Accept": "application/geo+json" },
    });
    if (!p.ok) return json({ error: `points ${p.status}` }, 502);
    const pj = await p.json();
    const hourlyUrl = pj?.properties?.forecastHourly;
    if (!hourlyUrl) return json({ error: "no forecastHourly URL" }, 502);

    // 2) hourly forecast
    const h = await fetch(hourlyUrl, {
      headers: { "User-Agent": UA, "Accept": "application/geo+json" },
    });
    if (!h.ok) return json({ error: `hourly ${h.status}` }, 502);
    const hj = await h.json();

    const periods: any[] = hj?.properties?.periods ?? [];
    const out = periods.slice(0, Math.max(1, Math.min(hours, 48))).map((p: any) => {
      const mph = mphFromString(p?.windSpeed);
      const gustMph = mphFromString(p?.windGust);
      const kt = mph != null ? +(mph * MPH_TO_KT).toFixed(1) : null;
      const gustKt = gustMph != null ? +(gustMph * MPH_TO_KT).toFixed(1) : null;
      const dirTxt = (p?.windDirection as string | undefined) || null;
      const dirDeg = dirTextToDeg(dirTxt);
      return {
        time: p?.startTime || null,
        windKts: kt,
        gustKts: gustKt,
        dirText: dirTxt,
        dirDeg: dirDeg != null ? +dirDeg.toFixed(1) : null,
        shortForecast: p?.shortForecast ?? null,
      };
    });

    return json(
      { lat, lon, hours: out },
      200,
      { "cache-control": "s-maxage=900, stale-while-revalidate=1800" }
    );
  } catch (e: any) {
    return json({ error: e?.message || "nws error" }, 500);
  }
}
