// src/components/LegDetail.tsx
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, Clock, Wind, Waves, MapPin, Navigation, AlertTriangle } from "lucide-react"
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

type HourPoint = {
  time: string | null
  windKts: number | null
  gustKts: number | null
  dirDeg: number | null
  shortForecast?: string | null
}

type Status = "green" | "yellow" | "red"

const roundStr = (n: number | null | undefined, d = 0) =>
  n == null || !Number.isFinite(n) ? "—" : Number(n.toFixed(d)).toString()

const roundNum = (n: number | null | undefined, d = 0) =>
  n == null || !Number.isFinite(n) ? null : Number(n.toFixed(d))

const degToDir = (deg?: number | null) => {
  if (deg == null || !Number.isFinite(deg)) return "—"
  const dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"]
  return dirs[Math.round(((deg % 360) / 22.5)) % 16]
}

const dotClass = (s: Status) =>
  s === "green" ? "bg-green-500" : s === "yellow" ? "bg-yellow-500" : "bg-red-500"

const worse = (s: Status, steps = 1): Status => {
  const order: Status[] = ["green", "yellow", "red"]
  const idx = Math.min(order.indexOf(s) + steps, order.length - 1)
  return order[idx]
}

function maxEffectiveWaveFt(buoyObs: { waveHeightFt?: number|null; domPeriodS?: number|null }[]) {
  let max = -Infinity
  for (const b of buoyObs) {
    if (b.waveHeightFt == null || !Number.isFinite(b.waveHeightFt)) continue
    const period = b.domPeriodS ?? null
    const shortPenalty = Number.isFinite(period) && (period as number) < 7 ? 1 : 0
    const effective = (b.waveHeightFt as number) + shortPenalty
    if (effective > max) max = effective
  }
  return max
}

/** ---------- per-leg data (7 legs) + comfort ---------- **/

const ALL_LEGS = {
  "1": {
    from: { name: "San Diego", lat: 32.7157, lon: -117.1611 },
    to:   { name: "Oceanside, CA", lat: 33.1958, lon: -117.3831 },
    midpoint: { name: "Del Mar", lat: (32.7157+33.1958)/2, lon: (-117.1611-117.3831)/2 },
    distance: "35 nm est",
    duration: "6-8h",
    comfort: { windKt: 15, gustKt: 22, waveFt: 5 },
    buoys: [{ id: "46232", name: "Point Loma South" }, { id: "46086", name: "San Clemente Basin" }],
  },
  "2": {
    from: { name: "Oceanside, CA", lat: 33.1958, lon: -117.3831 },
    to:   { name: "Two Harbors Marina", lat: 33.4447, lon: -118.4895 },
    midpoint: { name: "Mid-Channel", lat: (33.1958+33.4447)/2, lon: (-117.3831-118.4895)/2 },
    distance: "42 nm est",
    duration: "8-10h",
    comfort: { windKt: 14, gustKt: 22, waveFt: 5 },
    buoys: [{ id: "46086", name: "San Clemente Basin" }, { id: "46025", name: "Santa Monica Bay" }, { id: "46222", name: "San Pedro" }],
  },
  "3": {
    from: { name: "Two Harbors Marina", lat: 33.4447, lon: -118.4895 },
    to:   { name: "Fry's Harbor, Santa Cruz", lat: 34.0300, lon: -119.7600 },
    midpoint: { name: "Anacapa Passage", lat: (33.4447+34.0300)/2, lon: (-118.4895-119.7600)/2 },
    distance: "65 nm est",
    duration: "12-16h",
    comfort: { windKt: 13, gustKt: 20, waveFt: 5 },
    buoys: [{ id: "46086", name: "San Clemente Basin" }, { id: "46221", name: "Santa Barbara West" }, { id: "46217", name: "Anacapa Passage" }],
  },
  "4": {
    from: { name: "Fry's Harbor, Santa Cruz", lat: 34.0300, lon: -119.7600 },
    to:   { name: "Santa Rosa Island", lat: 33.9850, lon: -120.0570 },
    midpoint: { name: "Santa Cruz Channel", lat: (34.03+33.985)/2, lon: (-119.76-120.057)/2 },
    distance: "18 nm est",
    duration: "4-6h",
    comfort: { windKt: 12, gustKt: 18, waveFt: 5 },
    buoys: [{ id: "46221", name: "Santa Barbara West" }, { id: "46054", name: "West Santa Barbara" }],
  },
  "5": {
    from: { name: "Fry's Harbor, Santa Cruz", lat: 34.0300, lon: -119.7600 },
    to:   { name: "Two Harbors Marina", lat: 33.4447, lon: -118.4895 },
    midpoint: { name: "Anacapa Passage", lat: (34.0300+33.4447)/2, lon: (-119.7600-118.4895)/2 },
    distance: "65 nm est",
    duration: "12-16h",
    comfort: { windKt: 13, gustKt: 20, waveFt: 5 },
    buoys: [{ id: "46221", name: "Santa Barbara West" }, { id: "46217", name: "Anacapa Passage" }, { id: "46086", name: "San Clemente Basin" }],
  },
  "6": {
    from: { name: "Two Harbors Marina", lat: 33.4447, lon: -118.4895 },
    to:   { name: "Oceanside, CA", lat: 33.1958, lon: -117.3831 },
    midpoint: { name: "Mid-Channel", lat: (33.4447+33.1958)/2, lon: (-118.4895-117.3831)/2 },
    distance: "42 nm est",
    duration: "8-10h",
    comfort: { windKt: 14, gustKt: 22, waveFt: 5 },
    buoys: [{ id: "46222", name: "San Pedro" }, { id: "46025", name: "Santa Monica Bay" }, { id: "46086", name: "San Clemente Basin" }],
  },
  "7": {
    from: { name: "Oceanside, CA", lat: 33.1958, lon: -117.3831 },
    to:   { name: "San Diego", lat: 32.7157, lon: -117.1611 },
    midpoint: { name: "Del Mar", lat: (33.1958+32.7157)/2, lon: (-117.3831-117.1611)/2 },
    distance: "35 nm est",
    duration: "6-8h",
    comfort: { windKt: 15, gustKt: 22, waveFt: 5 },
    buoys: [{ id: "46086", name: "San Clemente Basin" }, { id: "46232", name: "Point Loma South" }],
  },
} as const

/** ---------- signals & scoring (matches TripOverview) ---------- **/

function computeSignals(buoyObs: Obs[], hourly: HourPoint[]) {
  const next6 = hourly.slice(0, 6)

  // Gusty if gust ≥ max(20 kt, 1.35× sustained) and spread ≥ 5 kt
  const gustyFromBuoy = buoyObs.some(b => {
    const w = b.windKts ?? null, g = b.gustKts ?? null
    return Number.isFinite(w) && Number.isFinite(g) && (g! >= Math.max(20, 1.35 * (w!)) && (g! - (w!)) >= 5)
  })
  const gustyFromHourly = next6.some(h => {
    const w = h.windKts ?? null, g = h.gustKts ?? null
    return Number.isFinite(w) && Number.isFinite(g) && (g! >= Math.max(20, 1.35 * (w!)) && (g! - (w!)) >= 5)
  })
  const gusty = gustyFromBuoy || gustyFromHourly

  // Fog/visibility
  const fog = next6.some(h => {
    const s = (h.shortForecast || "").toLowerCase()
    return /fog|patchy fog|dense fog|haze|smoke|mist|low clouds/.test(s)
  })

  // Santa Ana heuristic: mean 30°–120° and max gust ≥ 25 kt, or text mentions “Santa Ana”
  const dirs = next6.map(h => h.dirDeg).filter((d): d is number => Number.isFinite(d as any))
  const meanDir = dirs.length ? dirs.reduce((a,b)=>a+b,0)/dirs.length : null
  const maxGust = Math.max(...next6.map(h => h.gustKts ?? -Infinity), -Infinity)
  const santaTxt = next6.some(h => (h.shortForecast || "").toLowerCase().includes("santa ana"))
  const santaAna = santaTxt || (Number.isFinite(meanDir as any) && (meanDir as number) >= 30 && (meanDir as number) <= 120 && Number.isFinite(maxGust) && maxGust >= 25)

  return { gusty, fog, santaAna }
}

function computeStatus(
  comfort: { windKt: number; gustKt: number; waveFt: number },
  buoyObs: Obs[],
  hourly: HourPoint[],
  signals: { gusty: boolean; fog: boolean; santaAna: boolean }
): Status {
  const { gusty, santaAna } = signals

  // Effective comfort wave (+1ft everywhere)
  const comfortWave = comfort.waveFt + 1

  // Max effective wave with short-period penalty
  const maxEffWave = maxEffectiveWaveFt(buoyObs)

  // Peak wind/gust from next 6 hours
  const next6 = hourly.slice(0, 6)
  const peakWind = Math.max(...next6.map(h => h.windKts ?? -Infinity), -Infinity)
  const peakGust = Math.max(...next6.map(h => h.gustKts ?? -Infinity), -Infinity)

  // Baseline
  let status: Status = "green"
  if ((Number.isFinite(maxEffWave) && maxEffWave >= 1.5 * comfortWave) ||
      (Number.isFinite(peakGust)   && peakGust > comfort.gustKt)) {
    status = "red"
  } else if ((Number.isFinite(maxEffWave) && maxEffWave > comfortWave) ||
             (Number.isFinite(peakWind)   && peakWind > comfort.windKt)) {
    status = "yellow"
  }

  // Adjustments
  if (gusty) status = status === "green" ? "yellow" : "red"
  if (santaAna) status = "red"

  return status
}


/** ---------- component ---------- **/

interface LegDetailProps {
  onBack: () => void
  legId: string | null
}

export function LegDetail({ onBack, legId }: LegDetailProps) {
  const currentLegId = legId || "2"
  const leg = ALL_LEGS[currentLegId as keyof typeof ALL_LEGS] || ALL_LEGS["2"]

  // Cards for Start / Mid / End (ForecastStrip self-fetches)
  const locations = useMemo(() => ([
    { key: "start", label: `${leg.from.name} (Start)`, lat: leg.from.lat, lon: leg.from.lon },
    { key: "mid",   label: `${leg.midpoint.name}`,     lat: leg.midpoint.lat, lon: leg.midpoint.lon },
    { key: "end",   label: `${leg.to.name} (End)`,     lat: leg.to.lat, lon: leg.to.lon },
  ]), [currentLegId])

  /** ---------- state: live data ---------- **/
  const [buoyMap, setBuoyMap] = useState<Record<string, Obs | null>>({})
  const [buoysLoading, setBuoysLoading] = useState(false)
  const [forecastLine, setForecastLine] = useState<string | null>(null)

  // midpoint hourly (for signals/scoring)
  const [midHourly, setMidHourly] = useState<HourPoint[]>([])
  const [alerts, setAlerts] = useState<{ type: "info" | "warning" | "statement"; title: string; subtitle: string | null }[]>([])
  const [status, setStatus] = useState<Status>("green")

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setBuoysLoading(true)
      const ids = leg.buoys.map(b => String(b.id))
      try {
        // Batch buoys
        const r = await fetch(`/api/buoys?ids=${ids.join(",")}`)
        const j = await r.json()
        const next: Record<string, Obs | null> = {}
        for (const item of j?.results ?? []) {
          const id = String(item?.id ?? item?.station ?? "")
          next[id] = item?.obs ?? null
        }
        // Fallback singles
        const missing = ids.filter(id => !(id in next) || next[id] == null)
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
      } catch {
        if (!cancelled) setBuoyMap({})
      } finally {
        if (!cancelled) setBuoysLoading(false)
      }

      // NWS text summary (mid-line)
      try {
        const lat = (leg.from.lat + leg.to.lat) / 2
        const lon = (leg.from.lon + leg.to.lon) / 2
        const fr = await fetch(`/api/forecast?lat=${lat}&lon=${lon}`)
        const fj = await fr.json()
        const p = fj?.forecast?.properties?.periods?.[0]
        if (!cancelled) setForecastLine(p?.detailedForecast || p?.shortForecast || null)
      } catch { if (!cancelled) setForecastLine(null) }

      // Midpoint hourly (for signals + status)
      try {
        const hr = await fetch(`/api/forecastHourly?lat=${leg.midpoint.lat}&lon=${leg.midpoint.lon}&hours=12`)
        const hj = await hr.json()
        const hours: HourPoint[] = (hj?.hours ?? []).map((h: any) => ({
          time: h?.time ?? null,
          windKts: h?.windKts ?? null,
          gustKts: h?.gustKts ?? null,
          dirDeg: h?.dirDeg ?? null,
          shortForecast: h?.shortForecast ?? null,
        }))
        if (!cancelled) setMidHourly(hours)
      } catch { if (!cancelled) setMidHourly([]) }
    })()
    return () => { cancelled = true }
  }, [currentLegId])

  // Build signals, status, alerts when data changes
  useEffect(() => {
    const obsForLeg = leg.buoys.map(b => buoyMap[b.id]).filter(Boolean) as Obs[]
    const signals = computeSignals(obsForLeg, midHourly)
    const s = computeStatus(leg.comfort, obsForLeg, midHourly, signals)

    const nextAlerts: { type: "info" | "warning" | "statement"; title: string; subtitle: string | null }[] = []
    if (signals.santaAna) {
      nextAlerts.push({ type: "warning", title: "Santa Ana setup possible", subtitle: "NE/E offshore winds with strong gusts" })
    }
    if (signals.gusty) {
      const maxG = Math.max(...midHourly.slice(0,6).map(h => h.gustKts ?? -Infinity), -Infinity)
      nextAlerts.push({ type: "warning", title: "Gusty conditions expected", subtitle: Number.isFinite(maxG) ? `Peak gusts ~${roundNum(maxG)}kt` : "Large gust factor" })
    }
    if (signals.fog) {
      nextAlerts.push({ type: "info", title: "Reduced visibility (fog/haze)", subtitle: "Use radar/AIS if available; add lookout" })
    }
    setAlerts(nextAlerts)
    setStatus(s)
  }, [buoyMap, midHourly, currentLegId])

  return (
    <div className="space-y-6">
      {/* Header with status dot */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="p-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl flex items-center gap-2">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${dotClass(status)}`} />
              {leg.from.name} → {leg.to.name}
            </h1>
            <p className="text-sm text-gray-600">
              {leg.distance} • {leg.duration} duration
            </p>
          </div>
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

        {/* Alerts derived from signals */}
        {alerts.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Conditions to watch
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {alerts.map((a, i) => (
                <div key={i} className="text-sm">
                  <span className={a.type === "warning" ? "font-medium text-amber-700" : "text-gray-700"}>
                    {a.title}
                  </span>
                  {a.subtitle && <span className="text-gray-500"> — {a.subtitle}</span>}
                </div>
              ))}
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
              {/* ForecastStrip self-fetches hourly from /api/forecastHourly */}
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
          const obs = buoyMap[b.id]
          const wind = obs?.windKts != null ? `${roundStr(obs.windKts)}kt` : "—"
          const gust = obs?.gustKts != null ? `G${roundStr(obs.gustKts)}` : ""
          const wdir = obs?.windDirDeg != null ? `${roundStr(obs.windDirDeg)}° ${degToDir(obs.windDirDeg)}` : "—"
          const waves = obs?.waveHeightFt != null ? `${roundStr(obs.waveHeightFt, 1)}ft` : "—"
          const period = obs?.domPeriodS != null ? `${obs.domPeriodS}s period` : "—"
          const wtmp = obs?.waterTempF != null ? `${roundStr(obs.waterTempF)}°F` : "—"

          return (
            <Card key={b.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
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
