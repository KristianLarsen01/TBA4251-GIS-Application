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
import BufferPanel from "./components/tools/BufferPanel.jsx";
import IntersectPanel from "./components/tools/IntersectPanel.jsx";
import UnionPanel from "./components/tools/UnionPanel.jsx";
import DifferencePanel from "./components/tools/DifferencePanel.jsx";
import ClipPanel from "./components/tools/ClipPanel.jsx";
import AreaFilterPanel from "./components/tools/AreaFilterPanel.jsx";
import FeatureExtractorPanel from "./components/tools/FeatureExtractorPanel.jsx";
import tasks from "./data/tasks.js";
import { useTour } from "./hooks/useTour.js";
import { useDrawing } from "./context/DrawingContext.jsx";
import { useLayers } from "./context/LayersContext.jsx";

export default function App() {
  const [activeTaskIndex, setActiveTaskIndex] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [bufferOpen, setBufferOpen] = useState(false);
  const [intersectOpen, setIntersectOpen] = useState(false);
  const [unionOpen, setUnionOpen] = useState(false);
  const [differenceOpen, setDifferenceOpen] = useState(false);
  const [clipOpen, setClipOpen] = useState(false);
  const [areaFilterOpen, setAreaFilterOpen] = useState(false);
  const [featureExtractorOpen, setFeatureExtractorOpen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(false);

  const { stopDrawing, activeTool } = useDrawing();
  const { layers } = useLayers();

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
    stopDrawing();
    setUploadOpen(true);
    setBufferOpen(false);
    setIntersectOpen(false);
    setUnionOpen(false);
    setDifferenceOpen(false);
    setClipOpen(false);
    setAreaFilterOpen(false);
    setFeatureExtractorOpen(false);
  };

  const handleToolClick = (toolId) => {
    if (tourActive) return;

    // Avbryt eventuell tegning når andre verktøy brukes
    stopDrawing();

    // Lukk alle andre paneler
    const closePanels = () => {
      setUploadOpen(false);
      setBufferOpen(false);
      setIntersectOpen(false);
      setUnionOpen(false);
      setDifferenceOpen(false);
      setClipOpen(false);
      setAreaFilterOpen(false);
      setFeatureExtractorOpen(false);
    };

    closePanels();

    // Åpne riktig panel basert på verktøy
    if (toolId === "buffer") {
      setBufferOpen(true);
    } else if (toolId === "intersect") {
      setIntersectOpen(true);
    } else if (toolId === "union") {
      setUnionOpen(true);
    } else if (toolId === "difference") {
      setDifferenceOpen(true);
    } else if (toolId === "clip") {
      setClipOpen(true);
    } else if (toolId === "areaFilter") {
      setAreaFilterOpen(true);
    } else if (toolId === "featureExtractor") {
      setFeatureExtractorOpen(true);
    }
  };

  const handleNextTask = () => {
    setActiveTaskIndex((i) => (i < tasks.length - 1 ? i + 1 : i));
  };

  const handlePrevTask = () => {
    setActiveTaskIndex((i) => (i > 0 ? i - 1 : i));
  };

  const handleBackgroundClick = () => {
    if (tourActive) return;
    if (activeTool) return; // ikke steng paneler mens man tegner
    stopDrawing();
    setUploadOpen(false);
    setBufferOpen(false);
    setIntersectOpen(false);
    setUnionOpen(false);
    setDifferenceOpen(false);
    setClipOpen(false);
    setAreaFilterOpen(false);
    setFeatureExtractorOpen(false);
  };

  const handleRestartTour = () => {
    // Rydd opp litt før touren starter på nytt
    setUploadOpen(false);
    setBufferOpen(false);
    setIntersectOpen(false);
    setUnionOpen(false);
    setDifferenceOpen(false);
    setClipOpen(false);
    setAreaFilterOpen(false);
    setFeatureExtractorOpen(false);
    setLayersOpen(false);
    setTasksOpen(false);
    stopDrawing();
    startTour();
  };

  return (
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
          onDrawingToggle={() => {
            setUploadOpen(false);
            setBufferOpen(false);
            setIntersectOpen(false);
            setUnionOpen(false);
            setDifferenceOpen(false);
            setClipOpen(false);
            setAreaFilterOpen(false);
            setFeatureExtractorOpen(false);
          }}
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

          {intersectOpen && (
            <IntersectPanel onClose={() => setIntersectOpen(false)} />
          )}

          {unionOpen && (
            <UnionPanel onClose={() => setUnionOpen(false)} />
          )}

          {differenceOpen && (
            <DifferencePanel onClose={() => setDifferenceOpen(false)} />
          )}

          {clipOpen && (
            <ClipPanel onClose={() => setClipOpen(false)} />
          )}

          {areaFilterOpen && (
            <AreaFilterPanel onClose={() => setAreaFilterOpen(false)} />
          )}

          {featureExtractorOpen && (
            <FeatureExtractorPanel onClose={() => setFeatureExtractorOpen(false)} />
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
  );
}
