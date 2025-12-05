import { useState } from "react";
import Header from "./components/layout/Header.jsx";
import ToolRail from "./components/layout/ToolRail.jsx";
import MapContainer from "./components/layout/MapContainer.jsx";
import TaskPanel from "./components/layout/TaskPanel.jsx";
import tasks from "./data/tasks.js";
import { LayersProvider } from "./context/LayersContext.jsx";

export default function App() {
  const [activeTaskIndex, setActiveTaskIndex] = useState(0);
  const [toolMessage, setToolMessage] = useState(null);

  const currentTask = tasks[activeTaskIndex];

  const handleUploadClick = () => {
    setToolMessage(
      "Her skal du senere kunne dra og slippe GeoJSON-filer (TrondheimKommune, Personer, Fotballbaner, Kollektiv)."
    );
  };

  const handleToolClick = (toolId) => {
    if (toolId === "difference") {
      setToolMessage(
        "Difference krever minst to lag med polygon-geometrier. Når vi har fått på plass data og analyse, kan du bruke verktøyet for å se hva som blir igjen når et lag trekkes fra et annet."
      );
    } else {
      setToolMessage(
        `Verktøyet «${toolId}» blir implementert i neste steg av prosjektet (med Turf.js). Nå bruker vi det mest som en visuell del av arbeidsflyten.`
      );
    }
  };

  const handleNextTask = () => {
    setActiveTaskIndex((i) => (i < tasks.length - 1 ? i + 1 : i));
  };

  const handlePrevTask = () => {
    setActiveTaskIndex((i) => (i > 0 ? i - 1 : i));
  };

  return (
    <LayersProvider>
      <div className="app-shell">
        <Header
          currentStep={activeTaskIndex + 1}
          totalSteps={tasks.length}
        />

        <div className="app-main">
          <ToolRail
            onUploadClick={handleUploadClick}
            onToolClick={handleToolClick}
          />

          <div className="map-column">
            <MapContainer />

            {toolMessage && (
              <div className="tool-message">
                <div className="tool-message-text">{toolMessage}</div>
                <button
                  className="tool-message-close"
                  onClick={() => setToolMessage(null)}
                >
                  ×
                </button>
              </div>
            )}
          </div>

          <TaskPanel
            task={currentTask}
            index={activeTaskIndex}
            total={tasks.length}
            onNext={handleNextTask}
            onPrev={handlePrevTask}
          />
        </div>
      </div>
    </LayersProvider>
  );
}
