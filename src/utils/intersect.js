// src/utils/intersect.js
/*
  Hensikt:
  Denne fila gjør GIS-operasjonen Intersect (A ∩ B) på GeoJSON.
  Altså: jeg finner overlappen mellom to polygonlag.

  Eksterne biblioteker (hvorfor og hvordan):
  - Turf.js: Dette er et kjent bibliotek for geometri-operasjoner i JavaScript.
    Jeg bruker spesielt @turf/intersect og @turf/turf.union for å slippe å implementere
    komplisert polygon-matematikk selv.

  Min kode vs bibliotek:
  - Turf gjør selve “mattejobben” (intersect/union).
  - Resten (validering, normalisering, MultiPolygon-håndtering, feilmeldinger)
    er skrevet av meg for å få robust og forståelig oppførsel i appen.
*/

import intersect from "@turf/intersect";
import * as turf from "@turf/turf";
import { featureCollection } from "@turf/helpers";

/* ----------------------- Helpers ----------------------- */

function toFeatureCollection(geojson) {
  if (!geojson || typeof geojson !== "object") throw new Error("Ugyldig GeoJSON.");
  if (geojson.type === "FeatureCollection") return geojson;
  if (geojson.type === "Feature") return featureCollection([geojson]);
  return featureCollection([{ type: "Feature", properties: {}, geometry: geojson }]);
}

function isPolygonLike(type) {
  return type === "Polygon" || type === "MultiPolygon";
}

function explodeToPolygons(fc) {
  const out = [];
  for (const f of fc.features || []) {
    const g = f?.geometry;
    if (!g || !isPolygonLike(g.type)) continue;

    if (g.type === "Polygon") {
      out.push({ type: "Feature", properties: { ...(f.properties || {}) }, geometry: g });
    } else {
      for (const coords of g.coordinates) {
        out.push({
          type: "Feature",
          properties: { ...(f.properties || {}) },
          geometry: { type: "Polygon", coordinates: coords },
        });
      }
    }
  }
  return out;
}

// Enkel sanity check: er dette sannsynligvis EPSG:25832 / meter?
function looksProjectedMeters(feat) {
  try {
    const c = feat?.geometry?.coordinates;
    const first =
      feat.geometry.type === "Polygon"
        ? c?.[0]?.[0]
        : feat.geometry.type === "MultiPolygon"
          ? c?.[0]?.[0]?.[0]
          : null;

    if (!first || !Array.isArray(first)) return false;
    const [x, y] = first;

    // 4326: typisk |lon|<=180 og |lat|<=90
    // 25832: ofte x ~ 200000-800000 og y ~ 6-8 mill
    return Math.abs(x) > 1000 || Math.abs(y) > 1000;
  } catch {
    return false;
  }
}

// Wrapper: prøv (a,b), fallback til FeatureCollection([a,b]) for kompatibilitet
function turfIntersect(a, b) {
  // Bibliotek: selve intersect-funksjonen kommer fra Turf.
  // Jeg prøver to kall-måter fordi Turf-versjoner kan ha litt ulik signatur.
  const fn = intersect;
  try {
    return fn(a, b);
  } catch (e) {
    const msg = e?.message || "";

    if (
      !msg.includes("Must specify at least 2 geometries") &&
      !msg.includes("Must have at least two features")
    ) {
      throw e;
    }

    const featA = a?.type === "Feature" ? a : { type: "Feature", properties: {}, geometry: a };
    const featB = b?.type === "Feature" ? b : { type: "Feature", properties: {}, geometry: b };

    const fc = featureCollection([featA, featB]);
    return fn(fc);
  }
}

// Lag én maske av mange polygoner (samme union-tilnærming som du bruker ellers)
function unionMany(polys) {
  if (!polys.length) return null;
  if (polys.length === 1) return polys[0];

  // Bibliotek: union kommer fra Turf.
  // Jeg prøver først "batch" union, og faller tilbake til iterativ union.
  // prøv batch-union først
  try {
    return turf.union(featureCollection(polys));
  } catch {
    // fallback: iterativ
    let acc = polys[0];
    for (let i = 1; i < polys.length; i++) {
      try {
        const u = turf.union(acc, polys[i]);
        if (u) acc = u;
      } catch {
        /* ignore */
      }
    }
    return acc;
  }
}

/* ----------------------- Main ----------------------- */

/**
 * Intersect mellom to polygonlag (A ∩ B).
 * - Begge lag kan ha mange features og MultiPolygon.
 * - Returnerer alltid FeatureCollection av Polygon-features.
 */
export function intersectGeoJson(layerA, layerB) {
  const fcA = toFeatureCollection(layerA);
  const fcB = toFeatureCollection(layerB);

  const aPolys = explodeToPolygons(fcA);
  const bPolys = explodeToPolygons(fcB);

  if (!aPolys.length || !bPolys.length) {
    throw new Error("Intersect støtter bare polygon- og multipolygon-lag.");
  }

  if (looksProjectedMeters(aPolys[0]) || looksProjectedMeters(bPolys[0])) {
    throw new Error(
      "Koordinatene ser ut til å være i meter/projeksjon (f.eks. EPSG:25832). " +
        "Turf i kartet ditt forventer lon/lat (EPSG:4326). Reprojiser før intersect."
    );
  }

  // Jeg unioner B til én maske, og intersecter hver A-feature mot masken
  const maskB = unionMany(bPolys);
  if (!maskB?.geometry) throw new Error("Klarte ikke å lage en gyldig maske av Lag B.");

  const out = [];

  for (const a of aPolys) {
    const res = turfIntersect(a, maskB);

    // null => ingen overlapp
    if (!res?.geometry) continue;

    if (res.geometry.type === "MultiPolygon") {
      for (const coords of res.geometry.coordinates) {
        out.push({
          type: "Feature",
          properties: { ...(a.properties || {}) },
          geometry: { type: "Polygon", coordinates: coords },
        });
      }
    } else if (res.geometry.type === "Polygon") {
      out.push({
        type: "Feature",
        properties: { ...(a.properties || {}) },
        geometry: res.geometry,
      });
    }
    // Andre typer ignoreres (skjer sjelden hvis input er polygon)
  }

  if (!out.length) {
    throw new Error("Intersect ga ingen output (lagene overlapper ikke).");
  }

  return featureCollection(out);
}
