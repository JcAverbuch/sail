// src/components/TripOverview.tsx
import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { RiskBadge } from "./RiskBadge"
import { BuoyPill } from "./BuoyPill"
import { AlertRow } from "./AlertRow"
import { Button } from "./ui/button"

type Obs = {
  time?: string
  windDirDeg?: number | null
  windKts?: number | null
  gustKts?: number | null
  waveHeightFt?: number | null
  domPeriodS?: number | null
  waterTempF?: number | null
}

type HourPoint = {
  time: string | null
  windKts: number | null
  gustKts: number | null
  dirDeg: number | null
  shortForecast?: string | null
}

type Status = "green" | "yellow" | "red"
type RiskLevel = "LOW" | "ELEVATED" | "HIGH"
type AlertType = "info" | "warning" | "statement"

type LegConfig = {
  id: string
  from: { name: string; lat: number; lon: number }
  to: { name: string; lat: number; lon: number }
  midpoint: { name: string; lat: number; lon: number }
  distance: string
  window: string
  comfortCopy: string
  comfort: { windKt: number; gustKt: number; waveFt: number }
  buoys: string[] // NDBC station IDs
}

/** ----------------------------------------------------------------
 * Legs + buoys (your 7-leg route)
 * ---------------------------------------------------------------- */
const LEGS: LegConfig[] = [
  {
    id: "1",
    from: { name: "San Diego", lat: 32.7157, lon: -117.1611 },
    to:   { name: "Oceanside, CA", lat: 33.1958, lon: -117.3831 },
    midpoint: { name: "Del Mar", lat: (32.7157+33.1958)/2, lon: (-117.1611-117.3831)/2 },
    distance: "35 nm est",
    window: "06:00–12:00",
    comfortCopy: "up to 15 kt / 4 ft",
    comfort: { windKt: 15, gustKt: 22, waveFt: 4 },
    buoys: ["46232","46086"],
  },
  {
    id: "2",
    from: { name: "Oceanside, CA", lat: 33.1958, lon: -117.3831 },
    to:   { name: "Two Harbors Marina", lat: 33.4447, lon: -118.4895 },
    midpoint: { name: "Mid-Channel", lat: (33.1958+33.4447)/2, lon: (-117.3831-118.4895)/2 },
    distance: "42 nm est",
    window: "08:00–14:00",
    comfortCopy: "up to 14 kt / 4 ft",
    comfort: { windKt: 14, gustKt: 22, waveFt: 4 },
    buoys: ["46086","46025","46222"],
  },
  {
    id: "3",
    from: { name: "Two Harbors Marina", lat: 33.4447, lon: -118.4895 },
    to:   { name: "Fry's Harbor, Santa Cruz", lat: 34.0300, lon: -119.7600 },
    midpoint: { name: "Anacapa Passage", lat: (33.4447+34.0300)/2, lon: (-118.4895-119.7600)/2 },
    distance: "65 nm est",
    window: "06:00–18:00",
    comfortCopy: "up to 13 kt / 4 ft",
    comfort: { windKt: 13, gustKt: 20, waveFt: 4 },
    buoys: ["46086","46221","46217"],
  },
  {
    id: "4",
    from: { name: "Fry's Harbor, Santa Cruz", lat: 34.0300, lon: -119.7600 },
    to:   { name: "Santa Rosa Island", lat: 33.9850, lon: -120.0570 },
    midpoint: { name: "Santa Cruz Channel", lat: (34.03+33.985)/2, lon: (-119.76-120.057)/2 },
    distance: "18 nm est",
    window: "07:00–15:00",
    comfortCopy: "up to 12 kt / 4 ft",
    comfort: { windKt: 12, gustKt: 18, waveFt: 4 },
    buoys: ["46221","46054"],
  },
  {
    id: "5",
    from: { name: "Fry's Harbor, Santa Cruz", lat: 34.0300, lon: -119.7600 },
    to:   { name: "Two Harbors Marina", lat: 33.4447, lon: -118.4895 },
    midpoint: { name: "Anacapa Passage", lat: (34.0300+33.4447)/2, lon: (-119.7600-118.4895)/2 },
    distance: "65 nm est",
    window: "06:00–18:00",
    comfortCopy: "up to 13 kt / 4 ft",
    comfort: { windKt: 13, gustKt: 20, waveFt: 4 },
    buoys: ["46221","46217","46086"],
  },
  {
    id: "6",
    from: { name: "Two Harbors Marina", lat: 33.4447, lon: -118.4895 },
    to:   { name: "Oceanside, CA", lat: 33.1958, lon: -117.3831 },
    midpoint: { name: "Mid-Channel", lat: (33.4447+33.1958)/2, lon: (-118.4895-117.3831)/2 },
    distance: "42 nm est",
    window: "08:00–16:00",
    comfortCopy: "up to 14 kt / 4 ft",
    comfort: { windKt: 14, gustKt: 22, waveFt: 4 },
    buoys: ["46222","46025","46086"],
  },
  {
    id: "7",
    from: { name: "Oceanside, CA", lat: 33.1958, lon: -117.3831 },
    to:   { name: "San Diego", lat: 32.7157, lon: -117.1611 },
    midpoint: { name: "Del Mar", lat: (33.1958+32.7157)/2, lon: (-117.3831-117.1611)/2 },
    distance: "35 nm est",
    window: "06:00–12:00",
    comfortCopy: "up to 15 kt / 4 ft",
    comfort: { windKt: 15, gustKt: 22, waveFt: 4 },
    buoys: ["46086","46232"],
  },
]

// ---------- Helpers ----------
const round = (n: number | null | undefined, d = 0) =>
  n == null || !Number.isFinite(n) ? null : Number(n.toFixed(d))

const clampStatus = (s: Status) => (s === "green" || s === "yellow" || s === "red" ? s : "green")
const worse = (s: Status, steps = 1): Status => {
  const order: Status[] = ["green", "yellow", "red"]
  const idx = Math.min(order.indexOf(s) + steps, order.length - 1)
  return order[idx]
}

function computeSignals(buoyObs: Obs[], hourly: HourPoint[]) {
  const next6 = hourly.slice(0, 6)

  // Gusty: either buoy obs or hourly shows strong gust factor
  const gustyFromBuoy = buoyObs.some(b => {
    const w = b.windKts ?? null, g = b.gustKts ?? null
    return Number.isFinite(w) && Number.isFinite(g) && (g! >= Math.max(20, 1.35 * (w!)) && (g! - (w!)) >= 5)
  })
  const gustyFromHourly = next6.some(h => {
    const w = h.windKts ?? null, g = h.gustKts ?? null
    return Number.isFinite(w) && Number.isFinite(g) && (g! >= Math.max(20, 1.35 * (w!)) && (g! - (w!)) >= 5)
  })
  const gusty = gustyFromBuoy || gustyFromHourly

  // Fog/poor visibility: look for keywords in shortForecast
  const fog = next6.some(h => {
    const s = (h.shortForecast || "").toLowerCase()
    return /fog|patchy fog|dense fog|haze|smoke|mist|low clouds/.test(s)
  })

  // Santa Ana heuristic:
  // mean direction NE–E (30°–120°) and solid gusts; or text mentions "Santa Ana"
  const dirs = next6.map(h => h.dirDeg).filter((d): d is number => Number.isFinite(d as any))
  const meanDir = dirs.length ? dirs.reduce((a,b)=>a+b,0)/dirs.length : null
  const maxGust = Math.max(...next6.map(h => h.gustKts ?? -Infinity), -Infinity)
  const santaTxt = next6.some(h => (h.shortForecast || "").toLowerCase().includes("santa ana"))
  const santaAna = santaTxt || (Number.isFinite(meanDir as any) && (meanDir as number) >= 30 && (meanDir as number) <= 120 && Number.isFinite(maxGust) && maxGust >= 25)

  return { gusty, fog, santaAna }
}

function computeStatusAndRisk(opts: {
  comfort: LegConfig["comfort"]
  buoyObs: Obs[]
  hourly: HourPoint[]
  signals: { gusty: boolean; fog: boolean; santaAna: boolean }
}): { status: Status; risk: RiskLevel; description: string } {
  const { comfort, buoyObs, hourly, signals } = opts
  const { gusty, santaAna } = signals

  const maxWave = Math.max(...buoyObs.map(b => b.waveHeightFt ?? -Infinity), -Infinity)
  const next6 = hourly.slice(0, 6)
  const peakWind = Math.max(...next6.map(h => h.windKts ?? -Infinity), -Infinity)
  const peakGust = Math.max(...next6.map(h => h.gustKts ?? -Infinity), -Infinity)

  const wave = Number.isFinite(maxWave) ? maxWave : -Infinity
  const wind = Number.isFinite(peakWind) ? peakWind : -Infinity
  const gust = Number.isFinite(peakGust) ? peakGust : -Infinity

  // Baseline status
  let status: Status = "green"
  if (gust > comfort.gustKt || wave > comfort.waveFt) status = "red"
  else if (wind > comfort.windKt * 0.9 || wave > comfort.waveFt * 0.85) status = "yellow"

  // Rule: Gusty → one step worse
  if (gusty) status = worse(status, 1)

  // Rule: Santa Ana → force RED
  if (santaAna) status = "red"

  status = clampStatus(status)
  const risk: RiskLevel = status === "red" ? "HIGH" : status === "yellow" ? "ELEVATED" : "LOW"

  let description =
    status === "red"
      ? "Plan exceeds comfort limits or hazardous winds expected."
      : status === "yellow"
      ? "Moderate conditions. Monitor winds/sea state and adjust timing."
      : "Favorable conditions with manageable winds and seas."

  const parts: string[] = []
  if (Number.isFinite(gust)) parts.push(`gusts ~${round(gust)}kt`)
  if (Number.isFinite(wave)) parts.push(`seas ~${round(wave, 1)}ft`)
  if (parts.length) description += ` (${parts.join(", ")})`

  return { status, risk, description }
}

function buildDerivedAlerts(hourly: HourPoint[], signals: { gusty: boolean; fog: boolean; santaAna: boolean }) {
  const alerts: { type: AlertType; title: string; subtitle: string | null }[] = []
  const next6 = hourly.slice(0, 6)

  if (signals.santaAna) {
    alerts.push({
      type: "warning",
      title: "Santa Ana setup possible",
      subtitle: "NE/E offshore winds with strong gusts",
    })
  }

  if (signals.gusty) {
    const maxG = Math.max(...next6.map(h => h.gustKts ?? -Infinity), -Infinity)
    alerts.push({
      type: "warning",
      title: "Gusty conditions expected",
      subtitle: Number.isFinite(maxG) ? `Peak gusts ~${round(maxG)}kt` : "Large gust factor",
    })
  }

  if (signals.fog) {
    alerts.push({
      type: "info",
      title: "Reduced visibility (fog/haze)",
      subtitle: "Use radar/AIS if available; add lookout",
    })
  }

  const short = next6[0]?.shortForecast
  if (short) alerts.push({ type: "info", title: short, subtitle: "NWS hourly" })

  // de-dupe by title
  const seen = new Set<string>()
  return alerts.filter(a => (seen.has(a.title) ? false : (seen.add(a.title), true)))
}

// ---------- Component ----------
interface TripOverviewProps { onLegSelect: (legId: string) => void }

export function TripOverview({ onLegSelect }: TripOverviewProps) {
  const allBuoys = useMemo(() => Array.from(new Set(LEGS.flatMap(l => l.buoys))), [])
  const [buoyMap, setBuoyMap] = useState<Record<string, Obs | null>>({})
  const [hourlyByLeg, setHourlyByLeg] = useState<Record<string, HourPoint[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // 1) all buoys (batch)
        const r = await fetch(`/api/buoys?ids=${allBuoys.join(",")}`)
        const j = await r.json()
        const nextBuoys: Record<string, Obs | null> = {}
        for (const item of j?.results ?? []) {
          const id = String(item?.id ?? item?.station ?? "")
          nextBuoys[id] = item?.obs ?? null
        }

        // 2) hourly per leg (midpoint)
        const perLeg = await Promise.all(
          LEGS.map(async (leg) => {
            const res = await fetch(`/api/forecastHourly?lat=${leg.midpoint.lat}&lon=${leg.midpoint.lon}&hours=12`)
            const jj = await res.json()
            const hours: HourPoint[] = (jj?.hours ?? []).map((h: any) => ({
              time: h?.time ?? null,
              windKts: h?.windKts ?? null,
              gustKts: h?.gustKts ?? null,
              dirDeg: h?.dirDeg ?? null,
              shortForecast: h?.shortForecast ?? null,
            }))
            return [leg.id, hours] as const
          })
        )
        const nextHourly: Record<string, HourPoint[]> = {}
        for (const [id, hours] of perLeg) nextHourly[id] = hours

        if (!cancelled) {
          setBuoyMap(nextBuoys)
          setHourlyByLeg(nextHourly)
          setLoading(false)
        }
      } catch {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [allBuoys])

  const rows = useMemo(() => {
    return LEGS.map((leg) => {
      const obsForLeg = leg.buoys.map(id => buoyMap[id]).filter(Boolean) as Obs[]
      const hourly = hourlyByLeg[leg.id] ?? []

      const signals = computeSignals(obsForLeg, hourly)
      const { status, risk, description } = computeStatusAndRisk({
        comfort: leg.comfort, buoyObs: obsForLeg, hourly, signals,
      })
      const alerts = buildDerivedAlerts(hourly, signals)

      return {
        id: leg.id,
        title: `Leg ${leg.id}: ${leg.from.name} → ${leg.to.name}`,
        distance: leg.distance,
        window: leg.window,
        comfortCopy: leg.comfortCopy,
        status, risk, riskDescription: description,
        buoys: leg.buoys, alerts,
      }
    })
  }, [buoyMap, hourlyByLeg])

  return (
    <div className="space-y-6">
      {rows.map((leg) => (
        <Card key={leg.id} className="border-l-4"
          style={{ borderLeftColor: leg.status === "green" ? "#10b981" : leg.status === "yellow" ? "#f59e0b" : "#ef4444" }}>
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">{leg.title}</CardTitle>
                <p className="mt-1 text-sm text-gray-600">
                  {leg.distance} • {leg.window} • {leg.comfortCopy}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => onLegSelect(leg.id)} className="shrink-0" disabled={loading}>
                {loading ? "Loading…" : "View Details"}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div>
              <h4 className="mb-2">Risk Assessment</h4>
              <div className="mb-2 flex items-center gap-2">
                <RiskBadge level={leg.risk as RiskLevel} />
              </div>
              <p className="text-sm text-gray-600">{leg.riskDescription}</p>
            </div>

            <div>
              <h4 className="mb-2">Watched Buoys</h4>
              <div className="mb-2 flex gap-2">
                {leg.buoys.map((buoyId) => (
                  <BuoyPill key={buoyId} buoyId={buoyId}
                    onClick={() => console.log(`Viewing buoy ${buoyId} for leg ${leg.id}`)} />
                ))}
              </div>
              <p className="text-xs text-gray-500">Tap to see last obs</p>
            </div>

            {leg.alerts.length > 0 && (
              <div>
                <h4 className="mb-2">Alerts</h4>
                <div className="overflow-hidden rounded-md border">
                  {leg.alerts.map((a, i) => (
                    <AlertRow key={i} type={a.type} title={a.title} subtitle={a.subtitle} />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
