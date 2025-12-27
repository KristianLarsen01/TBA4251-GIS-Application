/*
  Hensikt:
  Dette er “dirigenten” i applikasjonen. Her bestemmer jeg hvilke paneler som er åpne,
  hvilken oppgave brukeren er på, og jeg setter sammen toppbar, verktøylinje, kart og sidepanel.

  Eksterne ting (hvorfor og hvordan):
  - Leaflet og Turf brukes ikke direkte her, men App skrur på paneler som igjen bruker dem.
  - Jeg bruker useState/useEffect (hooks) for å holde styr på hva som er åpent og valgt.

  Min kode vs bibliotek:
  - All “hvem-er-åpen-når”-logikk og oppsett av komponenter er skrevet av meg.
  - Hook-funksjonene (useState/useEffect) kommer fra rammeverket.
*/

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
import DissolvePanel from "./components/tools/DissolvePanel.jsx";
import tasks from "./data/tasks.js";
import { useTour } from "./hooks/useTour.js";
import { useDrawing } from "./context/DrawingContext.jsx";
import { useLayers } from "./context/LayersContext.jsx";

export default function App() {
  /* ------------------------------------------------------
     UI-tilstand (hva som er åpent akkurat nå)
     ------------------------------------------------------ */
  const [activeTaskIndex, setActiveTaskIndex] = useState(0);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [bufferOpen, setBufferOpen] = useState(false);
  const [intersectOpen, setIntersectOpen] = useState(false);
  const [unionOpen, setUnionOpen] = useState(false);
  const [differenceOpen, setDifferenceOpen] = useState(false);
  const [clipOpen, setClipOpen] = useState(false);
  const [areaFilterOpen, setAreaFilterOpen] = useState(false);
  const [featureExtractorOpen, setFeatureExtractorOpen] = useState(false);
  const [dissolveOpen, setDissolveOpen] = useState(false);

  const [layersOpen, setLayersOpen] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(false);

  const { stopDrawing, activeTool } = useDrawing();
  const { editableLayerId, setEditableLayerId } = useLayers();

  /* ------------------------------------------------------
     Mobil-advarsel
     (Dette er ikke en “feil”, bare et lite varsel om at små skjermer kan bli trangt.)
     ------------------------------------------------------ */
  const [showMobileWarning, setShowMobileWarning] = useState(
    () => window.innerWidth < 900
  );

  /* ------------------------------------------------------
     Tour / omvisning
    useTour er min egen hook som styrer hvilken del av UI som skal highlightes.
     ------------------------------------------------------ */
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

    /* ------------------ Små hjelpefunksjoner ------------------
      Her har jeg bare litt “rydd i UI”-funksjoner.
      ---------------------------------------------------------- */

  const closeAllToolPanels = () => {
    setUploadOpen(false);
    setBufferOpen(false);
    setIntersectOpen(false);
    setUnionOpen(false);
    setDifferenceOpen(false);
    setClipOpen(false);
    setAreaFilterOpen(false);
    setFeatureExtractorOpen(false);
    setDissolveOpen(false);
  };

  const exitEditMode = () => {
    if (editableLayerId) setEditableLayerId(null);
  };

  const enterNonEditInteraction = () => {
    // Alt som ikke er redigering skal avslutte redigering
    exitEditMode();
  };

    /* ------------------ Handlers (klikk og knappetrykk) ------------------
      Her bestemmer jeg hva som skjer når bruker trykker på knapper.
      --------------------------------------------------------------- */

  const handleUploadClick = () => {
    if (tourActive) return;
    enterNonEditInteraction();
    stopDrawing();
    closeAllToolPanels();
    setUploadOpen(true);
  };

  const handleToolClick = (toolId) => {
    if (tourActive) return;

    enterNonEditInteraction();
    stopDrawing();
    closeAllToolPanels();

    if (toolId === "buffer") setBufferOpen(true);
    else if (toolId === "intersect") setIntersectOpen(true);
    else if (toolId === "union") setUnionOpen(true);
    else if (toolId === "difference") setDifferenceOpen(true);
    else if (toolId === "clip") setClipOpen(true);
    else if (toolId === "areaFilter") setAreaFilterOpen(true);
    else if (toolId === "featureExtractor") setFeatureExtractorOpen(true);
    else if (toolId === "dissolve") setDissolveOpen(true);
  };

  const handleNextTask = () => {
    setActiveTaskIndex((i) => (i < tasks.length - 1 ? i + 1 : i));
  };

  const handlePrevTask = () => {
    setActiveTaskIndex((i) => (i > 0 ? i - 1 : i));
  };

  const handleBackgroundClick = () => {
    if (tourActive) return;
    if (activeTool) return;

    // Hvis du redigerer et lag: la kartet være i fred
    if (editableLayerId) return;

    stopDrawing();
    closeAllToolPanels();
  };

  const handleRestartTour = () => {
    closeAllToolPanels();
    setLayersOpen(false);
    setTasksOpen(false);
    setDissolveOpen(false);
    stopDrawing();
    exitEditMode();
    startTour();
  };

  return (
    /*
      UI-oppsettet er:
      - Header øverst
      - Venstre: ToolRail
      - Midten: kart (MapContainer) + flytende tool-paneler
      - Høyre: lagpanel + oppgavepanel
      - Over alt: onboarding/tour når den er aktiv
    */
    <div className={`app-shell ${tourActive ? "tour-active" : ""}`}>
      <Header currentStep={activeTaskIndex + 1} totalSteps={tasks.length} />

      <div className="app-main">
        <ToolRail
          onUploadClick={handleUploadClick}
          onToolClick={handleToolClick}
          onShowTour={handleRestartTour}
          onDrawingToggle={() => {
            if (tourActive) return;
            // Start/bruk tegning → avslutt redigering og lukk paneler
            enterNonEditInteraction();
            closeAllToolPanels();
          }}
          tourActive={tourActive}
          highlight={highlightTools}
        />

        <div
          className={`map-column ${highlightMap ? "tour-highlight-map" : ""}`}
          onClick={handleBackgroundClick}
        >
          <MapContainer />

          {uploadOpen && <UploadPanel onClose={() => setUploadOpen(false)} />}
          {bufferOpen && <BufferPanel onClose={() => setBufferOpen(false)} />}
          {intersectOpen && (
            <IntersectPanel onClose={() => setIntersectOpen(false)} />
          )}
          {unionOpen && <UnionPanel onClose={() => setUnionOpen(false)} />}
          {differenceOpen && (
            <DifferencePanel onClose={() => setDifferenceOpen(false)} />
          )}
          {clipOpen && <ClipPanel onClose={() => setClipOpen(false)} />}
          {areaFilterOpen && (
            <AreaFilterPanel onClose={() => setAreaFilterOpen(false)} />
          )}
          {featureExtractorOpen && (
            <FeatureExtractorPanel
              onClose={() => setFeatureExtractorOpen(false)}
            />
          )}
          {dissolveOpen && <DissolvePanel onClose={() => setDissolveOpen(false)} />}
        </div>

        {/* Lag- og oppgavepanel */}
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

            <div className={`panel-shell-content ${layersOpen ? "open" : ""}`}>
              <LayersPanel
                onClose={() => setLayersOpen(false)}
                highlight={highlightLayers}
                tourStep={tourStep}
                onEnterEditMode={() => {
                  if (tourActive) return;
                  // Når redigering aktiveres: lukk alt som kan dekke popupen
                  stopDrawing();
                  closeAllToolPanels();
                }}
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

            <div className={`panel-shell-content ${tasksOpen ? "open" : ""}`}>
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
        <IntroModal step={tourStep} onNext={advanceTour} onSkip={skipTour} />
      )}

      {tourStep !== null && tourStep >= 2 && (
        <TourOverlay step={tourStep} onNext={advanceTour} onSkip={skipTour} />
      )}

      {/* Mobil-advarsel */}
      {showMobileWarning && (
        <div className="modal-backdrop mobile-warning-backdrop">
          <div className="modal mobile-warning-modal">
            <div className="modal-header">
              <h2>FotballGIS er laget for PC</h2>
              <button
                className="modal-close"
                onClick={() => setShowMobileWarning(false)}
                aria-label="Lukk"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>
                Denne applikasjonen er designet for bruk på datamaskin med stor
                skjerm. Enkelte elementer kan bli vanskelige å bruke på mobil
                eller nettbrett.
              </p>
              <p>
                Hvis du har mulighet anbefales det å åpne siden på en PC eller
                laptop.
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-primary"
                onClick={() => setShowMobileWarning(false)}
              >
                Forstått – fortsett likevel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
