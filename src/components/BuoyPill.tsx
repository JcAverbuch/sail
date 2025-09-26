import { Badge } from "./ui/badge";

interface BuoyPillProps {
  buoyId: string;
  onClick: () => void;
}

export function BuoyPill({ buoyId, onClick }: BuoyPillProps) {
  return (
    <Badge 
      variant="secondary" 
      className="cursor-pointer hover:bg-gray-200 transition-colors px-3 py-1"
      onClick={onClick}
    >
      {buoyId}
    </Badge>
  );
}