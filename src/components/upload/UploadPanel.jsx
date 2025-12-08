import { useState } from "react";
import { useLayers } from "../../context/LayersContext.jsx";
import { reprojectToWgs84IfNeeded } from "../../utils/projection.js";

function getUniqueLayerName(baseName, existingNamesSet) {
  let candidate = baseName;
  let idx = 1;
  while (existingNamesSet.has(candidate.toLowerCase())) {
    candidate = `${baseName}${idx}`;
    idx += 1;
  }
  return candidate;
}

export default function UploadPanel({ onClose }) {
  const { layers, addLayer } = useLayers();
  const [status, setStatus] = useState("");

  const handleFiles = async (event) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    setStatus("");

    // Start med navnene som allerede finnes
    const existingNames = new Set(
      layers
        .map((l) => l.name)
        .filter(Boolean)
        .map((n) => n.toLowerCase())
    );

    for (const file of files) {
      try {
        const text = await file.text();
        let data = JSON.parse(text);

        if (!data.type) {
          throw new Error("Filen ser ikke ut som GeoJSON.");
        }

        data = reprojectToWgs84IfNeeded(data);

        const baseName = file.name.replace(/\.(geo)?json$/i, "");
        const uniqueName = getUniqueLayerName(baseName, existingNames);
        existingNames.add(uniqueName.toLowerCase());

        addLayer({
          id: `${file.name}-${Date.now()}-${Math.random()
            .toString(16)
            .slice(2)}`,
          name: uniqueName,
          data,
        });
      } catch (err) {
        console.error(err);
        setStatus(`Klarte ikke å lese ${file.name}: ${err.message}`);
        return;
      }
    }

    setStatus("Ferdig! Lagene er lagt til i kartet.");
  };

  return (
    <div className="upload-panel" onClick={(e) => e.stopPropagation()}>
      <div className="upload-panel-header">
        <h3>Last opp GeoJSON</h3>
        <button className="tool-message-close" onClick={onClose}>
          ×
        </button>
      </div>

      <p className="upload-panel-text">
        Velg ett eller flere GeoJSON-filer (for eksempel{" "}
        <strong>TrondheimKommune.geojson</strong>,{" "}
        <strong>Personer.geojson</strong>,{" "}
        <strong>Fotballbaner.geojson</strong>,{" "}
        <strong>Kollektiv.geojson</strong>).
      </p>

      <label className="upload-dropzone">
        <span>Dra og slipp filer her, eller klikk for å velge.</span>
        <input
          type="file"
          accept=".geojson,application/geo+json,application/json"
          multiple
          onChange={handleFiles}
          style={{ display: "none" }}
        />
      </label>

      {status && <p className="upload-status">{status}</p>}
    </div>
  );
}
