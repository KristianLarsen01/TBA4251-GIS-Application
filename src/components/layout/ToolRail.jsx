import { useLayers } from "../../context/LayersContext.jsx";
import { useDrawing } from "../../context/DrawingContext.jsx";

export default function ToolRail({
  onUploadClick,
  onToolClick,
  onShowTour,
  onDrawingToggle,
  tourActive,
  highlight,
}) {
  const { layers } = useLayers();
  const hasLayers = layers.length > 0;
  const { activeTool, toggleTool, stopDrawing } = useDrawing();

  const handleClick = (id) => {
    if (tourActive) return;

    // Tegneverktøy håndteres her, ikke via onToolClick
    if (id === "draw-point" || id === "draw-line" || id === "draw-polygon") {
      const nextTool = id === "draw-point" ? "point" : id === "draw-line" ? "line" : "polygon";
      const willActivate = activeTool !== nextTool;
      toggleTool(nextTool);
      onDrawingToggle?.(willActivate ? nextTool : null);
      return;
    }

    if (id === "upload") {
      onUploadClick?.();
      return;
    }

    // Buffer og andre analyseverktøy – disabled med feilmelding
    if (id === "buffer" || id === "intersect" || id === "union" || id === "difference" || id === "clip" || id === "areaFilter" || id === "featureExtractor") {
      stopDrawing();
      onToolClick?.(id);
      return;
    }
  };

  return (
    <aside
      className={`tool-rail ${highlight ? "tour-highlight-tools" : ""}`}
    >
      {/* UPLOAD */}
      <div className="tool-rail-group">
        <button
          className="tool-rail-button tool-rail-button-main"
          onClick={() => handleClick("upload")}
          title="Last opp – legg til ett eller flere GeoJSON-lag i kartet."
        >
          <span className="tool-rail-icon">⬆️</span>
          <span className="tool-rail-label">
            <span>Last opp</span>
          </span>
        </button>
      </div>

      {/* KARTTEGNING */}
      <div className="tool-rail-group">
        <button
          className={`tool-rail-button ${
            activeTool === "point" ? "tool-rail-button-active" : ""
          }`}
          onClick={() => handleClick("draw-point")}
          title="Punkt – klikk i kartet for å legge til et punktlag."
          aria-pressed={activeTool === "point"}
        >
          <span className="tool-rail-icon">●</span>
          <span className="tool-rail-label">
            <span>Punkt</span>
          </span>
        </button>

        <button
          className={`tool-rail-button ${
            activeTool === "line" ? "tool-rail-button-active" : ""
          }`}
          onClick={() => handleClick("draw-line")}
          title="Linje – klikk flere ganger i kartet, avslutt med dobbeltklikk eller Enter."
          aria-pressed={activeTool === "line"}
        >
          <span className="tool-rail-icon">〰️</span>
          <span className="tool-rail-label">
            <span>Linje</span>
          </span>
        </button>

        <button
          className={`tool-rail-button ${
            activeTool === "polygon" ? "tool-rail-button-active" : ""
          }`}
          onClick={() => handleClick("draw-polygon")}
          title="Polygon – klikk flere ganger i kartet, avslutt med dobbeltklikk eller Enter."
          aria-pressed={activeTool === "polygon"}
        >
          <span className="tool-rail-icon">▲</span>
          <span className="tool-rail-label">
            <span>Polygon</span>
          </span>
        </button>
      </div>

      {/* ANALYSEVERKTØY */}
      <div className="tool-rail-group">
        <button
          className="tool-rail-button"
          onClick={() => handleClick("areaFilter")}
          title="Area Filter – filtrer polygoner basert på arealstørrelse."
        >
          <span className="tool-rail-icon">▢</span>
          <span className="tool-rail-label">
            <span>Area Filter</span>
          </span>
        </button>

        <button
          className="tool-rail-button"
          onClick={() => handleClick("buffer")}
          title="Buffer – lag et nytt lag med buffer rundt valgt lag med valgt radius."
        >
          <span className="tool-rail-icon">⭘</span>
          <span className="tool-rail-label">
            <span>Buffer</span>
          </span>
        </button>

        <button
          className="tool-rail-button"
          onClick={() => handleClick("clip")}
          title="Clip – klipper objekter i ett lag mot et polygon i et annet lag (f.eks. klipp til kommunegrense)."
        >
          <span className="tool-rail-icon">✂</span>
          <span className="tool-rail-label">
            <span>Clip</span>
          </span>
        </button>

        <button
          className="tool-rail-button"
          onClick={() => handleClick("difference")}
          title="Difference – viser hva som gjenstår når ett polygonlag trekkes fra et annet (krever minst to polygonlag)."
        >
          <span className="tool-rail-icon">⊖</span>
          <span className="tool-rail-label">
            <span>Difference</span>
          </span>
        </button>

        <button
          className="tool-rail-button"
          onClick={() => handleClick("featureExtractor")}
          title="Feature Extractor – hent ut egenskaper og lag statistikk for valgte lag."
        >
          <span className="tool-rail-icon">🔍</span>
          <span className="tool-rail-label">
            <span>Feature</span>
            <span>Extractor</span>
          </span>
        </button>

        <button
          className="tool-rail-button"
          onClick={() => handleClick("intersect")}
          title="Intersect – finner overlapp mellom to polygonlag (krever minst to lag)."
        >
          <span className="tool-rail-icon">✖</span>
          <span className="tool-rail-label">
            <span>Intersect</span>
          </span>
        </button>

        <button
          className="tool-rail-button"
          onClick={() => handleClick("union")}
          title="Union – slår sammen to eller flere polygonlag til ett."
        >
          <span className="tool-rail-icon">U</span>
          <span className="tool-rail-label">
            <span>Union</span>
          </span>
        </button>
      </div>

      <div className="tool-rail-footer">
        <button
          className="tool-rail-tour-button"
          onClick={onShowTour}
          disabled={tourActive}
          title="Kjør omvisning i applikasjonen."
        >
          <div className="tool-rail-icon">🔁</div>
          <div className="tool-rail-label">
            <span>Omvisning</span>
          </div>
        </button>
      </div>
    </aside>
  );
}
