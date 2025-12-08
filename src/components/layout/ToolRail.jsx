import { useLayers } from "../../context/LayersContext.jsx";

export default function ToolRail({
  onUploadClick,
  onToolClick,
  onShowTour,
  tourActive,
  highlight,
}) {
  const { layers } = useLayers();
  const hasLayers = layers.length > 0;

  const handleClick = (id) => {
    if (tourActive) return;

    if (id === "upload") {
      onUploadClick?.();
    } else {
      if (id === "buffer" && !hasLayers) return; // buffer krever lag
      onToolClick?.(id);
    }
  };

  const bufferTitle = hasLayers
    ? "Buffer – lag et nytt lag med buffer rundt valgt lag med valgt radius."
    : "Buffer (deaktivert) – trenger minst ett lag i kartet for å kunne lage buffer.";

  return (
    <aside
      className={`tool-rail ${highlight ? "tour-highlight-tools" : ""}`}
    >
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

        <button
          className={`tool-rail-button ${
            hasLayers ? "tool-rail-button-buffer-ready" : "tool-rail-button-disabled"
          }`}
          onClick={() => handleClick("buffer")}
          disabled={!hasLayers}
          title={bufferTitle}
        >
          <span className="tool-rail-icon">⭘</span>
          <span className="tool-rail-label">
            <span>Buffer</span>
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
          onClick={() => handleClick("featureExtractor")}
          title="Feature Extractor – hent ut egenskaper og lag statistikk for valgte lag."
        >
          <span className="tool-rail-icon">🔍</span>
          <span className="tool-rail-label">
            <span>Feature</span>
            <span>Extractor</span>
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
