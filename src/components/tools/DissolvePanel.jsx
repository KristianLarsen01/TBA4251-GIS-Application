/*
  Hensikt:
  Dette panelet lar brukeren gjøre Dissolve på et polygonlag.
  Dissolve betyr: slå sammen polygoner og fjerne interne grenser.

  Hvor skjer selve GIS-beregningen?
  - I utils/dissolve.js (dissolveGeoJson). Den bruker Turf til å slå sammen geometri.

  Eksterne biblioteker:
  - Turf (indirekte): inne i dissolveGeoJson.

  Min kode vs bibliotek:
  - Denne fila er UI (velg lag, velg modus, velg property) + addLayer.
  - Turf gjør geometri-operasjonen.
*/

import { useEffect, useMemo, useState } from "react";
import { useLayers } from "../../context/LayersContext.jsx";
import { dissolveGeoJson } from "../../utils/dissolve.js";

export default function DissolvePanel({ onClose }) {
  const { layers, addLayer } = useLayers();
  const [layerId, setLayerId] = useState("");
  const [mode, setMode] = useState("all"); // "all" | "property"
  const [propertyKey, setPropertyKey] = useState("");
  const [status, setStatus] = useState("");

  const polygonLayers = layers.filter((layer) => {
    const data = layer?.data;
    if (!data || !Array.isArray(data.features)) return false;
    const feat = data.features.find((f) => f?.geometry);
    if (!feat?.geometry) return false;
    const t = feat.geometry.type;
    return t === "Polygon" || t === "MultiPolygon";
  });

  // foreslå nyeste polygonlag
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

  const propertyKeys = useMemo(() => {
    const fc = selectedLayer?.data;
    if (!fc?.features?.length) return [];
    const withProps = fc.features.find(
      (f) => f?.properties && Object.keys(f.properties).length
    );
    if (!withProps?.properties) return [];
    return Object.keys(withProps.properties).sort();
  }, [selectedLayer]);

  // Hvis property-modus er valgt men laget ikke har properties: fall tilbake til "all"
  useEffect(() => {
    if (mode === "property" && !propertyKeys.length) {
      setMode("all");
      setPropertyKey("");
    }
  }, [mode, propertyKeys.length]);

  // Sett default propertyKey når jeg går til property-modus
  useEffect(() => {
    if (mode === "property" && propertyKeys.length && !propertyKey) {
      setPropertyKey(propertyKeys[0]);
    }
  }, [mode, propertyKeys, propertyKey]);

  const handleSubmit = (e) => {
    // Jeg validerer input og lager et nytt lag med dissolved geometri.
    e.preventDefault();
    setStatus("");

    if (!polygonLayers.length) {
      setStatus("Du har ingen polygonlag å dissolve.");
      return;
    }

    if (!selectedLayer) {
      setStatus("Fant ikke valgt lag.");
      return;
    }

    if (mode === "property" && !propertyKey) {
      setStatus("Velg en property å dissolve på.");
      return;
    }

    try {
      const dissolved = dissolveGeoJson(
        selectedLayer.data,
        mode === "property" ? propertyKey : null
      );

      const newName =
        mode === "property"
          ? `Dissolve ${selectedLayer.name} by ${propertyKey}`
          : `Dissolve ${selectedLayer.name}`;

      addLayer({
        id: `dissolve-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: newName,
        data: dissolved,
      });

      setStatus(`Nytt lag "${newName}" ble opprettet.`);
    } catch (err) {
      console.error(err);
      setStatus(err?.message || "Dissolve-operasjonen feilet.");
    }
  };

  const canUsePropertyMode = propertyKeys.length > 0;

  return (
    <div className="tool-panel" onClick={(e) => e.stopPropagation()}>
      <div className="tool-panel-header">
        <h3>Dissolve</h3>
        <button className="tool-panel-close-btn" onClick={onClose}>
          ×
        </button>
      </div>

      {!polygonLayers.length ? (
        <div className="tool-panel-error">
          <p className="tool-panel-error-title">Ingen polygonlag</p>
          <p className="tool-panel-error-message">
            Dissolve støtter bare polygon- og multipolygon-lag.
          </p>
          <p className="tool-panel-hint">Last opp eller tegn et polygonlag først.</p>
        </div>
      ) : (
        <>
          <p className="tool-panel-description">
            Dissolve slår sammen interne grenser i ett polygonlag. Du kan dissolve alt,
            eller dissolve per property-verdi.
          </p>

          <form className="tool-panel-form" onSubmit={handleSubmit}>
            <div className="tool-field">
              <label htmlFor="dissolve-layer">Lag</label>
              <select
                id="dissolve-layer"
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
              <label>Modus</label>

              <div className="dissolve-mode-group" role="group" aria-label="Dissolve modus">
                <button
                  type="button"
                  className={`dissolve-mode-btn ${mode === "all" ? "active" : ""}`}
                  aria-pressed={mode === "all"}
                  onClick={() => setMode("all")}
                >
                  Dissolve alt
                </button>

                <button
                  type="button"
                  className={`dissolve-mode-btn ${mode === "property" ? "active" : ""}`}
                  aria-pressed={mode === "property"}
                  onClick={() => setMode("property")}
                  disabled={!canUsePropertyMode}
                  title={!canUsePropertyMode ? "Fant ingen properties i laget" : ""}
                >
                  Dissolve på property
                </button>
              </div>

              <p className="tool-panel-hint">
                {canUsePropertyMode
                  ? "Velg “på property” for å slå sammen per unik verdi."
                  : "Laget har ingen properties → kun “Dissolve alt” er tilgjengelig."}
              </p>
            </div>

            {mode === "property" && (
              <div className="tool-field">
                <label htmlFor="dissolve-prop">Property</label>
                <select
                  id="dissolve-prop"
                  value={propertyKey}
                  onChange={(e) => setPropertyKey(e.target.value)}
                >
                  {propertyKeys.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
                <p className="tool-panel-hint">
                  Hver unik verdi blir et eget dissolved feature.
                </p>
              </div>
            )}

            <button type="submit" className="tool-panel-submit">
              Utfør dissolve
            </button>
          </form>
        </>
      )}

      {status && <p className="tool-panel-status">{status}</p>}
    </div>
  );
}
