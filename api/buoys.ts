export const config = { runtime: "edge" };

const UA = "sail.isjuliatoast.com (demo)";

// --- duplicate the same parser helpers to keep this file standalone ---
const num = (s?: string) => {
  if (!s || s === "MM" || s === "NaN") return null;
  const v = Number(s);
  return Number.isFinite(v) ? v : null;
};
function parseRealtime2(txt: string) {
  const rows = txt
    .trim()
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

  if (rows.length < 2) return null;
  const header = rows[0].split(/\s+/);
  let dataIdx = 1;
  if (/[A-Za-z]/.test(rows[1])) dataIdx = 2;
  const data = rows[dataIdx]?.split(/\s+/);
  if (!data || data.length < header.length) return null;

  const row: Record<string, string> = {};
  header.forEach((h, i) => (row[h] = data[i]));
  const when = `${row.YY}-${row.MM}-${row.DD}T${row.hh}:${row.mm}:00Z`;

  const ms2kt = (m?: string) => {
    const v = num(m);
    return v == null ? null : v * 1.94384;
  };
  const m2ft = (m?: string) => {
    const v = num(m);
    return v == null ? null : v * 3.28084;
  };
  const c2f = (c?: string) => {
    const v = num(c);
    return v == null ? null : (v * 9) / 5 + 32;
  };

  return {
    time: when,
    windDirDeg: num(row.WDIR),
    windKts: ms2kt(row.WSPD),
    gustKts: ms2kt(row.GST),
    waveHeightFt: m2ft(row.WVHT),
    domPeriodS: num(row.DPD),
    meanWaveDirDeg: num(row.MWD),
    airTempF: c2f(row.ATMP),
    waterTempF: c2f(row.WTMP),
    pressureHpa: num(row.PRES),
  };
}
function json(body: any, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...extra },
  });
}
// ----------------------------------------------------------------------

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const ids = (url.searchParams.get("ids") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!ids.length) return json({ error: "ids=46232,46086 required" }, 400);

  const results = await Promise.all(
    ids.map(async (id) => {
      try {
        const r = await fetch(
          `https://www.ndbc.noaa.gov/data/realtime2/${encodeURIComponent(id)}.txt`,
          { headers: { "User-Agent": UA } }
        );
        if (!r.ok) return { id, ok: false, status: r.status };
        const text = await r.text();
        return { id, ok: true, obs: parseRealtime2(text) };
      } catch (e: any) {
        return { id, ok: false, error: e?.message || "fetch error" };
      }
    })
  );

  return json(
    { ok: true, results },
    200,
    { "cache-control": "s-maxage=300, stale-while-revalidate=900" }
  );
}
