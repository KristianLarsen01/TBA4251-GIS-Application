// src/components/tools/ClipPanel.jsx
import { useLayers } from "../../context/LayersContext.jsx";

export default function ClipPanel({ onClose }) {
  const { layers } = useLayers();
  const hasMultipleLayers = Array.isArray(layers) && layers.length >= 2;

  return (
    <div className="tool-panel" onClick={(e) => e.stopPropagation()}>
      <div className="tool-panel-header">
        <h3>Clip</h3>
        <button className="tool-panel-close-btn" onClick={onClose}>
          ×
        </button>
      </div>

      {!hasMultipleLayers ? (
        <div className="tool-panel-error">
          <p className="tool-panel-error-title">Ikke nok lag</p>
          <p className="tool-panel-error-message">
            Dette verktøyet krever minst to lag i kartet.
          </p>
          <p className="tool-panel-hint">
            Du har for øyeblikket {layers.length} lag. Last opp flere GeoJSON-lag for å bruke det.
          </p>
        </div>
      ) : (
        <div className="tool-panel-content">
          <p className="tool-panel-description">
            Clip er under utvikling og blir koblet til faktiske GIS-operasjoner
            senere i prosjektet.
          </p>
        </div>
      )}
    </div>
  );
}
