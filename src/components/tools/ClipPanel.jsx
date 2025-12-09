// src/components/tools/ClipPanel.jsx
import { useState } from "react";
import { useLayers } from "../../context/LayersContext.jsx";
import { clipGeoJson } from "../../utils/clip.js";

export default function ClipPanel({ onClose }) {
  const { layers, addLayer } = useLayers();
  const [sourceId, setSourceId] = useState("");
  const [maskId, setMaskId] = useState("");
  const [status, setStatus] = useState("");

  const hasMultipleLayers = Array.isArray(layers) && layers.length >= 2;

  const handleSubmit = (e) => {
    e.preventDefault();
    setStatus("");

    if (!hasMultipleLayers) {
      setStatus("Du må ha minst to lag i kartet for å bruke Clip.");
      return;
    }

    if (!sourceId || !maskId) {
      setStatus("Velg både lag som skal klippes og maske-lag.");
      return;
    }

    if (sourceId === maskId) {
      setStatus("Kilde- og maske-lag kan ikke være det samme.");
      return;
    }

    const sourceLayer = layers.find((l) => l.id === sourceId);
    const maskLayer = layers.find((l) => l.id === maskId);

    if (!sourceLayer || !maskLayer) {
      setStatus("Fant ikke valgte lag.");
      return;
    }

    try {
      const clipped = clipGeoJson(sourceLayer.data, maskLayer.data);

      const newName = `${sourceLayer.name}_clipped_${maskLayer.name}`;
      addLayer({
        id: `${newName}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: newName,
        data: clipped,
      });

      setStatus(`Nytt klippet lag er opprettet som «${newName}».`);
    } catch (err) {
      console.error(err);
      setStatus(`Klarte ikke å klippe lagene: ${err.message}`);
    }
  };

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
        <>
          <p className="tool-panel-description">
            Velg et lag som skal klippes, og et maske-lag (typisk et polygonlag).
            Resultatet blir et nytt lag med geometri som er begrenset til masken.
          </p>

          <form className="tool-panel-form" onSubmit={handleSubmit}>
            <div className="tool-field">
              <label htmlFor="clip-source">Lag som skal klippes</label>
              <select
                id="clip-source"
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
              >
                <option value="">– Velg lag –</option>
                {layers.map((layer) => (
                  <option key={layer.id} value={layer.id}>
                    {layer.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="tool-field">
              <label htmlFor="clip-mask">Maske-lag (klippepolygon)</label>
              <select
                id="clip-mask"
                value={maskId}
                onChange={(e) => setMaskId(e.target.value)}
              >
                <option value="">– Velg lag –</option>
                {layers.map((layer) => (
                  <option key={layer.id} value={layer.id}>
                    {layer.name}
                  </option>
                ))}
              </select>
            </div>

            <button type="submit" className="tool-panel-submit">
              Klipp lag
            </button>
          </form>
        </>
      )}

      {status && <p className="tool-panel-status">{status}</p>}
    </div>
  );
}
