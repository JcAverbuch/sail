import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, Clock, Wind, Waves, MapPin, Navigation } from "lucide-react"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { ForecastStrip } from "./ForecastStrip"
import { Badge } from "./ui/badge"

/** ---------- helpers ---------- **/

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
  n == null ? "—" : Number(n.toFixed(d)).toString()
const degToDir = (deg?: number | null) => {
  if (deg == null || isNaN(deg)) return "—"
  const dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"]
  return dirs[Math.round((deg % 360) / 22.5) % 16]
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

export function LegDetail({ onBack, legId }: LegDetailProps) {
  const currentLegId = legId || "2"
  const leg = ALL_LEGS[currentLegId as keyof typeof ALL_LEGS] || ALL_LEGS["2"]

  // build a simple 5-hour placeholder for your ForecastStrip (you can replace with real hourly later)
  const forecastLocations = useMemo(() => {
    const mkHours = (base: number) =>
      ["08:00","09:00","10:00","11:00","12:00"].map((t, i) => ({
        time: t,
        windSpeed: base + i * 2,
        windGust: base + i * 2 + 4,
        windDirection: 50 + i * 15,
        waveHeight: 3 + Math.min(4, i),
        wavePeriod: 8 + (i % 3),
      }))
    return [
      {
        name: `${leg.from.name} (Start)`,
        coordinates: `${leg.from.lat.toFixed(3)}°N, ${Math.abs(leg.from.lon).toFixed(3)}°W`,
        forecast: mkHours(12),
      },
      {
        name: `${leg.midpoint.name}`,
        coordinates: `${leg.midpoint.lat.toFixed(3)}°N, ${Math.abs(leg.midpoint.lon).toFixed(3)}°W`,
        forecast: mkHours(15),
      },
      {
        name: `${leg.to.name} (End)`,
        coordinates: `${leg.to.lat.toFixed(3)}°N, ${Math.abs(leg.to.lon).toFixed(3)}°W`,
        forecast: mkHours(10),
      },
    ]
  }, [currentLegId])

  /** ---------- state: live data ---------- **/
  const [buoyMap, setBuoyMap] = useState<Record<string, { obs?: Obs }>>({})
  const [buoysLoading, setBuoysLoading] = useState(false)
  const [forecastLine, setForecastLine] = useState<string | null>(null)

  useEffect(() => {
    // 1) fetch buoy obs in one request
    const ids = leg.buoys.map(b => b.id).join(",")
    setBuoysLoading(true)
    fetch(`/api/buoys?ids=${ids}`)
      .then(r => r.json())
      .then(j => {
        const next: Record<string, { obs?: Obs }> = {}
        for (const r of j?.results ?? []) next[r.id] = { obs: r?.obs }
        setBuoyMap(next)
      })
      .catch(() => setBuoyMap({}))
      .finally(() => setBuoysLoading(false))

    // 2) fetch an NWS text line for context (first period)
    fetch(`/api/forecast?lat=${(leg.from.lat + leg.to.lat) / 2}&lon=${(leg.from.lon + leg.to.lon) / 2}`)
      .then(r => r.json())
      .then(j => {
        const p = j?.forecast?.properties?.periods?.[0]
        setForecastLine(p?.detailedForecast || p?.shortForecast || null)
      })
      .catch(() => setForecastLine(null))
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
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-600" />
                NWS summary (next period)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700">{forecastLine}</p>
            </CardContent>
          </Card>
        )}

        {forecastLocations.map((location, index) => (
          <Card key={index}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    {location.name}
                  </CardTitle>
                  <p className="mt-1 text-sm text-gray-600">{location.coordinates}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ForecastStrip forecast={location.forecast} />
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
          const obs: Obs | undefined = buoyMap[b.id]?.obs
          const wind = obs?.windKts != null ? `${round(obs.windKts)}kt` : "—"
          const gust = obs?.gustKts != null ? `G${round(obs.gustKts)}` : ""
          const wdir = obs?.windDirDeg != null ? `${obs.windDirDeg}° ${degToDir(obs.windDirDeg)}` : "—"
          const waves = obs?.waveHeightFt != null ? `${round(obs.waveHeightFt, 1)}ft` : "—"
          const period = obs?.domPeriodS != null ? `${obs.domPeriodS}s period` : "—"
          const wtmp = obs?.waterTempF != null ? `${round(obs.waterTempF)}°F` : "—"

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
                    {/* If you later store coords/distances per station, print them here */}
                    <p className="text-xs text-gray-500">
                      Last obs: {obs?.time ? new Date(obs.time).toLocaleString() : "—"}
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Current Conditions Grid */}
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

                {/* (Optional) Swell details:
                    NDBC realtime2 doesn’t always include split swell vs wind-wave.
                    If you add a spectral source later, render that here. */}
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
