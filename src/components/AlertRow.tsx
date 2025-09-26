import { AlertTriangle } from "lucide-react";

interface AlertRowProps {
  type: "warning" | "statement";
  title: string;
  subtitle?: string;
}

export function AlertRow({ type, title, subtitle }: AlertRowProps) {
  return (
    <div className="flex items-start gap-3 p-3 border-b border-gray-100 last:border-b-0">
      <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        <div className="text-gray-900 mb-1">{title}</div>
        {subtitle && (
          <div className="text-gray-600 text-sm">{subtitle}</div>
        )}
      </div>
    </div>
  );
}