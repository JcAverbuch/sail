import { useEffect, useMemo, useState } from "react"
import { ArrowUp, Waves } from "lucide-react"
import { Badge } from "./ui/badge"

type ForecastHour = {
  time: string
  windSpeed: number
  windGust: number
  windDirection: number // degrees (meteorological “from”)
  waveHeight?: number
  wavePeriod?: number
}

type ControlledProps = {
  forecast: ForecastHour[]
  lat?: never
  lon?: never
  hours?: never
}

type SelfFetchingProps = {
  forecast?: never
  lat: number
  lon: number
  hours?: number // default 12
}

type ForecastStripProps = ControlledProps | SelfFetchingProps

export function ForecastStrip(props: ForecastStripProps) {
  const isSelfFetching = typeof (props as SelfFetchingProps).lat === "number" &&
                         typeof (props as SelfFetchingProps).lon === "number"

  const [data, setData] = useState<ForecastHour[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // If controlled, just memo the incoming data and skip fetching entirely.
  const controlledData = useMemo(() => {
    if (!isSelfFetching) {
      const p = props as ControlledProps
      return p.forecast ?? []
    }
    return []
  }, [isSelfFetching, props])

  useEffect(() => {
    if (!isSelfFetching) return
    const { lat, lon } = props as SelfFetchingProps
    const hours = (props as SelfFetchingProps).hours ?? 12

    let cancel = false
    setLoading(true)
    setError(null)

    ;(async () => {
      try {
        const res = await fetch(`/api/forecastHourly?lat=${lat}&lon=${lon}&hours=${hours}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const j = await res.json()

        const items: ForecastHour[] = (j?.hours ?? []).map((h: any) => ({
          time: h?.time
            ? new Date(h.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "",
          windSpeed: h?.windKts ?? 0,
          windGust: h?.gustKts ?? (h?.windKts ?? 0),
          windDirection: h?.dirDeg ?? 0,
          // NWS hourly doesn’t include waves; keep optional fields for future sources
          waveHeight: undefined,
          wavePeriod: undefined,
        }))

        if (!cancel) setData(items)
      } catch (e: any) {
        if (!cancel) setError(e?.message || "Failed to load forecast")
      } finally {
        if (!cancel) setLoading(false)
      }
    })()

    return () => { cancel = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSelfFetching, (props as SelfFetchingProps).lat, (props as SelfFetchingProps).lon, (props as SelfFetchingProps).hours])

  const rows: ForecastHour[] = isSelfFetching ? (data ?? []) : controlledData

  if (isSelfFetching && loading && (!rows || rows.length === 0)) {
    return <div className="text-xs text-gray-500">loading hourly forecast…</div>
  }

  if (isSelfFetching && error && (!rows || rows.length === 0)) {
    return <div className="text-xs text-red-600">forecast error: {error}</div>
  }

  if (!rows || rows.length === 0) {
    return <div className="text-xs text-gray-500">No forecast available.</div>
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {rows.map((hour, index) => (
        <div key={index} className="min-w-[90px] flex-shrink-0 text-center">
          <div className="mb-2 text-xs text-gray-600">{hour.time}</div>

          {/* Wind */}
          <div className="mb-2 flex flex-col items-center gap-1">
            <ArrowUp
              className="h-6 w-6 text-blue-600"
              style={{ transform: `rotate(${hour.windDirection}deg)` }}
            />
            <div className="text-sm">{hour.windSpeed}kt</div>
          </div>

          {/* Gust badge */}
          {hour.windGust > hour.windSpeed && (
            <Badge variant="outline" className="mb-2 px-1 py-0 text-xs">
              G{hour.windGust}
            </Badge>
          )}

          {/* Waves (optional if provided) */}
          {hour.waveHeight != null && (
            <div className="mt-2 flex flex-col items-center gap-1 border-t border-gray-200 pt-2">
              <Waves className="h-4 w-4 text-blue-500" />
              <div className="text-xs">{hour.waveHeight}ft</div>
              {hour.wavePeriod != null && (
                <div className="text-xs text-gray-500">{hour.wavePeriod}s</div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
