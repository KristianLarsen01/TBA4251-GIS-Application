// src/components/layout/ToolRail.jsx

export default function ToolRail({
  onUploadClick,
  onToolClick,
  onShowTour,
  tourActive,
  highlight,
}) {
  const handleClick = (id) => {
    if (id === "upload") {
      onUploadClick?.();
    } else {
      onToolClick?.(id);
    }
  };

  return (
    <aside
      className={`tool-rail ${highlight ? "tour-highlight-tools" : ""}`}>
      <div className="tool-rail-group">
        <button
          className="tool-rail-button tool-rail-button-main"
          onClick={() => handleClick("upload")}
        >
          <span className="tool-rail-icon">⬆️</span>
          <span className="tool-rail-label">
            <span>Last opp</span>
          </span>
        </button>

        <button
          className="tool-rail-button"
          onClick={() => handleClick("buffer")}
        >
          <span className="tool-rail-icon">⭘</span>
          <span className="tool-rail-label">
            <span>Buffer</span>
          </span>
        </button>

        <button
          className="tool-rail-button"
          onClick={() => handleClick("intersect")}
        >
          <span className="tool-rail-icon">✖</span>
          <span className="tool-rail-label">
            <span>Intersect</span>
          </span>
        </button>

        <button
          className="tool-rail-button"
          onClick={() => handleClick("union")}
        >
          <span className="tool-rail-icon">U</span>
          <span className="tool-rail-label">
            <span>Union</span>
          </span>
        </button>

        <button
          className="tool-rail-button"
          onClick={() => handleClick("difference")}
        >
          <span className="tool-rail-icon">⊖</span>
          <span className="tool-rail-label">
            <span>Difference</span>
          </span>
        </button>

        <button
          className="tool-rail-button"
          onClick={() => handleClick("clip")}
        >
          <span className="tool-rail-icon">✂</span>
          <span className="tool-rail-label">
            <span>Clip</span>
          </span>
        </button>

        <button
          className="tool-rail-button"
          onClick={() => handleClick("areaFilter")}
        >
          <span className="tool-rail-icon">▢</span>
          <span className="tool-rail-label">
            <span>Area Filter</span>
          </span>
        </button>

        <button
          className="tool-rail-button"
          onClick={() => handleClick("featureExtractor")}
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
