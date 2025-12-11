// src/components/tools/UnionPanel.jsx
import { useState, useEffect } from "react";
import { useLayers } from "../../context/LayersContext.jsx";
import { unionGeoJson } from "../../utils/union.js";

export default function UnionPanel({ onClose }) {
  const { layers, addLayer } = useLayers();
  const [layerAId, setLayerAId] = useState("");
  const [layerBId, setLayerBId] = useState("");
  const [status, setStatus] = useState("");

  const hasLayers = Array.isArray(layers) && layers.length > 0;

  // Finn alle polygonlag (Polygon eller MultiPolygon)
  const polygonLayers = layers.filter((layer) => {
    const data = layer?.data;
    if (!data || !Array.isArray(data.features)) return false;

    const featWithGeom = data.features.find((f) => f && f.geometry);
    if (!featWithGeom || !featWithGeom.geometry) return false;

    const t = featWithGeom.geometry.type;
    return t === "Polygon" || t === "MultiPolygon";
  });

  // Gi "polygonforslag" i feltene når lagene endres
  useEffect(() => {
    if (!polygonLayers.length) {
      setLayerAId("");
      setLayerBId("");
      return;
    }

    // Sjekk om nåværende valg fortsatt finnes
    const aStill = polygonLayers.some((l) => l.id === layerAId);
    const bStill = polygonLayers.some((l) => l.id === layerBId);

    if (aStill && bStill) return; // begge er fortsatt gyldige → beholder dem

    if (polygonLayers.length === 1) {
      // Ett polygonlag → dissolve-forslag (samme lag i begge felter)
      const only = polygonLayers[0];
      setLayerAId(only.id);
      setLayerBId(only.id);
    } else {
      // To eller flere → foreslå de to nyeste polygonlagene
      const last = polygonLayers[polygonLayers.length - 1];
      const prev = polygonLayers[polygonLayers.length - 2];
      setLayerAId(prev.id);
      setLayerBId(last.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers]); // polygonLayers er avledet av layers

  const handleSubmit = (e) => {
    e.preventDefault();
    setStatus("");

    if (!hasLayers) {
      setStatus("Du må ha minst ett lag i kartet for å bruke Union.");
      return;
    }

    if (!polygonLayers.length) {
      setStatus("Union støtter bare polygonlag. Du har ingen polygonlag ennå.");
      return;
    }

    if (!layerAId || !layerBId) {
      setStatus("Velg lag i begge nedtrekkslistene.");
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
      const sameLayer = layerAId === layerBId;

      const baseName = sameLayer
        ? `Dissolve ${layerA.name}`
        : `Union (${layerA.name} + ${layerB.name})`;

      const newName = `${baseName}`;

      addLayer({
        id:
          `union-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: newName,
        data: unionFC,
      });

      setStatus(`Nytt lag "${newName}" ble opprettet.`);
    } catch (err) {
      console.error(err);
      setStatus(
        err?.message ||
          "Union-operasjonen feilet. Sjekk at lagene er gyldige polygonlag."
      );
    }
  };

  return (
    <div className="tool-panel" onClick={(e) => e.stopPropagation()}>
      <div className="tool-panel-header">
        <h3>Union</h3>
        <button className="tool-panel-close-btn" onClick={onClose}>
          ×
        </button>
      </div>

      {!hasLayers ? (
        <div className="tool-panel-error">
          <p className="tool-panel-error-title">Ingen lag i kartet</p>
          <p className="tool-panel-error-message">
            Last opp eller tegn minst ett polygonlag for å bruke Union.
          </p>
        </div>
      ) : !polygonLayers.length ? (
        <div className="tool-panel-error">
          <p className="tool-panel-error-title">Ingen polygonlag</p>
          <p className="tool-panel-error-message">
            Union støtter bare polygon- og multipolygon-lag.
          </p>
          <p className="tool-panel-hint">
            Last opp eller tegn et polygonlag, f.eks. kommunegrenser eller
            analyseområder.
          </p>
        </div>
      ) : (
        <>
          <p className="tool-panel-description">
            Union slår sammen to polygonlag til ett, og fjerner interne
            grenser. Du kan også velge samme lag i begge nedtrekkene for å
            gjøre en klassisk <em>dissolve</em> av et enkelt lag.
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
                  <option key={layer.id} value={layer.id}>
                    {layer.name}
                  </option>
                ))}
              </select>
              <p className="tool-panel-hint">
                Kun polygonlag vises her. Nyeste polygonlag foreslås automatisk.
              </p>
            </div>

            <div className="tool-field">
              <label htmlFor="union-layer-b">Lag B</label>
              <select
                id="union-layer-b"
                value={layerBId}
                onChange={(e) => setLayerBId(e.target.value)}
              >
                {polygonLayers.map((layer) => (
                  <option key={layer.id} value={layer.id}>
                    {layer.name}
                  </option>
                ))}
              </select>
              <p className="tool-panel-hint">
                Velg samme lag i begge felter for å dissolve det laget.
              </p>
            </div>

            <button type="submit" className="tool-panel-submit">
              Kjør union
            </button>
          </form>
        </>
      )}

      {status && <p className="tool-panel-status">{status}</p>}
    </div>
  );
}
