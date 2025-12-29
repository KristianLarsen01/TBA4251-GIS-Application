/*
  Hensikt:
  Dette panelet lar brukeren gjøre Difference (A − B):
  Jeg tar Lag A og trekker fra overlappen med Lag B.

  Hvor skjer selve GIS-beregningen?
  - I utils/difference.js (differenceGeoJson). Der brukes Turf.

  Eksterne biblioteker:
  - Turf (indirekte): inne i differenceGeoJson.

  Min kode vs bibliotek:
  - Denne fila er UI + validering + addLayer, skrevet av meg.
  - Turf gjør geometri-beregningene.
*/

import { useEffect, useState } from "react";
import { useLayers } from "../../context/LayersContext.jsx";
import { differenceGeoJson } from "../../utils/difference.js";

export default function DifferencePanel({ onClose }) {
  const { layers, addLayer } = useLayers();

  const [keepId, setKeepId] = useState("");
  const [subtractId, setSubtractId] = useState("");
  const [status, setStatus] = useState("");

  const hasMultipleLayers = Array.isArray(layers) && layers.length >= 2;

  // Kun polygonlag
  const polygonLayers = layers.filter((layer) => {
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
      setKeepId("");
      setSubtractId("");
      return;
    }

    const keepValid = polygonLayers.some((l) => l.id === keepId);
    const subValid = polygonLayers.some((l) => l.id === subtractId);

    if (keepValid && subValid && keepId !== subtractId) return;

    const top = polygonLayers[0];
    const next = polygonLayers[1];

    setKeepId(top.id);       // “beholde”
    setSubtractId(next.id);   // “trekke fra”
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers]);

  const handleSubmit = (e) => {
    // Jeg sjekker at jeg har valgt to ulike polygonlag.
    e.preventDefault();
    setStatus("");

    if (!hasMultipleLayers) {
      setStatus("Du må ha minst to lag i kartet for å bruke Difference.");
      return;
    }
    if (polygonLayers.length < 2) {
      setStatus("Difference støtter bare polygonlag. Du trenger minst to polygonlag.");
      return;
    }
    if (!keepId || !subtractId) {
      setStatus("Velg lag i begge nedtrekkslistene.");
      return;
    }
    if (keepId === subtractId) {
      setStatus("Velg to ulike lag. (Difference av et lag med seg selv gir tomt resultat.)");
      return;
    }

    const keepLayer = layers.find((l) => l.id === keepId);
    const subLayer = layers.find((l) => l.id === subtractId);

    if (!keepLayer || !subLayer) {
      setStatus("Fant ikke ett eller begge valgte lag.");
      return;
    }

    try {
      const outFC = differenceGeoJson(keepLayer.data, subLayer.data);
      const newName = `Difference (${keepLayer.name} - ${subLayer.name})`;

      addLayer({
        id: `difference-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: newName,
        data: outFC,
      });

      setStatus(`Nytt lag "${newName}" ble opprettet.`);
    } catch (err) {
      console.error(err);
      setStatus(
        err?.message ||
          "Difference-operasjonen feilet. Sjekk at lagene overlapper og er gyldige polygoner."
      );
    }
  };

  return (
    <div className="tool-panel" onClick={(e) => e.stopPropagation()}>
      <div className="tool-panel-header">
        <h3>Difference</h3>
        <button className="tool-panel-close-btn" onClick={onClose}>×</button>
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
            Difference støtter bare polygon- og multipolygon-lag.
          </p>
          <p className="tool-panel-hint">
            Du trenger minst to polygonlag for å kunne trekke det ene fra det andre.
          </p>
        </div>
      ) : (
        <>
          <p className="tool-panel-description">
            Difference fjerner området i <strong>Lag B</strong> fra <strong>Lag A</strong>.
            Resultatet blir et nytt polygonlag som bare inneholder det som er igjen av Lag A etter at Lag B er trukket fra.
          </p>

          <form className="tool-panel-form" onSubmit={handleSubmit}>
            <div className="tool-field">
              <label htmlFor="diff-keep">Velg laget du vil beholde</label>
              <select
                id="diff-keep"
                value={keepId}
                onChange={(e) => setKeepId(e.target.value)}
              >
                {polygonLayers.map((layer) => (
                  <option key={layer.id} value={layer.id}>
                    {layer.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="tool-field">
              <label htmlFor="diff-sub">Velg laget du vil trekke fra</label>
              <select
                id="diff-sub"
                value={subtractId}
                onChange={(e) => setSubtractId(e.target.value)}
              >
                {polygonLayers.map((layer) => (
                  <option key={layer.id} value={layer.id}>
                    {layer.name}
                  </option>
                ))}
              </select>
              <p className="tool-panel-hint">
                Tips: Hvis lagene ikke overlapper, vil resultatet bli identisk med “laget du vil beholde”.
              </p>
            </div>

            <button type="submit" className="tool-panel-submit">
              Utfør difference
            </button>
          </form>
        </>
      )}

      {status && <p className="tool-panel-status">{status}</p>}
    </div>
  );
}
