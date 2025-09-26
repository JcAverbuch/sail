import { Badge } from "./ui/badge";

interface RiskBadgeProps {
  level: "LOW" | "ELEVATED" | "HIGH";
}

export function RiskBadge({ level }: RiskBadgeProps) {
  const styles = {
    LOW: "bg-green-100 text-green-800 border-green-200",
    ELEVATED: "bg-yellow-100 text-yellow-800 border-yellow-200", 
    HIGH: "bg-red-100 text-red-800 border-red-200"
  };

  return (
    <Badge className={`${styles[level]} px-3 py-1 border`}>
      {level}
    </Badge>
  );
}