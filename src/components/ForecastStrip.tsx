import { ArrowUp, Waves } from "lucide-react";
import { Badge } from "./ui/badge";

interface ForecastHour {
  time: string;
  windSpeed: number;
  windGust: number;
  windDirection: number; // degrees
  waveHeight?: number; // optional for backward compatibility
  wavePeriod?: number; // optional for backward compatibility
}

interface ForecastStripProps {
  forecast: ForecastHour[];
}

export function ForecastStrip({ forecast }: ForecastStripProps) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {forecast.map((hour, index) => (
        <div key={index} className="flex-shrink-0 text-center min-w-[90px]">
          <div className="text-xs text-gray-600 mb-2">{hour.time}</div>
          
          {/* Wind Section */}
          <div className="flex flex-col items-center gap-1 mb-2">
            <ArrowUp 
              className="w-6 h-6 text-blue-600" 
              style={{ transform: `rotate(${hour.windDirection}deg)` }}
            />
            <div className="text-sm">{hour.windSpeed}kt</div>
          </div>
          
          {/* Wind Gust Badge */}
          {hour.windGust > hour.windSpeed && (
            <Badge variant="outline" className="text-xs px-1 py-0 mb-2">
              G{hour.windGust}
            </Badge>
          )}
          
          {/* Wave Section (if available) */}
          {hour.waveHeight && (
            <div className="flex flex-col items-center gap-1 mt-2 pt-2 border-t border-gray-200">
              <Waves className="w-4 h-4 text-blue-500" />
              <div className="text-xs">{hour.waveHeight}ft</div>
              {hour.wavePeriod && (
                <div className="text-xs text-gray-500">{hour.wavePeriod}s</div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}