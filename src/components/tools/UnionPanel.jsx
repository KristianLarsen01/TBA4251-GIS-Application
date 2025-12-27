/*
  Hensikt:
  Dette panelet lar brukeren gjøre Union mellom to polygonlag.
  Union betyr at jeg slår sammen arealene til ett nytt lag.

  Hvor skjer selve GIS-beregningen?
  - I utils/union.js (unionGeoJson). Den bruker Turf.

  Eksterne biblioteker:
  - Turf (indirekte): inne i unionGeoJson.

  Min kode vs bibliotek:
  - Denne fila er UI + validering + addLayer.
  - Turf gjør geometri-sammenslåingen.
*/

import { useState, useEffect } from "react";
import { useLayers } from "../../context/LayersContext.jsx";
import { unionGeoJson } from "../../utils/union.js";

export default function UnionPanel({ onClose }) {
  const { layers, addLayer } = useLayers();
  const [layerAId, setLayerAId] = useState("");
  const [layerBId, setLayerBId] = useState("");
  const [status, setStatus] = useState("");

  const polygonLayers = layers.filter((layer) => {
    const data = layer?.data;
    if (!data || !Array.isArray(data.features)) return false;
    const feat = data.features.find((f) => f?.geometry);
    if (!feat?.geometry) return false;
    const t = feat.geometry.type;
    return t === "Polygon" || t === "MultiPolygon";
  });

  // Foreslå to nyeste polygonlag
  useEffect(() => {
    if (polygonLayers.length < 2) {
      setLayerAId(polygonLayers[0]?.id ?? "");
      setLayerBId(polygonLayers[0]?.id ?? "");
      return;
    }

    const aStill = polygonLayers.some((l) => l.id === layerAId);
    const bStill = polygonLayers.some((l) => l.id === layerBId);
    if (aStill && bStill) return;

    const last = polygonLayers[polygonLayers.length - 1];
    const prev = polygonLayers[polygonLayers.length - 2];
    setLayerAId(prev.id);
    setLayerBId(last.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers]);

  const handleSubmit = (e) => {
    // Jeg sørger for at jeg har valgt to ulike polygonlag.
    e.preventDefault();
    setStatus("");

    if (polygonLayers.length < 2) {
      setStatus("Union krever minst to polygonlag i kartet.");
      return;
    }

    if (!layerAId || !layerBId) {
      setStatus("Velg lag i begge nedtrekkslistene.");
      return;
    }

    if (layerAId === layerBId) {
      setStatus("Union krever to forskjellige lag. Bruk Dissolve-verktøyet for å slå sammen ett lag.");
      return;
    }

    const layerA = layers.find((l) => l.id === layerAId);
    const layerB = layers.find((l) => l.id === layerBId);
    if (!layerA || !layerB) {
      setStatus("Fant ikke ett eller begge valgte lag.");
      return;
    }

    try {
      const unionFC = unionGeoJson(layerA.data, layerB.data);
      const newName = `Union (${layerA.name} + ${layerB.name})`;

      addLayer({
        id: `union-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: newName,
        data: unionFC,
      });

      setStatus(`Nytt lag "${newName}" ble opprettet.`);
    } catch (err) {
      console.error(err);
      setStatus(err?.message || "Union-operasjonen feilet.");
    }
  };

  return (
    <div className="tool-panel" onClick={(e) => e.stopPropagation()}>
      <div className="tool-panel-header">
        <h3>Union</h3>
        <button className="tool-panel-close-btn" onClick={onClose}>×</button>
      </div>

      {polygonLayers.length < 2 ? (
        <div className="tool-panel-error">
          <p className="tool-panel-error-title">Ikke nok polygonlag</p>
          <p className="tool-panel-error-message">Union krever minst to polygonlag.</p>
          <p className="tool-panel-hint">
            Last opp eller tegn minst to polygonlag (Polygon / MultiPolygon).
          </p>
        </div>
      ) : (
        <>
          <p className="tool-panel-description">
            Union slår sammen <strong>to polygonlag</strong> til ett nytt lag.
          </p>

          <form className="tool-panel-form" onSubmit={handleSubmit}>
            <div className="tool-field">
              <label htmlFor="union-layer-a">Lag A</label>
              <select
                id="union-layer-a"
                value={layerAId}
                onChange={(e) => setLayerAId(e.target.value)}
              >
                {polygonLayers.map((layer) => (
                  <option key={layer.id} value={layer.id}>{layer.name}</option>
                ))}
              </select>
              <p className="tool-panel-hint">Kun polygonlag vises her.</p>
            </div>

            <div className="tool-field">
              <label htmlFor="union-layer-b">Lag B</label>
              <select
                id="union-layer-b"
                value={layerBId}
                onChange={(e) => setLayerBId(e.target.value)}
              >
                {polygonLayers.map((layer) => (
                  <option key={layer.id} value={layer.id}>{layer.name}</option>
                ))}
              </select>
              <p className="tool-panel-hint">Må være forskjellig fra Lag A.</p>
            </div>

            <button type="submit" className="tool-panel-submit">Utfør union</button>
          </form>
        </>
      )}

      {status && <p className="tool-panel-status">{status}</p>}
    </div>
  );
}
