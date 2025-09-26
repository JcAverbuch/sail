import { useState } from "react";
import { TripOverview } from "./components/TripOverview";
import { LegDetail } from "./components/LegDetail";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<"overview" | "detail">("overview");
  const [selectedLeg, setSelectedLeg] = useState<string | null>(null);

  const handleLegSelect = (legId: string) => {
    setSelectedLeg(legId);
    setCurrentScreen("detail");
  };

  const handleBack = () => {
    setCurrentScreen("overview");
    setSelectedLeg(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto bg-white min-h-screen">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 sticky top-0 z-10">
          <h1 className="text-center">SoCal Sailing Agent</h1>
        </div>

        {/* Content */}
        <div className="p-4">
          {currentScreen === "overview" ? (
            <TripOverview onLegSelect={handleLegSelect} />
          ) : (
            <LegDetail onBack={handleBack} legId={selectedLeg} />
          )}
        </div>
        <div className="text-center text-muted-foreground">
            <a href="https://www.isjuliatoast.com/"><u>Other expedition hacking projects.</u></a>
          </div>
      </div>
    </div>
  );
}