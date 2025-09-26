import { Badge } from "./ui/badge";

interface LegCardProps {
  from: string;
  to: string;
  distance: string;
  window: string;
  comfort: string;
  status: "green" | "yellow" | "red";
  onClick: () => void;
}

export function LegCard({ from, to, distance, window, comfort, status, onClick }: LegCardProps) {
  const statusColors = {
    green: "bg-green-500",
    yellow: "bg-yellow-500", 
    red: "bg-red-500"
  };

  return (
    <div 
      className="flex items-center justify-between p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
      onClick={onClick}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-gray-900">{from} → {to}</span>
          <span className="text-gray-500 text-sm">({distance})</span>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-xs">
            Window: {window}
          </Badge>
          <Badge variant="outline" className="text-xs">
            Comfort: {comfort}
          </Badge>
        </div>
      </div>
      <div className={`w-3 h-3 rounded-full ${statusColors[status]} ml-3`}></div>
    </div>
  );
}