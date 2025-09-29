import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { RiskBadge } from "./RiskBadge"
import { BuoyPill } from "./BuoyPill"
import { AlertRow } from "./AlertRow"
import { Button } from "./ui/button"

interface TripOverviewProps {
  onLegSelect: (legId: string) => void;
}

/* ---------- tiny format helpers ---------- */
type Obs = {
  windKts?: number | null
  gustKts?: number | null
  windDirDeg?: number | null
  waveHeightFt?: number | null
  domPeriodS?: number | null
  time?: string
}
const round = (n: number | null | undefined, d = 0) =>
  n == null || !Number.isFinite(n) ? "—" : Number(n.toFixed(d)).toString()

const degToDir = (deg?: number | null) => {
  if (deg == null || !Number.isFinite(deg)) return "—"
  const dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"]
  return dirs[Math.round(((deg % 360) / 22.5)) % 16]
}

function summarize(o?: Obs | null) {
  if (!o) return "n/a"
  const wind = o.windKts != null ? `${round(o.windKts)} kt` : "—"
  const gust = o.gustKts != null ? ` G${round(o.gustKts)}` : ""
  const dir  = o.windDirDeg != null ? ` ${degToDir(o.windDirDeg)}` : ""
  const waves = o.waveHeightFt != null ? `${round(o.waveHeightFt,1)} ft` : "—"
  const dp = o.domPeriodS != null ? ` @ ${o.domPeriodS}s` : ""
  return `Wind ${wind}${gust}${dir} • Waves ${waves}${dp}`
}
/* ---------------------------------------- */

export function TripOverview({ onLegSelect }: TripOverviewProps) {
  // one-line live readout per leg after a pill click
  const [buoyLineByLeg, setBuoyLineByLeg] = useState<Record<string, string | null>>({})

  async function handleBuoyClick(legId: string, buoyId: string) {
    try {
      const r = await fetch(`/api/buoy?id=${encodeURIComponent(buoyId)}`)
      const j = await r.json()
      const line = j?.obs ? `${buoyId}: ${summarize(j.obs as Obs)}` : `${buoyId}: n/a`
      setBuoyLineByLeg(prev => ({ ...prev, [legId]: line }))
    } catch {
      setBuoyLineByLeg(prev => ({ ...prev, [legId]: `${buoyId}: n/a` }))
    }
  }

  const mockLegs = [
    {
      id: "1",
      from: "San Diego",
      to: "Oceanside",
      distance: "35 nm est",
      window: "06:00–12:00",
      comfort: "up to 22 kt / 6 ft",
      status: "green" as const,
      risk: "LOW" as const,
      riskDescription: "Favorable conditions with light winds and calm seas.",
      buoys: ["46232", "46086"],
      alerts: [
        { type: "info" as const, title: "Small Craft Advisory lifted for coastal waters", subtitle: "Conditions improving" }
      ]
    },
    {
      id: "2",
      from: "Oceanside",
      to: "Two Harbors",
      distance: "42 nm est",
      window: "08:00–14:00",
      comfort: "up to 25 kt / 8 ft",
      status: "yellow" as const,
      risk: "ELEVATED" as const,
      riskDescription: "Moderate winds building afternoon. Monitor conditions closely.",
      buoys: ["46086", "46025", "46221"],
      alerts: [
        { type: "warning" as const, title: "Wind advisory — gusty conditions possible near Catalina Channel", subtitle: null }
      ]
    },
    {
      id: "3",
      from: "Two Harbors",
      to: "Marina del Rey",
      distance: "28 nm est",
      window: "10:00–16:00",
      comfort: "up to 30 kt / 10 ft",
      status: "red" as const,
      risk: "HIGH" as const,
      riskDescription: "Strong Santa Ana winds expected. Consider postponing departure.",
      buoys: ["46025", "46222", "46253"],
      alerts: [
        { type: "warning" as const, title: "Possible Santa Ana — NE/E gusts 30-40kt near San Pedro Channel", subtitle: null },
        { type: "statement" as const, title: "Marine stmt: Small Craft Advisory", subtitle: "(in effect)" }
      ]
    }
  ]

  return (
    <div className="space-y-6">
      {mockLegs.map((leg, index) => (
        <Card
          key={leg.id}
          className="border-l-4"
          style={{
            borderLeftColor:
              leg.status === "green" ? "#10b981" :
              leg.status === "yellow" ? "#f59e0b" : "#ef4444"
          }}
        >
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">
                  Leg {index + 1}: {leg.from} → {leg.to}
                </CardTitle>
                <p className="mt-1 text-sm text-gray-600">
                  {leg.distance} • {leg.window} • {leg.comfort}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onLegSelect(leg.id)}
                className="shrink-0"
              >
                View Details
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Risk Assessment */}
            <div>
              <h4 className="mb-2">Risk Assessment</h4>
              <div className="mb-2 flex items-center gap-2">
                <RiskBadge level={leg.risk} />
              </div>
              <p className="text-sm text-gray-600">{leg.riskDescription}</p>
            </div>

            {/* Watched Buoys (LIVE on tap) */}
            <div>
              <h4 className="mb-2">Watched Buoys</h4>
              <div className="mb-2 flex gap-2">
                {leg.buoys.map((buoyId) => (
                  <BuoyPill
                    key={buoyId}
                    buoyId={buoyId}
                    onClick={() => handleBuoyClick(leg.id, buoyId)}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-500">Tap to see last obs</p>
              {buoyLineByLeg[leg.id] && (
                <p className="mt-2 text-xs text-gray-700">
                  {buoyLineByLeg[leg.id]}
                </p>
              )}
            </div>

            {/* Alerts */}
            {leg.alerts.length > 0 && (
              <div>
                <h4 className="mb-2">Alerts</h4>
                <div className="overflow-hidden rounded-md border">
                  {leg.alerts.map((alert, alertIndex) => (
                    <AlertRow
                      key={alertIndex}
                      type={alert.type}
                      title={alert.title}
                      subtitle={alert.subtitle}
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
