/*
  Hensikt:
  Dette panelet lar brukeren klippe ett eller flere lag mot en polygon-maske.
  Typisk: klipp alt til Analysepolygon.

  Hvor skjer selve GIS-beregningen?
  - I utils/clip.js (clipGeoJson). Den bruker Turf til å gjøre geometri-operasjoner.

  Eksterne biblioteker:
  - Turf (indirekte): brukes inne i clipGeoJson.

  Min kode vs bibliotek:
  - Valg av kilde-lag/maske + oppretting av nye lag er skrevet av meg.
  - Geometri-klippingen er Turf.
*/

import { useState, useMemo } from "react";
import { useLayers } from "../../context/LayersContext.jsx";
import { clipGeoJson } from "../../utils/clip.js";

export default function ClipPanel({ onClose }) {
  const { layers, addLayer } = useLayers();
  const [sourceIds, setSourceIds] = useState([]); // flere kildelag
  const [maskId, setMaskId] = useState(""); // ett maske-lag (polygon)
  const [status, setStatus] = useState("");

  const hasMultipleLayers = Array.isArray(layers) && layers.length >= 2;

  const toggleSourceId = (id) => {
    setSourceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // ✅ Finn alle polygonlag (avledet)
  const polygonLayers = useMemo(() => {
    return (layers || []).filter((layer) => {
      const data = layer?.data;
      if (!data || !Array.isArray(data.features)) return false;

      const featWithGeom = data.features.find((f) => f && f.geometry);
      if (!featWithGeom?.geometry) return false;

      const t = featWithGeom.geometry.type;
      return t === "Polygon" || t === "MultiPolygon";
    });
  }, [layers]);

  // Jeg viser alltid en gyldig maske i UI, uten å sette state i useEffect.
  const effectiveMaskId =
    polygonLayers.length === 0
      ? ""
      : polygonLayers.some((l) => l.id === maskId)
        ? (maskId || polygonLayers[0].id)
        : polygonLayers[0].id;

  const handleSubmit = (e) => {
    // Jeg validerer valg og kjører klipp per valgt kildelag.
    e.preventDefault();
    setStatus("");

    if (!hasMultipleLayers) {
      setStatus("Du må ha minst to lag i kartet for å bruke Clip.");
      return;
    }

    if (!polygonLayers.length) {
      setStatus("Du har ingen polygonlag som kan brukes som maske.");
      return;
    }

    if (!sourceIds.length) {
      setStatus("Velg ett eller flere lag som skal klippes.");
      return;
    }

    if (!effectiveMaskId) {
      setStatus("Velg et maske-lag.");
      return;
    }

    if (sourceIds.includes(effectiveMaskId)) {
      setStatus(
        "Maske-laget kan ikke være blant lagene som skal klippes. Fjern det fra listen, eller velg et annet maske-lag."
      );
      return;
    }

    const maskLayer = layers.find((l) => l.id === effectiveMaskId);
    if (!maskLayer) {
      setStatus("Fant ikke maske-laget.");
      return;
    }

    let successCount = 0;
    const failedSources = [];

    sourceIds.forEach((sid) => {
      const sourceLayer = layers.find((l) => l.id === sid);
      if (!sourceLayer) {
        failedSources.push("(ukjent lag-id)");
        return;
      }

      try {
        const clipped = clipGeoJson(sourceLayer.data, maskLayer.data);
        const newName = `${sourceLayer.name}_clipped_${maskLayer.name}`;

        addLayer({
          id: `${newName}-${Date.now()}-${Math.random()
            .toString(16)
            .slice(2)}`,
          name: newName,
          data: clipped,
        });

        successCount += 1;
      } catch (err) {
        console.error(err);
        failedSources.push(sourceLayer.name);
      }
    });

    if (successCount === 0) {
      setStatus(
        failedSources.length
          ? `Klarte ikke å klippe noen av lagene: ${failedSources.join(", ")}.`
          : "Klarte ikke å klippe lagene."
      );
      return;
    }

    if (failedSources.length) {
      setStatus(
        `Opprettet ${successCount} klippet(e) lag mot «${maskLayer.name}». Noen lag feilet: ${failedSources.join(
          ", "
        )}.`
      );
    } else {
      setStatus(
        `Opprettet ${successCount} nytt(e) klippet(e) lag mot «${maskLayer.name}».`
      );
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
            Du har for øyeblikket {layers.length} lag. Last opp flere GeoJSON-lag
            for å bruke det.
          </p>
        </div>
      ) : (
        <>
          <p className="tool-panel-description">
            Velg ett eller flere lag som skal klippes, og et maske-polygonlag. Resultatet blir nye lag med geometri som er begrenset
            til masken.
          </p>

          <form className="tool-panel-form" onSubmit={handleSubmit}>
            <div className="tool-field">
              <label>Lag som skal klippes (du kan velge flere)</label>

              <div className="tool-multiselect-list">
                {layers.map((layer) => (
                  <button
                    key={layer.id}
                    type="button"
                    className={`tool-multiselect-item ${
                      sourceIds.includes(layer.id) ? "selected" : ""
                    }`}
                    onClick={() => toggleSourceId(layer.id)}
                  >
                    <input
                      type="checkbox"
                      checked={sourceIds.includes(layer.id)}
                      onChange={() => toggleSourceId(layer.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span>{layer.name}</span>
                  </button>
                ))}
              </div>

              <p className="tool-panel-hint">
                Klikk på lagene du vil klippe. Du kan velge ett eller flere.
              </p>
            </div>

            <div className="tool-field">
              <label htmlFor="clip-mask">Maske-lag (klippepolygon)</label>

              {polygonLayers.length === 0 ? (
                <p className="tool-panel-hint">
                  Du har ingen polygonlag i kartet ennå. Last opp eller tegn et
                  polygonlag for å bruke Clip som maske.
                </p>
              ) : (
                <>
                  <select
                    id="clip-mask"
                    value={effectiveMaskId}
                    onChange={(e) => setMaskId(e.target.value)}
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
                </>
              )}
            </div>

            <button
              type="submit"
              className="tool-panel-submit"
              disabled={!polygonLayers.length}
            >
              Klipp lag
            </button>
          </form>
        </>
      )}

      {status && <p className="tool-panel-status">{status}</p>}
    </div>
  );
}
