// src/App.jsx
import { useState } from "react";
import Header from "./components/layout/Header.jsx";
import ToolRail from "./components/layout/ToolRail.jsx";
import MapContainer from "./components/layout/MapContainer.jsx";
import TaskPanel from "./components/layout/TaskPanel.jsx";
import LayersPanel from "./components/layout/LayersPanel.jsx";
import UploadPanel from "./components/upload/UploadPanel.jsx";
import IntroModal from "./components/onboarding/IntroModal.jsx";
import TourOverlay from "./components/onboarding/TourOverlay.jsx";
import BufferPanel from "./components/tools/BufferPanel.jsx"; // NYTT
import tasks from "./data/tasks.js";
import { LayersProvider } from "./context/LayersContext.jsx";
import { useTour } from "./hooks/useTour.js";

export default function App() {
  const [activeTaskIndex, setActiveTaskIndex] = useState(0);
  const [toolMessage, setToolMessage] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [bufferOpen, setBufferOpen] = useState(false); // NYTT
  const [layersOpen, setLayersOpen] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(false);

  // Tour-logikk flyttet til egen hook
  const {
    tourStep,
    tourActive,
    highlightMap,
    highlightTools,
    highlightLayers,
    highlightTasks,
    advanceTour,
    skipTour,
    startTour,
  } = useTour({ setLayersOpen, setTasksOpen });

  const currentTask = tasks[activeTaskIndex];

  const handleUploadClick = () => {
    if (tourActive) return;
    setUploadOpen(true);
    setBufferOpen(false); // sørg for at kun ett panel er åpent av gangen
    setToolMessage(null);
  };

  const handleToolClick = (toolId) => {
    if (tourActive) return;

    // Buffer får sitt eget panel
    if (toolId === "buffer") {
      setBufferOpen(true);
      setUploadOpen(false);
      setToolMessage(null);
      return;
    }

    // Andre verktøy er fortsatt "dummy" inntil videre
    if (toolId === "difference") {
      setToolMessage(
        "Difference krever minst to lag med polygon-geometrier. Senere kan du bruke verktøyet til å se hva som blir igjen når et lag trekkes fra et annet."
      );
    } else {
      setToolMessage(
        `Verktøyet «${toolId}» blir koblet til faktiske GIS-operasjoner senere i prosjektet. Nå bruker du det som en del av arbeidsflyten.`
      );
    }

    setBufferOpen(false);
  };

  const handleNextTask = () => {
    setActiveTaskIndex((i) => (i < tasks.length - 1 ? i + 1 : i));
  };

  const handlePrevTask = () => {
    setActiveTaskIndex((i) => (i > 0 ? i - 1 : i));
  };

  const handleBackgroundClick = () => {
    if (tourActive) return;
    setUploadOpen(false);
    setBufferOpen(false);
    setToolMessage(null);
  };

  const handleRestartTour = () => {
    // Rydd opp litt før touren starter på nytt
    setToolMessage(null);
    setUploadOpen(false);
    setBufferOpen(false);
    setLayersOpen(false);
    setTasksOpen(false);
    startTour();
  };

  return (
    <LayersProvider>
      <div className={`app-shell ${tourActive ? "tour-active" : ""}`}>
        <Header
          currentStep={activeTaskIndex + 1}
          totalSteps={tasks.length}
        />

        <div className="app-main">
          <ToolRail
            onUploadClick={handleUploadClick}
            onToolClick={handleToolClick}
            onShowTour={handleRestartTour}
            tourActive={tourActive}
            highlight={highlightTools}
          />

          <div
            className={`map-column ${
              highlightMap ? "tour-highlight-map" : ""
            }`}
            onClick={handleBackgroundClick}
          >
            <MapContainer />

            {uploadOpen && (
              <UploadPanel onClose={() => setUploadOpen(false)} />
            )}

            {bufferOpen && (
              <BufferPanel onClose={() => setBufferOpen(false)} />
            )}

            {toolMessage && (
              <div
                className="tool-message"
                onClick={(e) => e.stopPropagation()}
              >
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

          {/* Lag- og oppgavepanel som søsken til kartet */}
          <div
            className={`top-right-panels ${
              tasksOpen ? "tasks-open" : "tasks-closed"
            } ${highlightLayers || highlightTasks ? "tour-highlight-root" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Lag */}
            <div className="panel-shell">
              <button
                className={`panel-toggle-btn ${
                  layersOpen ? "panel-toggle-active" : ""
                }`}
                onClick={() => {
                  if (tourActive) return;
                  setLayersOpen((open) => !open);
                }}
              >
                Lag
              </button>

              <div
                className={`panel-shell-content ${
                  layersOpen ? "open" : ""
                }`}
              >
                <LayersPanel
                  onClose={() => setLayersOpen(false)}
                  highlight={highlightLayers}
                />
              </div>
            </div>

            {/* Oppgave */}
            <div className="panel-shell">
              <button
                className={`panel-toggle-btn ${
                  tasksOpen ? "panel-toggle-active" : ""
                }`}
                onClick={() => {
                  if (tourActive) return;
                  setTasksOpen((open) => !open);
                }}
              >
                Oppgave
              </button>

              <div
                className={`panel-shell-content ${
                  tasksOpen ? "open" : ""
                }`}
              >
                {currentTask && (
                  <TaskPanel
                    task={currentTask}
                    index={activeTaskIndex}
                    total={tasks.length}
                    onNext={handleNextTask}
                    onPrev={handlePrevTask}
                    onClose={() => setTasksOpen(false)}
                    highlight={highlightTasks}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Onboarding */}
        {(tourStep === 0 || tourStep === 1) && (
          <IntroModal
            step={tourStep}
            onNext={advanceTour}
            onSkip={skipTour}
          />
        )}

        {tourStep !== null && tourStep >= 2 && (
          <TourOverlay
            step={tourStep}
            onNext={advanceTour}
            onSkip={skipTour}
          />
        )}
      </div>
    </LayersProvider>
  );
}
