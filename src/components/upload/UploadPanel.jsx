/*
  Hensikt:
  Dette panelet lar brukeren laste opp én eller flere GeoJSON-filer.
  Når filene er validert, legges de inn som nye lag i kartet via LayersContext.

  Eksterne biblioteker (hvorfor og hvordan):
  - useState: jeg bruker lokal tilstand for statusmeldinger.
  - Browser File API: file.text() leser innholdet uten server.
  - JSON.parse: gjør tekst om til et objekt.
  - proj4 (indirekte): reprojectToWgs84IfNeeded bruker proj4 i projection.js
    for å gjøre koordinater om til WGS84 (lon/lat) hvis filen er i en annen projeksjon.

  Min kode vs bibliotek:
  - Validering, navnegenerering og “legg til lag”-logikk er skrevet av meg.
  - proj4 er bibliotek. (Resten er vanlig nettleser-funksjonalitet + rammeverket.)
*/

import { useState } from "react";
import { useLayers } from "../../context/LayersContext.jsx";
import { reprojectToWgs84IfNeeded } from "../../utils/projection.js";

function getUniqueLayerName(baseName, existingNamesSet) {
  // Jeg unngår at to lag får helt likt navn.
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

    // Jeg leser filer én og én, så jeg kan stoppe med en tydelig feilmelding
    // hvis en fil er ugyldig.
    for (const file of files) {
      try {
        // Sjekk filtype
        const isGeoJsonFile = /\.(geo)?json$/i.test(file.name);
        if (!isGeoJsonFile) {
          throw new Error("Kun .geojson filer er tillatt.");
        }

        const text = await file.text();
        let data = JSON.parse(text);

        // Valider at det er GeoJSON
        if (!data.type || !["FeatureCollection", "Feature", "Point", "LineString", "Polygon", "MultiPoint", "MultiLineString", "MultiPolygon", "GeometryCollection"].includes(data.type)) {
          throw new Error("Filen ser ikke ut som gyldig GeoJSON.");
        }

        // Hvis det er en enkelt Feature, pakk den inn i FeatureCollection
        if (data.type === "Feature") {
          data = {
            type: "FeatureCollection",
            features: [data]
          };
        }

        // Hvis det er en ren geometri, pakk den inn
        if (["Point", "LineString", "Polygon", "MultiPoint", "MultiLineString", "MultiPolygon", "GeometryCollection"].includes(data.type)) {
          data = {
            type: "FeatureCollection",
            features: [{
              type: "Feature",
              geometry: data,
              properties: {}
            }]
          };
        }

        // Viktig: Kartet (Leaflet/Turf) forventer normalt WGS84 (lon/lat).
        // Derfor prøver jeg å reprojisere hvis data ser ut til å være i meter (f.eks. UTM).
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
        <button className="tool-panel-close-btn" onClick={onClose}>×</button>
      </div>

      <p className="upload-panel-text">
        Velg en eller flere GeoJSON-filer (for eksempel{" "}
        <strong>Leiligheter_finn.geojson</strong>,{" "}
        <strong>Arealbruk.geojson</strong>){" "}
      </p>

      <label className="upload-dropzone">
        <span>Klikk her for å velge fil(er)</span>
        <input
          type="file"
          accept=".geojson"
          multiple
          onChange={handleFiles}
          style={{ display: "none" }}
        />
      </label>

      {status && <p className="upload-status">{status}</p>}
    </div>
  );
}
