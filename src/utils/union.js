/*
  Hensikt:
  Denne fila lager Union mellom to polygonlag.
  Union betyr at jeg slår sammen flater, så jeg får ett (større) område.

  Eksterne biblioteker (hvorfor og hvordan):
  - Turf.js: turf.union gjør selve geometri-sammenslåingen.

  Min kode vs bibliotek:
  - Turf gjør geometri-matematikken.
  - Jeg har skrevet normalisering (FeatureCollection), MultiPolygon-håndtering og feilmeldinger.
*/

import * as turf from "@turf/turf";
import { featureCollection } from "@turf/helpers";

/* ----------------------- Hjelpefunksjoner ----------------------- */

function toFeatureCollection(geojson) {
  if (!geojson || typeof geojson !== "object") {
    throw new Error("Ugyldig GeoJSON.");
  }

  if (geojson.type === "FeatureCollection") return geojson;

  if (geojson.type === "Feature") {
    return featureCollection([geojson]);
  }

  // Antar ren geometri
  return featureCollection([
    { type: "Feature", properties: {}, geometry: geojson },
  ]);
}

function isPolygonLike(type) {
  return type === "Polygon" || type === "MultiPolygon";
}

/**
 * Tar et FeatureCollection, henter ut alle polygoner/multipolygoner
 * og flater ut MultiPolygon til flere Polygon-features.
 */
function getAllPolygons(fc) {
  const polys = [];

  fc.features.forEach((f) => {
    const g = f.geometry;
    if (!g || !isPolygonLike(g.type)) return;

    if (g.type === "Polygon") {
      polys.push(f);
    } else if (g.type === "MultiPolygon") {
      g.coordinates.forEach((coords) => {
        polys.push({
          type: "Feature",
          properties: { ...(f.properties || {}) },
          geometry: {
            type: "Polygon",
            coordinates: coords,
          },
        });
      });
    }
  });

  return polys;
}

/* ----------------------- Hovedfunksjon ----------------------- */

/**
 * Union mellom to polygon-lag (eller dissolve av samme lag valgt to ganger).
 * Begge lagene kan inneholde mange features og MultiPolygon.
 * Resultatet er alltid et FeatureCollection.
 */
export function unionGeoJson(layerA, layerB) {
  if (!layerA || !layerB) {
    throw new Error("Mangler ett eller begge lag for union.");
  }

  const fcA = toFeatureCollection(layerA);
  const fcB = toFeatureCollection(layerB);

  const polys = [...getAllPolygons(fcA), ...getAllPolygons(fcB)];

  if (!polys.length) {
    throw new Error(
      "Union støtter bare polygon- og multipolygon-lag. " +
        "Ett av de valgte lagene har ikke polygon-geometri."
    );
  }

  // Hvis det bare er ett polygon totalt, er unionen bare det.
  if (polys.length === 1) {
    return featureCollection([polys[0]]);
  }

  let result;
  try {
    // Turf 6+ støtter union(featureCollection(...)) for mange polygoner
    const fc = featureCollection(polys);
    result = turf.union(fc);
  } catch (e) {
    console.error("Union-feil:", e);
    throw new Error("Union-operasjonen feilet. Geometriene kan være ugyldige.");
  }

  if (!result || !result.geometry) {
    throw new Error("Union ga ikke noe gyldig resultat.");
  }

  // Normaliser til FeatureCollection
  if (result.type === "FeatureCollection") {
    return result;
  }

  return featureCollection([result]);
}
