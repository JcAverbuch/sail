// src/components/LegDetail.tsx
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, Clock, Wind, Waves, MapPin, Navigation } from "lucide-react"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { ForecastStrip } from "./ForecastStrip"
import { Badge } from "./ui/badge"

/** ---------- types & helpers ---------- **/

type Obs = {
  time?: string
  windDirDeg?: number | null
  windKts?: number | null
  gustKts?: number | null
  waveHeightFt?: number | null
  domPeriodS?: number | null
  meanWaveDirDeg?: number | null
  waterTempF?: number | null
  airTempF?: number | null
}

const round = (n: number | null | undefined, d = 0) =>
  n == null || !Number.isFinite(n) ? "—" : Number(n.toFixed(d)).toString()

const degToDir = (deg?: number | null) => {
  if (deg == null || !Number.isFinite(deg)) return "—"
  const dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"]
  return dirs[Math.round(((deg % 360) / 22.5)) % 16]
}

const LIMITS = { comfortWindKt: 22, comfortGustKt: 30, comfortWaveFt: 6 }

function statusFromObs(o?: Obs | null) {
  if (!o) return "gray"
  if ((o.gustKts ?? 0) > LIMITS.comfortGustKt || (o.waveHeightFt ?? 0) > LIMITS.comfortWaveFt) return "red"
  if ((o.windKts ?? 0) > LIMITS.comfortWindKt) return "yellow"
  return "green"
}

function dotClass(status: "green" | "yellow" | "red" | "gray") {
  switch (status) {
    case "green": return "bg-green-500"
    case "yellow": return "bg-yellow-500"
    case "red": return "bg-red-500"
    default: return "bg-gray-300"
  }
}

/** ---------- per-leg data ---------- **/

const ALL_LEGS = {
  "1": {
    from: { name: "San Diego", lat: 32.7157, lon: -117.1611 },
    to: { name: "Oceanside", lat: 33.1958, lon: -117.3831 },
    midpoint: { name: "Del Mar", lat: 32.9595, lon: -117.2661 },
    distance: "35 nm est",
    duration: "6-8h",
    buoys: [
      { id: "46232", name: "Point Loma South" },
      { id: "46086", name: "San Clemente Basin" },
    ],
  },
  "2": {
    from: { name: "Oceanside", lat: 33.1958, lon: -117.3831 },
    to: { name: "Two Harbors", lat: 33.4447, lon: -118.4895 },
    midpoint: { name: "Mid-Channel", lat: 33.3203, lon: -117.9363 },
    distance: "42 nm est",
    duration: "8-10h",
    buoys: [
      { id: "46086", name: "San Clemente Basin" },
      { id: "46025", name: "Santa Monica Bay" },
      { id: "46221", name: "Santa Barbara West" },
    ],
  },
  "3": {
    from: { name: "Two Harbors", lat: 33.4447, lon: -118.4895 },
    to: { name: "Marina del Rey", lat: 33.9806, lon: -118.4494 },
    midpoint: { name: "Redondo Canyon", lat: 33.7127, lon: -118.4695 },
    distance: "28 nm est",
    duration: "5-7h",
    buoys: [
      { id: "46025", name: "Santa Monica Bay" },
      { id: "46222", name: "San Pedro" },
    ],
  },
} as const

interface LegDetailProps {
  onBack: () => void
  legId: string | null
}

/** ---------- component ---------- **/

export function LegDetail({ onBack, legId }: LegDetailProps) {
  const currentLegId = legId || "2"
  const leg = ALL_LEGS[currentLegId as keyof typeof ALL_LEGS] || ALL_LEGS["2"]

  // Three forecast locations (start / midpoint / end)
  const locations = useMemo(() => ([
    { key: "start", label: `${leg.from.name} (Start)`, lat: leg.from.lat, lon: leg.from.lon },
    { key: "mid",   label: `${leg.midpoint.name}`,     lat: leg.midpoint.lat, lon: leg.midpoint.lon },
    { key: "end",   label: `${leg.to.name} (End)`,     lat: leg.to.lat, lon: leg.to.lon },
  ]), [currentLegId])

  /** ---------- state: live data ---------- **/
  const [buoyMap, setBuoyMap] = useState<Record<string, Obs | null>>({})
  const [buoysLoading, setBuoysLoading] = useState(false)
  const [forecastLine, setForecastLine] = useState<string | null>(null)

  const DEBUG_LOG = false

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setBuoysLoading(true)
      const ids = leg.buoys.map(b => String(b.id))

      try {
        // Batch
        const r = await fetch(`/api/buoys?ids=${ids.join(",")}`)
        const j = await r.json()
        if (DEBUG_LOG) console.log("BUOYS batch:", j)

        const next: Record<string, Obs | null> = {}
        const arr = Array.isArray(j?.results) ? j.results : []
        for (const item of arr) {
          const id = String(item?.id ?? item?.station ?? "")
          next[id] = item?.obs ?? null
        }

        // Fallback singles for any null/missing
        const missing = ids.filter(id => !(id in next) || next[id] == null)
        if (missing.length && DEBUG_LOG) console.log("fallback singles:", missing)
        if (missing.length) {
          const singles = await Promise.all(missing.map(async (id) => {
            try {
              const r1 = await fetch(`/api/buoy?id=${encodeURIComponent(id)}`)
              const j1 = await r1.json()
              return [id, (j1?.obs as Obs | null) ?? null] as const
            } catch { return [id, null] as const }
          }))
          for (const [id, obs] of singles) next[id] = obs
        }

        if (!cancelled) setBuoyMap(next)
      } catch (e) {
        if (DEBUG_LOG) console.error(e)
        if (!cancelled) setBuoyMap({})
      } finally {
        if (!cancelled) setBuoysLoading(false)
      }

      // NWS paragraph summary (via your /api/forecast)
      try {
        const lat = (leg.from.lat + leg.to.lat) / 2
        const lon = (leg.from.lon + leg.to.lon) / 2
        const fr = await fetch(`/api/forecast?lat=${lat}&lon=${lon}`)
        const fj = await fr.json()
        if (DEBUG_LOG) console.log("FORECAST text:", fj)
        const p = fj?.forecast?.properties?.periods?.[0]
        if (!cancelled) setForecastLine(p?.detailedForecast || p?.shortForecast || null)
      } catch {
        if (!cancelled) setForecastLine(null)
      }
    })()
    return () => { cancelled = true }
  }, [currentLegId])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="p-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl">
            {leg.from.name} → {leg.to.name}
          </h1>
          <p className="text-sm text-gray-600">
            {leg.distance} • {leg.duration} duration
          </p>
        </div>
      </div>

      {/* Route Forecasts */}
      <div className="space-y-4">
        <h2 className="text-lg">Route Forecasts</h2>

        {forecastLine && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-gray-600" />
                NWS summary (next period)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700">{forecastLine}</p>
            </CardContent>
          </Card>
        )}

        {locations.map((loc) => (
          <Card key={loc.key}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    {loc.label}
                  </CardTitle>
                  <p className="mt-1 text-sm text-gray-600">
                    {loc.lat.toFixed(3)}°N, {Math.abs(loc.lon).toFixed(3)}°W
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* NEW: ForecastStrip self-fetches from /api/forecastHourly */}
              <ForecastStrip lat={loc.lat} lon={loc.lon} hours={12} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Buoy Conditions (LIVE) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg">Buoy Conditions</h2>
          {buoysLoading && <span className="text-xs text-gray-500">loading…</span>}
        </div>

        {leg.buoys.map((b) => {
          const obs = buoyMap[String(b.id)]
          const wind = obs?.windKts != null ? `${round(obs.windKts)}kt` : "—"
          const gust = obs?.gustKts != null ? `G${round(obs.gustKts)}` : ""
          const wdir = obs?.windDirDeg != null ? `${round(obs.windDirDeg)}° ${degToDir(obs.windDirDeg)}` : "—"
          const waves = obs?.waveHeightFt != null ? `${round(obs.waveHeightFt, 1)}ft` : "—"
          const period = obs?.domPeriodS != null ? `${obs.domPeriodS}s period` : "—"
          const wtmp = obs?.waterTempF != null ? `${round(obs.waterTempF)}°F` : "—"
          const status = statusFromObs(obs)

          return (
            <Card key={b.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <span className={`inline-block h-2.5 w-2.5 rounded-full ${dotClass(status)}`} />
                      <Navigation className="h-4 w-4 text-blue-600" />
                      {b.name}
                      <Badge variant="secondary" className="text-xs">{b.id}</Badge>
                    </CardTitle>
                    <p className="text-xs text-gray-500">
                      Last obs: {obs?.time ? new Date(obs.time).toLocaleString() : "—"}
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="mb-1 flex items-center justify-center">
                      <Wind className="h-4 w-4 text-gray-600" />
                    </div>
                    <div className="font-medium">{wind}</div>
                    <div className="text-xs text-gray-600">{gust} {wdir}</div>
                  </div>

                  <div>
                    <div className="mb-1 flex items-center justify-center">
                      <Waves className="h-4 w-4 text-gray-600" />
                    </div>
                    <div className="font-medium">{waves}</div>
                    <div className="text-xs text-gray-600">{period}</div>
                  </div>

                  <div>
                    <div className="mb-1 flex items-center justify-center">
                      <div className="h-4 w-4 rounded-full bg-blue-400" />
                    </div>
                    <div className="font-medium">{wtmp}</div>
                    <div className="text-xs text-gray-600">Water temp</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button className="w-full bg-blue-600 hover:bg-blue-700">Check Window</Button>
        <Button variant="outline" className="w-full">See Alternate Harbor</Button>
      </div>

      {/* Sources */}
      <p className="mt-6 text-center text-xs text-gray-500">
        Sources: NWS Marine Forecasts, NDBC Buoy Network
      </p>
    </div>
  )
}
