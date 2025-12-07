// src/components/upload/UploadPanel.jsx
import { useState } from "react";
import { useLayers } from "../../context/LayersContext.jsx";
import { reprojectToWgs84IfNeeded } from "../../utils/projection.js";

export default function UploadPanel({ onClose }) {
  const { addLayer } = useLayers();
  const [status, setStatus] = useState("");

  const handleFiles = async (event) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    setStatus("");

    for (const file of files) {
      try {
        const text = await file.text();
        let data = JSON.parse(text);

        if (!data.type) {
          throw new Error("Filen ser ikke ut som GeoJSON.");
        }

        data = reprojectToWgs84IfNeeded(data);

        addLayer({
          id: `${file.name}-${Date.now()}-${Math.random()
            .toString(16)
            .slice(2)}`,
          name: file.name.replace(/\.(geo)?json$/i, ""),
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
