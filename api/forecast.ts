// api/forecast.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'

const UA = 'sail.isjuliatoast.com (demo app)'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const lat = Number(req.query.lat)
  const lon = Number(req.query.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.status(400).json({ error: 'lat, lon required' })
  }

  try {
    const p = await fetch(`https://api.weather.gov/points/${lat},${lon}`, {
      headers: { 'User-Agent': UA, 'Accept': 'application/geo+json' },
    })
    if (!p.ok) throw new Error(`points ${p.status}`)
    const pj = await p.json()

    const forecastUrl =
      pj?.properties?.forecast || pj?.properties?.forecastZone
    if (!forecastUrl) throw new Error('no forecast URL')

    const f = await fetch(forecastUrl, {
      headers: { 'User-Agent': UA, 'Accept': 'application/geo+json' },
    })
    if (!f.ok) throw new Error(`forecast ${f.status}`)
    const fj = await f.json()

    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800')
    res.status(200).json({ lat, lon, forecast: fj })
  } catch (e: any) {
    res.status(502).json({ error: e?.message || 'nws error' })
  }
}
