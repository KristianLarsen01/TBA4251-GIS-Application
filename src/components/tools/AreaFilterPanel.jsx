/*
  Hensikt:
  Dette panelet lar brukeren filtrere polygoner basert på areal (m²), ved å sette min/max.
  Resultatet blir et nytt lag, og hver feature får en property som heter area_m2.

  Hvor skjer selve GIS-beregningen?
  - I utils/areaFilter.js (areaFilterGeoJson), som bruker Turf til å regne areal.

  Eksterne biblioteker:
  - Turf (indirekte): areaFilterGeoJson bruker turf.area.

  Min kode vs bibliotek:
  - Denne fila er UI + validering + addLayer, skrevet av meg.
  - Turf regner ut areal.
*/

import { useEffect, useMemo, useState } from "react";
import { useLayers } from "../../context/LayersContext.jsx";
import { areaFilterGeoJson } from "../../utils/areaFilter.js";

export default function AreaFilterPanel({ onClose }) {
  const { layers, addLayer } = useLayers();
  const [layerId, setLayerId] = useState("");
  const [minVal, setMinVal] = useState("");
  const [maxVal, setMaxVal] = useState("");
  const [status, setStatus] = useState("");

  const hasLayers = Array.isArray(layers) && layers.length > 0;

  const polygonLayers = layers.filter((layer) => {
    const data = layer?.data;
    if (!data || !Array.isArray(data.features)) return false;
    const feat = data.features.find((f) => f?.geometry);
    if (!feat?.geometry) return false;
    const t = feat.geometry.type;
    return t === "Polygon" || t === "MultiPolygon";
  });

  useEffect(() => {
    if (!polygonLayers.length) {
      setLayerId("");
      return;
    }
    const stillValid = polygonLayers.some((l) => l.id === layerId);
    if (!stillValid) setLayerId(polygonLayers[polygonLayers.length - 1].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers]);

  const selectedLayer = useMemo(
    () => layers.find((l) => l.id === layerId),
    [layers, layerId]
  );

  const handleSubmit = (e) => {
    // Jeg validerer tall og oppretter nytt filtrert lag.
    e.preventDefault();
    setStatus("");

    if (!hasLayers) {
      setStatus("Du må ha minst ett lag i kartet for å bruke Area Filter.");
      return;
    }
    if (!polygonLayers.length) {
      setStatus("Area Filter støtter bare polygonlag. Du har ingen polygonlag ennå.");
      return;
    }
    if (!selectedLayer) {
      setStatus("Fant ikke valgt lag.");
      return;
    }

    const min = minVal === "" ? null : Number(minVal);
    const max = maxVal === "" ? null : Number(maxVal);

    if (min !== null && (!Number.isFinite(min) || min < 0)) {
      setStatus("Min må være et tall ≥ 0 (eller tom).");
      return;
    }
    if (max !== null && (!Number.isFinite(max) || max < 0)) {
      setStatus("Max må være et tall ≥ 0 (eller tom).");
      return;
    }

    try {
      const filtered = areaFilterGeoJson(selectedLayer.data, { min, max });

      const rangeText =
        (min === null ? "" : `min${min}`) +
        (min !== null && max !== null ? "_" : "") +
        (max === null ? "" : `max${max}`) ||
        `all`;

      const newName = `${selectedLayer.name}_area_${rangeText}m2`;

      addLayer({
        id: `areafilter-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: newName,
        data: filtered,
      });

      setStatus(`Nytt lag "${newName}" ble opprettet. (area_m2 lagt på properties.)`);
    } catch (err) {
      console.error(err);
      setStatus(err?.message || "Area Filter feilet.");
    }
  };

  return (
    <div className="tool-panel" onClick={(e) => e.stopPropagation()}>
      <div className="tool-panel-header">
        <h3>Area Filter</h3>
        <button className="tool-panel-close-btn" onClick={onClose}>×</button>
      </div>

      {!hasLayers ? (
        <div className="tool-panel-error">
          <p className="tool-panel-error-title">Ingen lag i kartet</p>
          <p className="tool-panel-error-message">
            Dette verktøyet krever minst ett lag i kartet.
          </p>
          <p className="tool-panel-hint">
            Last opp eller tegn et polygonlag for å bruke det.
          </p>
        </div>
      ) : !polygonLayers.length ? (
        <div className="tool-panel-error">
          <p className="tool-panel-error-title">Ingen polygonlag</p>
          <p className="tool-panel-error-message">
            Area Filter støtter bare polygon- og multipolygon-lag.
          </p>
          <p className="tool-panel-hint">
            Last opp eller tegn et polygonlag først.
          </p>
        </div>
      ) : (
        <>
          <p className="tool-panel-description">
            Filtrer polygoner basert på areal innenfor et intervall (min–max).
            Resultatet får property <code>area_m2</code>.
          </p>

          <form className="tool-panel-form" onSubmit={handleSubmit}>
            <div className="tool-field">
              <label htmlFor="af-layer">Lag</label>
              <select
                id="af-layer"
                value={layerId}
                onChange={(e) => setLayerId(e.target.value)}
              >
                {polygonLayers.map((layer) => (
                  <option key={layer.id} value={layer.id}>
                    {layer.name}
                  </option>
                ))}
              </select>
              <p className="tool-panel-hint">
                Kun polygonlag vises her.
              </p>
            </div>

            <div className="tool-field">
              <label>Arealintervall (m²)</label>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Min (tom = ingen)"
                  value={minVal}
                  onChange={(e) => setMinVal(e.target.value)}
                  style={{ flex: "1 1 calc(50% - 0.25rem)", minWidth: "80px" }}
                />
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Max (tom = ingen)"
                  value={maxVal}
                  onChange={(e) => setMaxVal(e.target.value)}
                  style={{ flex: "1 1 calc(50% - 0.25rem)", minWidth: "80px" }}
                />
              </div>
              <p className="tool-panel-hint">
                Tom min/max betyr “ingen grense” på den siden.
              </p>
            </div>

            <button type="submit" className="tool-panel-submit">
              Filtrer
            </button>
          </form>
        </>
      )}

      {status && <p className="tool-panel-status">{status}</p>}
    </div>
  );
}
