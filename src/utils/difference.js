// src/utils/difference.js
import difference from "@turf/difference";
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

// Enkel sanity check: er dette sannsynligvis EPSG:25832?
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
    return Math.abs(x) > 1000 || Math.abs(y) > 1000;
  } catch {
    return false;
  }
}

// Robust wrapper: difference(a,b) med fallback til FC
function turfDifference(a, b) {
  const fn = difference;
  try {
    return fn(a, b);
  } catch (e) {
    const msg = e?.message || "";
    if (
      !msg.includes("Must have at least two features") &&
      !msg.includes("Must specify at least 2 geometries")
    ) {
      throw e;
    }

    const featA =
      a?.type === "Feature" ? a : { type: "Feature", properties: {}, geometry: a };
    const featB =
      b?.type === "Feature" ? b : { type: "Feature", properties: {}, geometry: b };

    return fn(featureCollection([featA, featB]));
  }
}

// Union mange polygoner til én maske
function unionMany(polys) {
  if (!polys.length) return null;
  if (polys.length === 1) return polys[0];

  try {
    return turf.union(featureCollection(polys));
  } catch {
    let acc = polys[0];
    for (let i = 1; i < polys.length; i++) {
      try {
        const u = turf.union(acc, polys[i]);
        if (u?.geometry) acc = u;
      } catch {
        /* ignore */
      }
    }
    return acc;
  }
}

// “Heal” geometri: buffer(0) er klassisk GIS-triks for å fikse små topologi-feil
function bufferZero(feat) {
  try {
    // Turf buffer krever units, men 0 skal ikke flytte noe
    const b = turf.buffer(feat, 0, { units: "meters", steps: 8 });
    if (b?.type === "Feature") return b;
    if (b?.type === "FeatureCollection") return b.features?.[0] || feat;
    return feat;
  } catch {
    return feat;
  }
}

// Sliver-detektor: 4πA / P² (0..1). Tynn outline => veldig lav verdi
function compactness(polyFeature) {
  try {
    const line = turf.polygonToLine(polyFeature);
    const perimM = turf.length(line, { units: "kilometers" }) * 1000;
    const a = turf.area(polyFeature);
    if (!isFinite(a) || !isFinite(perimM) || perimM <= 0) return 0;
    return (4 * Math.PI * a) / (perimM * perimM);
  } catch {
    return 0;
  }
}

/* ----------------------- Main ----------------------- */

export function differenceGeoJson(layerA, layerB) {
  const fcA = toFeatureCollection(layerA);
  const fcB = toFeatureCollection(layerB);

  const aPolys = explodeToPolygons(fcA);
  const bPolys = explodeToPolygons(fcB);

  if (!aPolys.length || !bPolys.length) {
    throw new Error("Difference støtter bare polygon- og multipolygon-lag.");
  }

  // nyttig feilmelding hvis data er projisert
  if (looksProjectedMeters(aPolys[0]) || looksProjectedMeters(bPolys[0])) {
    throw new Error(
      "Koordinatene ser ut til å være i meter/projeksjon (f.eks. EPSG:25832). " +
        "Turf forventer lon/lat (EPSG:4326). Reprojiser før difference."
    );
  }

  // 1) Union B til én maske
  const maskRaw = unionMany(bPolys);
  if (!maskRaw?.geometry) throw new Error("Klarte ikke å lage en gyldig maske av Lag B.");
  const mask = bufferZero(maskRaw); // heal mask

  // 2) Kjør difference for hvert polygon i A
  const out = [];

  for (const aRaw of aPolys) {
    const a = bufferZero(aRaw); // heal A også

    const res = turfDifference(a, mask);

    // null => B dekker hele A
    if (!res?.geometry) continue;

    // Heal resultatet (slivers kommer ofte av små self-intersections)
    const healed = bufferZero(res);

    if (!healed?.geometry) continue;

    if (healed.geometry.type === "MultiPolygon") {
      for (const coords of healed.geometry.coordinates) {
        out.push({
          type: "Feature",
          properties: { ...(aRaw.properties || {}) },
          geometry: { type: "Polygon", coordinates: coords },
        });
      }
    } else if (healed.geometry.type === "Polygon") {
      out.push({
        type: "Feature",
        properties: { ...(aRaw.properties || {}) },
        geometry: healed.geometry,
      });
    }
  }

  // Hvis B dekker hele A (ingen resultater)
  if (!out.length) {
    throw new Error("Difference ga ingen output (Lag B dekker Lag A, eller rekkefølgen er feil).");
  }

  // 3) Filtrer bort støy/slivers
  const areaA = aPolys.reduce((sum, f) => sum + turf.area(f), 0);

  // Terskler – disse er safe defaults:
  // - ABS_MIN_AREA: fjerner mikropolygons (m²)
  // - REL_MIN_AREA: fjerner “nesten-ingenting” relativt til A
  const ABS_MIN_AREA = 5;              // m² (1–10 er typisk)
  const REL_MIN_AREA = areaA * 1e-8;   // 1e-7 strengere, 1e-9 mildere
  const MIN_AREA = Math.max(ABS_MIN_AREA, REL_MIN_AREA);

  // Sliver = veldig lav compactness
  const MIN_COMPACTNESS = 1e-5; // 1e-4 strengere, 1e-6 mildere

  const filtered = out.filter((f) => {
    try {
      const a = turf.area(f);
      if (!isFinite(a) || a < MIN_AREA) return false;

      const c = compactness(f);
      if (c < MIN_COMPACTNESS) return false;

      return true;
    } catch {
      return false;
    }
  });

  // Hvis alt var støy → feilmelding (ingen “outline-lag”)
  if (!filtered.length) {
    throw new Error(
      "Difference ga bare slivers/outline (ingen meningsfull flate). " +
        "Sjekk rekkefølgen: A − B."
    );
  }

  return featureCollection(filtered);
}
