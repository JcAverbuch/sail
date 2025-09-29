export const config = { runtime: "edge" };

const UA = "sail.isjuliatoast.com (demo)";

/** ---------- parser ---------- **/
type Obs = {
  time?: string;
  windDirDeg?: number | null;
  windKts?: number | null;
  gustKts?: number | null;
  waveHeightFt?: number | null;
  domPeriodS?: number | null;
  meanWaveDirDeg?: number | null;
  waterTempF?: number | null;
  airTempF?: number | null;
  pressureHpa?: number | null;
};

const num = (s?: string) => {
  if (!s || s === "MM" || s === "NaN") return null;
  const v = Number(s);
  return Number.isFinite(v) ? v : null;
};

function parseRealtime2(txt: string): Obs | null {
  const lines = txt.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (!lines.length) return null;

  // Find the header (may start with '#')
  let headerLine: string | undefined;
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const L = lines[i].replace(/^#\s*/, "");
    if (/^YY\s+MM\s+DD\s+hh\s+mm\b/.test(L)) {
      headerLine = L;
      headerIdx = i;
      break;
    }
  }
  if (!headerLine) return null;

  // First non-# line after header is the data (skip units lines)
  let dataLine: string | undefined;
  for (let j = headerIdx + 1; j < lines.length; j++) {
    const raw = lines[j];
    if (raw.startsWith("#")) continue;
    dataLine = raw;
    break;
    }
  if (!dataLine) return null;

  const header = headerLine.split(/\s+/);
  const data = dataLine.split(/\s+/);
  if (data.length < header.length) return null;

  const row: Record<string, string> = {};
  for (let i = 0; i < header.length; i++) row[header[i]] = data[i];

  const ms2kt = (m?: string) => { const v = num(m); return v == null ? null : v * 1.94384; };
  const m2ft  = (m?: string) => { const v = num(m); return v == null ? null : v * 3.28084; };
  const c2f   = (c?: string) => { const v = num(c); return v == null ? null : (v * 9) / 5 + 32; };

  const time = row.YY && row.MM && row.DD && row.hh && row.mm
    ? `${row.YY}-${row.MM}-${row.DD}T${row.hh}:${row.mm}:00Z`
    : undefined;

  return {
    time,
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
/** -------------------------------- **/

function json(body: any, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...extra },
  });
}

export default async function handler(req: Request): Promise<Response> {
  const id = req.url.split("/").pop() || "";
  if (!id) return json({ error: "missing station id" }, 400);

  try {
    const r = await fetch(`https://www.ndbc.noaa.gov/data/realtime2/${encodeURIComponent(id)}.txt`, {
      headers: { "User-Agent": UA },
    });
    if (!r.ok) return json({ id, ok: false, status: r.status }, 502);

    const text = await r.text();
    const obs = parseRealtime2(text);
    return json(
      { id, ok: true, obs },
      200,
      { "cache-control": "s-maxage=300, stale-while-revalidate=900" }
    );
  } catch (e: any) {
    return json({ id, ok: false, error: e?.message || "fetch error" }, 500);
  }
}
