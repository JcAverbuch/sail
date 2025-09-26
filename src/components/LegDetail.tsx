import { ArrowLeft, Clock, Wind, Waves, MapPin, Navigation } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ForecastStrip } from "./ForecastStrip";
import { Badge } from "./ui/badge";

interface LegDetailProps {
  onBack: () => void;
  legId: string | null;
}

export function LegDetail({ onBack, legId }: LegDetailProps) {
  // Comprehensive leg data for all legs
  const allLegsData = {
    "1": {
      from: { name: "San Diego", lat: 32.7157, lon: -117.1611 },
      to: { name: "Oceanside", lat: 33.1958, lon: -117.3831 },
      midpoint: { name: "Del Mar", lat: 32.9595, lon: -117.2661 },
      distance: "35 nm est",
      duration: "6-8h"
    },
    "2": {
      from: { name: "Oceanside", lat: 33.1958, lon: -117.3831 },
      to: { name: "Two Harbors", lat: 33.4447, lon: -118.4895 },
      midpoint: { name: "Mid-Channel", lat: 33.3203, lon: -117.9363 },
      distance: "42 nm est",
      duration: "8-10h"
    },
    "3": {
      from: { name: "Two Harbors", lat: 33.4447, lon: -118.4895 },
      to: { name: "Marina del Rey", lat: 33.9806, lon: -118.4494 },
      midpoint: { name: "Redondo Canyon", lat: 33.7127, lon: -118.4695 },
      distance: "28 nm est",
      duration: "5-7h"
    }
  };

  // Default to leg 2 if no legId provided
  const currentLegId = legId || "2";
  const legData = allLegsData[currentLegId as keyof typeof allLegsData] || allLegsData["2"];

  // Forecast locations with detailed data
  const forecastLocations = [
    {
      name: `${legData.from.name} (Start)`,
      coordinates: `${legData.from.lat.toFixed(3)}°N, ${Math.abs(legData.from.lon).toFixed(3)}°W`,
      forecast: [
        { time: "08:00", windSpeed: 12, windGust: 15, windDirection: 45, waveHeight: 3, wavePeriod: 8 },
        { time: "09:00", windSpeed: 14, windGust: 18, windDirection: 60, waveHeight: 4, wavePeriod: 9 },
        { time: "10:00", windSpeed: 16, windGust: 20, windDirection: 75, waveHeight: 4, wavePeriod: 9 },
        { time: "11:00", windSpeed: 18, windGust: 22, windDirection: 90, waveHeight: 5, wavePeriod: 10 },
        { time: "12:00", windSpeed: 20, windGust: 25, windDirection: 105, waveHeight: 5, wavePeriod: 10 }
      ]
    },
    {
      name: `${legData.midpoint.name}`,
      coordinates: `${legData.midpoint.lat.toFixed(3)}°N, ${Math.abs(legData.midpoint.lon).toFixed(3)}°W`,
      forecast: [
        { time: "08:00", windSpeed: 15, windGust: 18, windDirection: 50, waveHeight: 4, wavePeriod: 9 },
        { time: "09:00", windSpeed: 17, windGust: 21, windDirection: 65, waveHeight: 5, wavePeriod: 10 },
        { time: "10:00", windSpeed: 19, windGust: 23, windDirection: 80, waveHeight: 6, wavePeriod: 11 },
        { time: "11:00", windSpeed: 21, windGust: 26, windDirection: 95, waveHeight: 6, wavePeriod: 11 },
        { time: "12:00", windSpeed: 23, windGust: 29, windDirection: 110, waveHeight: 7, wavePeriod: 12 }
      ]
    },
    {
      name: `${legData.to.name} (End)`,
      coordinates: `${legData.to.lat.toFixed(3)}°N, ${Math.abs(legData.to.lon).toFixed(3)}°W`,
      forecast: [
        { time: "08:00", windSpeed: 10, windGust: 13, windDirection: 40, waveHeight: 2, wavePeriod: 7 },
        { time: "09:00", windSpeed: 12, windGust: 16, windDirection: 55, waveHeight: 3, wavePeriod: 8 },
        { time: "10:00", windSpeed: 14, windGust: 18, windDirection: 70, waveHeight: 3, wavePeriod: 8 },
        { time: "11:00", windSpeed: 16, windGust: 20, windDirection: 85, waveHeight: 4, wavePeriod: 9 },
        { time: "12:00", windSpeed: 18, windGust: 23, windDirection: 100, waveHeight: 4, wavePeriod: 9 }
      ]
    }
  ];

  // Different buoy data for each leg
  const buoyDataByLeg = {
    "1": [ // San Diego to Oceanside
      {
        id: "46232",
        name: "Point Loma South",
        location: "32.610°N 117.391°W",
        distance: "8 nm SW",
        lastUpdate: "14:50 PST",
        conditions: {
          windSpeed: 14, windGust: 18, windDirection: 270,
          waveHeight: 4.2, dominantWavePeriod: 9, averageWavePeriod: 7.5,
          windWaveHeight: 2.1, windWavePeriod: 5, swellHeight: 3.2,
          swellPeriod: 12, swellDirection: 275, waterTemp: 68
        }
      },
      {
        id: "46086",
        name: "San Clemente Basin",
        location: "33.749°N 119.053°W",
        distance: "25 nm NW",
        lastUpdate: "14:50 PST",
        conditions: {
          windSpeed: 16, windGust: 21, windDirection: 285,
          waveHeight: 5.1, dominantWavePeriod: 10, averageWavePeriod: 8.2,
          windWaveHeight: 2.8, windWavePeriod: 6, swellHeight: 3.9,
          swellPeriod: 13, swellDirection: 280, waterTemp: 66
        }
      }
    ],
    "2": [ // Oceanside to Two Harbors
      {
        id: "46086",
        name: "San Clemente Basin",
        location: "33.749°N 119.053°W",
        distance: "12 nm SW",
        lastUpdate: "14:50 PST",
        conditions: {
          windSpeed: 18, windGust: 23, windDirection: 285,
          waveHeight: 6.2, dominantWavePeriod: 11, averageWavePeriod: 8.5,
          windWaveHeight: 3.1, windWavePeriod: 6, swellHeight: 4.8,
          swellPeriod: 14, swellDirection: 285, waterTemp: 64
        }
      },
      {
        id: "46025",
        name: "Santa Monica Bay",
        location: "33.749°N 119.053°W",
        distance: "8 nm E",
        lastUpdate: "14:50 PST",
        conditions: {
          windSpeed: 15, windGust: 19, windDirection: 270,
          waveHeight: 4.8, dominantWavePeriod: 9, averageWavePeriod: 7.2,
          windWaveHeight: 2.3, windWavePeriod: 5, swellHeight: 3.6,
          swellPeriod: 12, swellDirection: 280, waterTemp: 66
        }
      },
      {
        id: "46221",
        name: "Santa Barbara",
        location: "34.274°N 120.856°W",
        distance: "45 nm N",
        lastUpdate: "14:50 PST",
        conditions: {
          windSpeed: 22, windGust: 28, windDirection: 315,
          waveHeight: 7.1, dominantWavePeriod: 13, averageWavePeriod: 9.8,
          windWaveHeight: 4.2, windWavePeriod: 7, swellHeight: 5.8,
          swellPeriod: 16, swellDirection: 300, waterTemp: 62
        }
      }
    ],
    "3": [ // Two Harbors to Marina del Rey
      {
        id: "46025",
        name: "Santa Monica Bay",
        location: "33.749°N 119.053°W",
        distance: "5 nm E",
        lastUpdate: "14:50 PST",
        conditions: {
          windSpeed: 20, windGust: 26, windDirection: 285,
          waveHeight: 6.8, dominantWavePeriod: 12, averageWavePeriod: 9.1,
          windWaveHeight: 3.8, windWavePeriod: 7, swellHeight: 5.2,
          swellPeriod: 15, swellDirection: 290, waterTemp: 65
        }
      },
      {
        id: "46222",
        name: "San Pedro",
        location: "33.618°N 118.317°W",
        distance: "12 nm SE",
        lastUpdate: "14:50 PST",
        conditions: {
          windSpeed: 24, windGust: 31, windDirection: 300,
          waveHeight: 7.5, dominantWavePeriod: 14, averageWavePeriod: 10.2,
          windWaveHeight: 4.5, windWavePeriod: 8, swellHeight: 6.1,
          swellPeriod: 17, swellDirection: 305, waterTemp: 63
        }
      }
    ]
  };

  const buoyData = buoyDataByLeg[currentLegId as keyof typeof buoyDataByLeg] || buoyDataByLeg["2"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={onBack}
          className="p-2"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl">{legData.from.name} → {legData.to.name}</h1>
          <p className="text-sm text-gray-600">{legData.distance} • {legData.duration} duration</p>
        </div>
      </div>

      {/* Route Forecasts */}
      <div className="space-y-4">
        <h2 className="text-lg">Route Forecasts</h2>
        {forecastLocations.map((location, index) => (
          <Card key={index}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    {location.name}
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">{location.coordinates}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ForecastStrip forecast={location.forecast} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Buoy Conditions */}
      <div className="space-y-4">
        <h2 className="text-lg">Buoy Conditions</h2>
        {buoyData.map((buoy) => (
          <Card key={buoy.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-blue-600" />
                    {buoy.name}
                    <Badge variant="secondary" className="text-xs">{buoy.id}</Badge>
                  </CardTitle>
                  <p className="text-sm text-gray-600">{buoy.location} • {buoy.distance}</p>
                  <p className="text-xs text-gray-500">Last obs: {buoy.lastUpdate}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Conditions Grid */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="flex items-center justify-center mb-1">
                    <Wind className="w-4 h-4 text-gray-600" />
                  </div>
                  <div className="font-medium">{buoy.conditions.windSpeed}kt</div>
                  <div className="text-xs text-gray-600">
                    G{buoy.conditions.windGust} @ {buoy.conditions.windDirection}°
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-center mb-1">
                    <Waves className="w-4 h-4 text-gray-600" />
                  </div>
                  <div className="font-medium">{buoy.conditions.waveHeight}ft</div>
                  <div className="text-xs text-gray-600">
                    {buoy.conditions.dominantWavePeriod}s period
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-center mb-1">
                    <div className="w-4 h-4 rounded-full bg-blue-400"></div>
                  </div>
                  <div className="font-medium">{buoy.conditions.waterTemp}°F</div>
                  <div className="text-xs text-gray-600">Water temp</div>
                </div>
              </div>

              {/* Swell Details */}
              <div className="border-t pt-3">
                <h4 className="text-sm mb-2">Swell Breakdown</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600">Primary Swell</div>
                    <div>{buoy.conditions.swellHeight}ft @ {buoy.conditions.swellPeriod}s</div>
                    <div className="text-xs text-gray-500">from {buoy.conditions.swellDirection}°</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Wind Waves</div>
                    <div>{buoy.conditions.windWaveHeight}ft @ {buoy.conditions.windWavePeriod}s</div>
                    <div className="text-xs text-gray-500">local generation</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button className="w-full bg-blue-600 hover:bg-blue-700">
          Check Window
        </Button>
        <Button variant="outline" className="w-full">
          See Alternate Harbor
        </Button>
      </div>

      {/* Sources */}
      <p className="text-xs text-gray-500 text-center mt-6">
        Sources: NWS Marine Forecasts, NDBC Buoy Network
      </p>
    </div>
  );
}