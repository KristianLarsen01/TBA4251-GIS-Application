// src/components/tools/FeatureExtractorPanel.jsx
import { useLayers } from "../../context/LayersContext.jsx";

export default function FeatureExtractorPanel({ onClose }) {
  const { layers } = useLayers();
  const hasLayers = Array.isArray(layers) && layers.length > 0;

  return (
    <div className="tool-panel" onClick={(e) => e.stopPropagation()}>
      <div className="tool-panel-header">
        <h3>Feature Extractor</h3>
        <button className="tool-panel-close-btn" onClick={onClose}>
          ×
        </button>
      </div>

      {!hasLayers ? (
        <div className="tool-panel-error">
          <p className="tool-panel-error-title">Ingen lag i kartet</p>
          <p className="tool-panel-error-message">
            Dette verktøyet krever minst ett lag i kartet.
          </p>
          <p className="tool-panel-hint">
            Du har ingen lag. Last opp ett eller flere GeoJSON-lag for å bruke det.
          </p>
        </div>
      ) : (
        <div className="tool-panel-content">
          <p className="tool-panel-description">
            Feature Extractor er under utvikling og blir koblet til faktiske
            GIS-operasjoner senere i prosjektet.
          </p>
        </div>
      )}
    </div>
  );
}
