/*
  Hensikt:
  Denne fila filtrerer polygoner basert på areal (m²).
  Typisk bruk: “behold bare fotballbaner større enn X m²”.

  Eksterne biblioteker (hvorfor og hvordan):
  - Turf.js: turf.area regner ut areal i kvadratmeter på GeoJSON-polygon.

  Min kode vs bibliotek:
  - Turf regner ut arealet.
  - Jeg har skrevet validering, MultiPolygon-splitting (explodeToPolygons) og filtreringen.
*/

import * as turf from "@turf/turf";
import { featureCollection } from "@turf/helpers";

function toFeatureCollection(geojson) {
  if (!geojson || typeof geojson !== "object") {
    throw new Error("Ugyldig GeoJSON.");
  }
  if (geojson.type === "FeatureCollection") return geojson;
  if (geojson.type === "Feature") return featureCollection([geojson]);

  return featureCollection([
    { type: "Feature", properties: {}, geometry: geojson },
  ]);
}

function isPolygonLike(type) {
  return type === "Polygon" || type === "MultiPolygon";
}

/**
 * Flater ut Polygon/MultiPolygon til en liste med Polygon-features.
 * Dette gjør at små deler i et MultiPolygon kan filtreres vekk.
 */
function explodeToPolygons(fc) {
  const out = [];

  fc.features.forEach((f) => {
    const g = f?.geometry;
    if (!g || !isPolygonLike(g.type)) return;

    if (g.type === "Polygon") {
      out.push({
        type: "Feature",
        properties: { ...(f.properties || {}) },
        geometry: g,
      });
      return;
    }

    // MultiPolygon -> flere Polygon-features
    g.coordinates.forEach((coords) => {
      out.push({
        type: "Feature",
        properties: { ...(f.properties || {}) },
        geometry: { type: "Polygon", coordinates: coords },
      });
    });
  });

  return out;
}

/**
 * Filtrer polygoner på areal (m²) innenfor [min,max].
 * Skriver kun: properties.area_m2
 */
export function areaFilterGeoJson(layerGeoJson, { min = null, max = null } = {}) {
  const fc = toFeatureCollection(layerGeoJson);

  const hasAnyPolygon = fc.features.some((f) => isPolygonLike(f?.geometry?.type));
  if (!hasAnyPolygon) {
    throw new Error("Area Filter støtter bare polygon/multipolygon-features.");
  }

  const minN = min === null || min === "" ? null : Number(min);
  const maxN = max === null || max === "" ? null : Number(max);

  if (minN !== null && (!Number.isFinite(minN) || minN < 0)) {
    throw new Error("Min må være et tall ≥ 0 (eller tom).");
  }
  if (maxN !== null && (!Number.isFinite(maxN) || maxN < 0)) {
    throw new Error("Max må være et tall ≥ 0 (eller tom).");
  }
  if (minN !== null && maxN !== null && minN > maxN) {
    throw new Error("Min kan ikke være større enn max.");
  }

  // NØKKEL: splitte MultiPolygon til separate polygon-features
  const polys = explodeToPolygons(fc);

  const out = [];
  polys.forEach((f) => {
    let areaM2;
    try {
      areaM2 = turf.area(f);
    } catch {
      return;
    }

    const okMin = minN === null ? true : areaM2 >= minN;
    const okMax = maxN === null ? true : areaM2 <= maxN;

    if (!okMin || !okMax) return;

    out.push({
      ...f,
      properties: {
        ...(f.properties || {}),
        area_m2: areaM2,
      },
    });
  });

  if (!out.length) {
    throw new Error("Ingen polygoner tilfredsstilte areal-filteret. Prøv en annen min/max.");
  }

  return featureCollection(out);
}
