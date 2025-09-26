// api/buoy/[id].ts
import type { VercelRequest, VercelResponse } from '@vercel/node'

const UA = 'sail.isjuliatoast.com (demo)'

// robust numeric parse: returns null on "MM", "", undefined, or NaN
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

  const ms2kt = (m?: string) => {
    const v = n(m); return v == null ? null : v * 1.94384
  }
  const m2ft  = (m?: string) => {
    const v = n(m); return v == null ? null : v * 3.28084
  }
  const c2f   = (c?: string) => {
    const v = n(c); return v == null ? null : (v * 9) / 5 + 32
  }

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = (req.query.id as string)?.toLowerCase()
  if (!id) return res.status(400).json({ error: 'missing station id' })

  try {
    const url = `https://www.ndbc.noaa.gov/data/realtime2/${encodeURIComponent(id)}.txt`
    const r = await fetch(url, { headers: { 'User-Agent': 'sail.isjuliatoast.com (demo app)' } })
    if (!r.ok) throw new Error(`NDBC ${r.status}`)
    const text = await r.text()
    const obs = parseRealtime2(text)

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900') // 5 min
    res.status(200).json({ id, obs })
  } catch (e: any) {
    res.status(502).json({ id, error: e?.message || 'fetch error' })
  }
}
