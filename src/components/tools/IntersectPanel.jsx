/*
  Hensikt:
  Dette panelet lar brukeren gjøre Intersect (A ∩ B):
  Jeg finner området der to polygonlag overlapper.

  Hvor skjer selve GIS-beregningen?
  - I utils/intersect.js (intersectGeoJson). Den bruker Turf.

  Eksterne biblioteker:
  - Turf (indirekte): inne i intersectGeoJson.

  Min kode vs bibliotek:
  - Denne fila er UI + validering + oppretting av nytt lag, skrevet av meg.
  - Turf gjør geometri-operasjonen.
*/

import { useEffect, useState } from "react";
import { useLayers } from "../../context/LayersContext.jsx";
import { intersectGeoJson } from "../../utils/intersect.js";

export default function IntersectPanel({ onClose }) {
  const { layers, addLayer } = useLayers();

  const [aId, setAId] = useState("");
  const [bId, setBId] = useState("");
  const [status, setStatus] = useState("");

  const hasMultipleLayers = Array.isArray(layers) && layers.length >= 2;

  // Kun polygonlag
  const polygonLayers = (layers || []).filter((layer) => {
    const data = layer?.data;
    if (!data || !Array.isArray(data.features)) return false;
    const feat = data.features.find((f) => f?.geometry);
    if (!feat?.geometry) return false;
    const t = feat.geometry.type;
    return t === "Polygon" || t === "MultiPolygon";
  });

  // Foreslå de to nyeste polygonlagene automatisk
  useEffect(() => {
    if (polygonLayers.length < 2) {
      setAId("");
      setBId("");
      return;
    }

    const aValid = polygonLayers.some((l) => l.id === aId);
    const bValid = polygonLayers.some((l) => l.id === bId);

    if (aValid && bValid && aId !== bId) return;

    const last = polygonLayers[polygonLayers.length - 1];
    const prev = polygonLayers[polygonLayers.length - 2];

    setAId(last.id);
    setBId(prev.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers]);

  const handleSubmit = (e) => {
    // Jeg sjekker at jeg har to ulike polygonlag og kjører intersect.
    e.preventDefault();
    setStatus("");

    if (!hasMultipleLayers) {
      setStatus("Du må ha minst to lag i kartet for å bruke Intersect.");
      return;
    }
    if (polygonLayers.length < 2) {
      setStatus("Intersect støtter bare polygonlag. Du trenger minst to polygonlag.");
      return;
    }
    if (!aId || !bId) {
      setStatus("Velg lag i begge nedtrekkslistene.");
      return;
    }
    if (aId === bId) {
      setStatus("Velg to ulike lag. (Intersect av et lag med seg selv gir samme lag.)");
      return;
    }

    const layerA = layers.find((l) => l.id === aId);
    const layerB = layers.find((l) => l.id === bId);

    if (!layerA || !layerB) {
      setStatus("Fant ikke ett eller begge valgte lag.");
      return;
    }

    try {
      const outFC = intersectGeoJson(layerA.data, layerB.data);
      const newName = `Intersect (${layerA.name} ∩ ${layerB.name})`;

      addLayer({
        id: `intersect-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: newName,
        data: outFC,
      });

      setStatus(`Nytt lag "${newName}" ble opprettet.`);
    } catch (err) {
      console.error(err);
      setStatus(
        err?.message ||
          "Intersect-operasjonen feilet. Sjekk at lagene overlapper og er gyldige polygoner."
      );
    }
  };

  return (
    <div className="tool-panel" onClick={(e) => e.stopPropagation()}>
      <div className="tool-panel-header">
        <h3>Intersect</h3>
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
            Du har for øyeblikket {layers.length} lag. Last opp eller tegn flere polygonlag.
          </p>
        </div>
      ) : polygonLayers.length < 2 ? (
        <div className="tool-panel-error">
          <p className="tool-panel-error-title">Ikke nok polygonlag</p>
          <p className="tool-panel-error-message">
            Intersect støtter bare polygon- og multipolygon-lag.
          </p>
          <p className="tool-panel-hint">
            Du trenger minst to polygonlag for å finne overlapp-området mellom dem.
          </p>
        </div>
      ) : (
        <>
          <p className="tool-panel-description">
            Intersect finner overlapp-området mellom <strong>Lag A</strong> og{" "}
            <strong>Lag B</strong>. Resultatet blir et nytt polygonlag som bare inneholder
            området der lagene overlapper.
          </p>

          <form className="tool-panel-form" onSubmit={handleSubmit}>
            <div className="tool-field">
              <label htmlFor="int-a">Velg Lag A</label>
              <select
                id="int-a"
                value={aId}
                onChange={(e) => setAId(e.target.value)}
              >
                {polygonLayers.map((layer) => (
                  <option key={layer.id} value={layer.id}>
                    {layer.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="tool-field">
              <label htmlFor="int-b">Velg Lag B</label>
              <select
                id="int-b"
                value={bId}
                onChange={(e) => setBId(e.target.value)}
              >
                {polygonLayers.map((layer) => (
                  <option key={layer.id} value={layer.id}>
                    {layer.name}
                  </option>
                ))}
              </select>

              <p className="tool-panel-hint">
                Tips: Hvis lagene ikke overlapper, blir resultatet tomt (og du får feilmelding).
              </p>
            </div>

            <button type="submit" className="tool-panel-submit">
              Utfør intersect
            </button>
          </form>
        </>
      )}

      {status && <p className="tool-panel-status">{status}</p>}
    </div>
  );
}
