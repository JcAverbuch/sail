import type { VercelRequest, VercelResponse } from '@vercel/node'

const UA = 'sail.isjuliatoast.com (demo)'

// ---- copy the same helpers from [id].ts (keep in sync) ----
const n = (s?: string) => {
  if (!s) return null
  if (s === 'MM' || s === 'NaN') return null
  const v = Number(s)
  return Number.isFinite(v) ? v : null
}
function parseRealtime2(txt: string) {
  const lines = txt.trim().split('\n').filter(l => !l.startsWith('#'))
  if (lines.length < 2) return null
  const header = lines[0].trim().split(/\s+/)
  const data = lines[1].trim().split(/\s+/)
  const row: Record<string, string> = {}
  header.forEach((h, i) => (row[h] = data[i]))
  const when = `${row.YY}-${row.MM}-${row.DD}T${row.hh}:${row.mm}:00Z`
  const ms2kt = (m?: string) => { const v = n(m); return v == null ? null : v * 1.94384 }
  const m2ft  = (m?: string) => { const v = n(m); return v == null ? null : v * 3.28084 }
  const c2f   = (c?: string) => { const v = n(c); return v == null ? null : (v * 9) / 5 + 32 }

  return {
    time: when,
    windDirDeg: n(row.WDIR),
    windKts: ms2kt(row.WSPD),
    gustKts: ms2kt(row.GST),
    waveHeightFt: m2ft(row.WVHT),
    domPeriodS: n(row.DPD),
    meanWaveDirDeg: n(row.MWD),
    airTempF: c2f(row.ATMP),
    waterTempF: c2f(row.WTMP),
    pressureHpa: n(row.PRES),
  }
}
// -----------------------------------------------------------

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const ids = String(req.query.ids || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  if (!ids.length) return res.status(400).json({ error: 'ids=46232,46086 required' })

  const results = await Promise.all(ids.map(async (id) => {
    try {
      const r = await fetch(`https://www.ndbc.noaa.gov/data/realtime2/${encodeURIComponent(id)}.txt`, {
        headers: { 'User-Agent': UA }
      })
      if (!r.ok) throw new Error(String(r.status))
      const text = await r.text()
      return { id, ok: true, obs: parseRealtime2(text) }
    } catch (e: any) {
      return { id, ok: false, error: e?.message || 'fetch error' }
    }
  }))

  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900')
  res.status(200).json({ ok: true, results })
}
