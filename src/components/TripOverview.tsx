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
  // display “window” and comfort copy for the row
  window: string
  comfortCopy: string
  // numeric comfort limits for scoring
  comfort: { windKt: number; gustKt: number; waveFt: number }
  buoys: string[] // station IDs
}

// ---------- Routes & Legs ----------
const LEGS: LegConfig[] = [
  {
    id: "1",
    from: { name: "San Diego", lat: 32.7157, lon: -117.1611 },
    to: { name: "Oceanside", lat: 33.1958, lon: -117.3831 },
    midpoint: { name: "Del Mar", lat: 32.9595, lon: -117.2661 },
    distance: "35 nm est",
    window: "06:00–12:00",
    comfortCopy: "up to 22 kt / 6 ft",
    comfort: { windKt: 22, gustKt: 30, waveFt: 6 },
    buoys: ["46232", "46086"],
  },
  {
    id: "2",
    from: { name: "Oceanside", lat: 33.1958, lon: -117.3831 },
    to: { name: "Two Harbors", lat: 33.4447, lon: -118.4895 },
    midpoint: { name: "Mid-Channel", lat: 33.3203, lon: -117.9363 },
    distance: "42 nm est",
    window: "08:00–14:00",
    comfortCopy: "up to 25 kt / 8 ft",
    comfort: { windKt: 25, gustKt: 32, waveFt: 8 },
    buoys: ["46086", "46025", "46221"],
  },
  {
    id: "3",
    from: { name: "Two Harbors", lat: 33.4447, lon: -118.4895 },
    to: { name: "Marina del Rey", lat: 33.9806, lon: -118.4494 },
    midpoint: { name: "Redondo Canyon", lat: 33.7127, lon: -118.4695 },
    distance: "28 nm est",
    window: "10:00–16:00",
    comfortCopy: "up to 30 kt / 10 ft",
    comfort: { windKt: 30, gustKt: 38, waveFt: 10 },
    buoys: ["46025", "46222", "46253"],
  },
]

// ---------- Helpers ----------
const round = (n: number | null | undefined, d = 0) =>
  n == null || !Number.isFinite(n) ? null : Number(n.toFixed(d))

function computeStatusAndRisk(opts: {
  comfort: LegConfig["comfort"]
  buoyObs: Obs[] // latest obs for watched buoys
  hourly: HourPoint[] // hourly at midpoint
}): { status: Status; risk: RiskLevel; description: string } {
  const { comfort, buoyObs, hourly } = opts

  const maxWave = Math.max(
    ...buoyObs.map(b => b.waveHeightFt ?? -Infinity),
    -Infinity
  )
  const latest = hourly.slice(0, 6) // next ~6 hours is what skipper cares about
  const peakWind = Math.max(...latest.map(h => h.windKts ?? -Infinity), -Infinity)
  const peakGust = Math.max(...latest.map(h => h.gustKts ?? -Infinity), -Infinity)

  // Normalize to numbers (if all null, set to -Infinity so comparisons fail)
  const wave = Number.isFinite(maxWave) ? maxWave : -Infinity
  const wind = Number.isFinite(peakWind) ? peakWind : -Infinity
  const gust = Number.isFinite(peakGust) ? peakGust : -Infinity

  // Status logic
  let status: Status = "green"
  if (gust > comfort.gustKt || wave > comfort.waveFt) status = "red"
  else if (wind > comfort.windKt * 0.9 || wave > comfort.waveFt * 0.85) status = "yellow"

  // Risk mapping & description
  let risk: RiskLevel = "LOW"
  let description = "Favorable conditions with manageable winds and seas."
  if (status === "yellow") {
    risk = "ELEVATED"
    description = "Moderate conditions expected. Monitor winds/sea state and adjust timing."
  }
  if (status === "red") {
    risk = "HIGH"
    description = "Plan exceeds comfort limits. Consider alternate timing or route."
  }

  // Add a bit of specificity if we have numbers
  const parts: string[] = []
  if (Number.isFinite(gust)) parts.push(`gusts ~${round(gust)}kt`)
  if (Number.isFinite(wave)) parts.push(`seas ~${round(wave, 1)}ft`)
  if (parts.length && description) description += ` (${parts.join(", ")})`

  return { status, risk, description }
}

function buildDerivedAlerts(hourly: HourPoint[]): { type: AlertType; title: string; subtitle: string | null }[] {
  const alerts: { type: AlertType; title: string; subtitle: string | null }[] = []
  if (!hourly.length) return alerts

  const next6 = hourly.slice(0, 6)
  const maxGust = Math.max(...next6.map(h => h.gustKts ?? -Infinity), -Infinity)
  const meanDir = (() => {
    const dirs = next6.map(h => h.dirDeg).filter((d): d is number => Number.isFinite(d as any))
    if (!dirs.length) return null
    const s = dirs.reduce((a, b) => a + b, 0)
    return s / dirs.length
  })()

  // crude “Santa Ana-ish” heads-up (NE/E quadrant + strong)
  if (Number.isFinite(maxGust) && Number.isFinite(meanDir as any)) {
    const d = meanDir as number
    const inNEtoE = d >= 30 && d <= 120
    if (inNEtoE && maxGust >= 25) {
      alerts.push({
        type: "warning",
        title: "Possible offshore (NE/E) gusts next hours",
        subtitle: "Watch gaps/channel alignments",
      })
    }
  }

  // Info line from first period shortForecast if present
  const short = next6[0]?.shortForecast
  if (short) {
    alerts.push({
      type: "info",
      title: short,
      subtitle: "NWS hourly",
    })
  }

  return alerts
}

// ---------- Component ----------
interface TripOverviewProps {
  onLegSelect: (legId: string) => void
}

export function TripOverview({ onLegSelect }: TripOverviewProps) {
  // Fetch all watched buoys once (de-duped)
  const allBuoys = useMemo(
    () => Array.from(new Set(LEGS.flatMap(l => l.buoys))),
    []
  )

  const [buoyMap, setBuoyMap] = useState<Record<string, Obs | null>>({})
  const [hourlyByLeg, setHourlyByLeg] = useState<Record<string, HourPoint[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // 1) Buoys batch
        const r = await fetch(`/api/buoys?ids=${allBuoys.join(",")}`)
        const j = await r.json()
        const nextBuoys: Record<string, Obs | null> = {}
        const arr = Array.isArray(j?.results) ? j.results : []
        for (const item of arr) {
          const id = String(item?.id ?? item?.station ?? "")
          nextBuoys[id] = item?.obs ?? null
        }

        // 2) Hourly per leg (midpoint)
        const perLeg = await Promise.all(
          LEGS.map(async (leg) => {
            const res = await fetch(
              `/api/forecastHourly?lat=${leg.midpoint.lat}&lon=${leg.midpoint.lon}&hours=12`
            )
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

  // Build UI rows with live scoring
  const rows = useMemo(() => {
    return LEGS.map((leg) => {
      const obsForLeg: Obs[] = leg.buoys.map(id => buoyMap[id]).filter(Boolean) as Obs[]
      const hourly = hourlyByLeg[leg.id] ?? []

      const { status, risk, description } = computeStatusAndRisk({
        comfort: leg.comfort,
        buoyObs: obsForLeg,
        hourly,
      })

      const alerts = buildDerivedAlerts(hourly)

      return {
        id: leg.id,
        title: `Leg ${leg.id}: ${leg.from.name} → ${leg.to.name}`,
        distance: leg.distance,
        window: leg.window,
        comfortCopy: leg.comfortCopy,
        status,
        risk,
        riskDescription: description,
        buoys: leg.buoys,
        alerts,
      }
    })
  }, [buoyMap, hourlyByLeg])

  return (
    <div className="space-y-6">
      {rows.map((leg, index) => (
        <Card
          key={leg.id}
          className="border-l-4"
          style={{
            borderLeftColor:
              leg.status === "green" ? "#10b981" :
              leg.status === "yellow" ? "#f59e0b" : "#ef4444",
          }}
        >
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">
                  {leg.title}
                </CardTitle>
                <p className="mt-1 text-sm text-gray-600">
                  {leg.distance} • {leg.window} • {leg.comfortCopy}
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onLegSelect(leg.id)}
                className="shrink-0"
                disabled={loading}
              >
                {loading ? "Loading…" : "View Details"}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Risk Assessment */}
            <div>
              <h4 className="mb-2">Risk Assessment</h4>
              <div className="mb-2 flex items-center gap-2">
                <RiskBadge level={leg.risk as RiskLevel} />
              </div>
              <p className="text-sm text-gray-600">
                {leg.riskDescription}
              </p>
            </div>

            {/* Watched Buoys */}
            <div>
              <h4 className="mb-2">Watched Buoys</h4>
              <div className="mb-2 flex gap-2">
                {leg.buoys.map((buoyId) => (
                  <BuoyPill
                    key={buoyId}
                    buoyId={buoyId}
                    onClick={() => console.log(`Viewing buoy ${buoyId} for leg ${leg.id}`)}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-500">Tap to see last obs</p>
            </div>

            {/* Alerts */}
            {leg.alerts.length > 0 && (
              <div>
                <h4 className="mb-2">Alerts</h4>
                <div className="overflow-hidden rounded-md border">
                  {leg.alerts.map((a, i) => (
                    <AlertRow
                      key={i}
                      type={a.type}
                      title={a.title}
                      subtitle={a.subtitle}
                    />
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
