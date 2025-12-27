/*
  Hensikt:
  Dette panelet lar brukeren lage en buffer rundt et valgt lag.
  Resultatet blir et nytt lag i kartet (originalen røres ikke).

  Hvor skjer selve GIS-beregningen?
  - Jeg kaller createBufferedGeoJson i utils/buffer.js.

  Eksterne biblioteker (hvorfor og hvordan):
  - Turf (indirekte): createBufferedGeoJson bruker Turf for å beregne buffer.

  Min kode vs bibliotek:
  - Dette panelet (skjema, validering, addLayer) er skrevet av meg.
  - Turf-bufferen er bibliotek.
*/

import { useMemo, useState } from "react";
import { useLayers } from "../../context/LayersContext.jsx";
import { createBufferedGeoJson } from "../../utils/buffer.js";

export default function BufferPanel({ onClose }) {
  const { layers, addLayer } = useLayers();

  const hasLayers = Array.isArray(layers) && layers.length > 0;

  // ✅ Default: foreslå siste (nyeste) lag
  const defaultLayerId = useMemo(() => {
    if (!hasLayers) return "";
    return layers[layers.length - 1]?.id ?? "";
  }, [hasLayers, layers]);

  const [selectedLayerId, setSelectedLayerId] = useState("");
  const [distanceMeters, setDistanceMeters] = useState(100);
  const [status, setStatus] = useState("");

  // Jeg viser alltid et gyldig valg i UI, uten å “tvinge” setState i useEffect.
  const effectiveSelectedLayerId =
    !hasLayers
      ? ""
      : layers.some((l) => l.id === selectedLayerId)
        ? (selectedLayerId || defaultLayerId)
        : defaultLayerId;

  const handleSubmit = (e) => {
    // Jeg validerer input og lager et nytt lag.
    e.preventDefault();
    setStatus("");

    if (!hasLayers) {
      setStatus("Du må ha minst ett lag i kartet for å bruke buffer.");
      return;
    }

    const distance = Number(distanceMeters);
    if (!effectiveSelectedLayerId) {
      setStatus("Velg et lag å buffre.");
      return;
    }

    if (!Number.isFinite(distance) || distance <= 0) {
      setStatus("Bufferavstanden må være et positivt tall i meter.");
      return;
    }

    const sourceLayer = layers.find((l) => l.id === effectiveSelectedLayerId);
    if (!sourceLayer) {
      setStatus("Fant ikke valgt lag.");
      return;
    }

    try {
      const bufferedData = createBufferedGeoJson(sourceLayer.data, distance);
      const newLayerName = `${sourceLayer.name}_buffer_${distance}m`;

      addLayer({
        id: `${newLayerName}-${Date.now()}-${Math.random()
          .toString(16)
          .slice(2)}`,
        name: newLayerName,
        data: bufferedData,
      });

      setStatus(
        `Buffer-lag er opprettet som «${newLayerName}». Du kan styre synligheten i Lag-panelet.`
      );
    } catch (err) {
      console.error(err);
      setStatus(`Klarte ikke å buffre laget: ${err.message}`);
    }
  };

  return (
    <div className="buffer-panel" onClick={(e) => e.stopPropagation()}>
      <div className="buffer-panel-header">
        <h3>Buffer</h3>
        <button className="buffer-close-btn" onClick={onClose}>
          ×
        </button>
      </div>

      {!hasLayers ? (
        <div className="tool-panel-error">
          <p className="tool-panel-error-title">Ingen lag i kartet</p>
          <p className="tool-panel-error-message">
            Buffer krever minst ett lag i kartet.
          </p>
          <p className="tool-panel-hint">
            Last opp ett eller flere GeoJSON-lag for å bruke buffer.
          </p>
        </div>
      ) : (
        <>
          <p className="buffer-panel-description">
            Velg lag og angi en bufferavstand. Bufferen beregnes rundt alle
            objektene i laget og legges til som et nytt lag.
          </p>

          <form className="buffer-form" onSubmit={handleSubmit}>
            <div className="buffer-field">
              <label htmlFor="buffer-layer">Lag som skal buffres</label>
              <select
                id="buffer-layer"
                value={effectiveSelectedLayerId}
                onChange={(e) => setSelectedLayerId(e.target.value)}
              >
                {layers.map((layer) => (
                  <option key={layer.id} value={layer.id}>
                    {layer.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="buffer-field buffer-field-inline">
              <div className="buffer-field-distance">
                <label htmlFor="buffer-distance">Avstand</label>
                <input
                  id="buffer-distance"
                  type="number"
                  min="1"
                  step="1"
                  value={distanceMeters}
                  onChange={(e) => setDistanceMeters(e.target.value)}
                />
              </div>
              <div className="buffer-field-unit">
                <span>meter</span>
              </div>
            </div>

            <button type="submit" className="buffer-submit">
              Lag buffer
            </button>
          </form>
        </>
      )}

      {status && <p className="buffer-status">{status}</p>}
    </div>
  );
}
