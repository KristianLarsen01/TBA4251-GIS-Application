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
    // plukk en "første posisjon"
    const first =
      feat.geometry.type === "Polygon"
        ? c?.[0]?.[0]
        : feat.geometry.type === "MultiPolygon"
          ? c?.[0]?.[0]?.[0]
          : null;

    if (!first || !Array.isArray(first)) return false;
    const [x, y] = first;
    // 4326 er typisk |lon|<=180 og |lat|<=90
    // 25832 har ofte x ~ 200000-800000 og y ~ 6-8 mill
    return Math.abs(x) > 1000 || Math.abs(y) > 1000;
  } catch {
    return false;
  }
}

// Wrapper slik du viste: prøv (a,b), fallback til FeatureCollection
function turfDifference(a, b) {
  const fn = difference;
  try {
    return fn(a, b);
  } catch (e) {
    const msg = e?.message || "";

    // bare fallback på “typiske turf-input-feil”
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

    const fc = featureCollection([featA, featB]);

    // noen turf-builds støtter difference(fc)
    return fn(fc);
  }
}

// Lag én maske av mange polygoner (samme union-tilnærming som du fikk til å funke)
function unionMany(polys) {
  if (!polys.length) return null;
  if (polys.length === 1) return polys[0];

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

export function differenceGeoJson(layerA, layerB) {
  const fcA = toFeatureCollection(layerA);
  const fcB = toFeatureCollection(layerB);

  const aPolys = explodeToPolygons(fcA);
  const bPolys = explodeToPolygons(fcB);

  if (!aPolys.length || !bPolys.length) {
    throw new Error("Difference støtter bare polygon- og multipolygon-lag.");
  }

  // super nyttig feilmelding hvis data er i 25832 i Leaflet-verden
  if (looksProjectedMeters(aPolys[0]) || looksProjectedMeters(bPolys[0])) {
    throw new Error(
      "Koordinatene ser ut til å være i meter/projeksjon (f.eks. EPSG:25832). " +
        "Turf i kartet ditt forventer lon/lat (EPSG:4326). Reprojiser før difference."
    );
  }

  const mask = unionMany(bPolys);
  if (!mask?.geometry) throw new Error("Klarte ikke å lage en gyldig maske av Lag B.");

  const out = [];

  for (const a of aPolys) {
    const res = turfDifference(a, mask);

    // null => B dekker hele A
    if (!res?.geometry) continue;

    // res kan være Polygon eller MultiPolygon
    if (res.geometry.type === "MultiPolygon") {
      for (const coords of res.geometry.coordinates) {
        out.push({
          type: "Feature",
          properties: { ...(a.properties || {}) },
          geometry: { type: "Polygon", coordinates: coords },
        });
      }
    } else {
      out.push({
        type: "Feature",
        properties: { ...(a.properties || {}) },
        geometry: res.geometry,
      });
    }
  }

  // Hvis B dekker hele A (ingen resultater i det hele tatt)
if (!out.length) {
  throw new Error("Difference ga ingen output (Lag B dekker Lag A, eller rekkefølgen er feil).");
}

// totalareal av A (for relativ terskel)
const areaA = aPolys.reduce((sum, f) => sum + turf.area(f), 0);

// terskler (juster disse to hvis du må)
const ABS_MIN_AREA = 1;           // m² (0.1 / 1 / 5)
const REL_MIN_AREA = areaA * 1e-8; // 1e-7 til 1e-9 er typisk
const MIN_AREA = Math.max(ABS_MIN_AREA, REL_MIN_AREA);

// “sliver”-detektor: 4πA / P² (0..1). Tynn outline => veldig lav verdi
const MIN_COMPACTNESS = 1e-5; // 1e-4 strengere, 1e-6 snillere

function compactness(polyFeature) {
  // perimeter i meter
  const line = turf.polygonToLine(polyFeature);
  const perimM = turf.length(line, { units: "kilometers" }) * 1000;
  const a = turf.area(polyFeature);
  if (!isFinite(a) || !isFinite(perimM) || perimM <= 0) return 0;
  return (4 * Math.PI * a) / (perimM * perimM);
}

const filtered = out.filter((f) => {
  try {
    const a = turf.area(f);
    if (!isFinite(a) || a < MIN_AREA) return false;
    const c = compactness(f);
    if (c < MIN_COMPACTNESS) return false; // fjerner “tynn outline”
    return true;
  } catch {
    return false;
  }
});

// Hvis alt som står igjen i praksis er støy -> feilmelding
if (!filtered.length) {
  throw new Error(
    "Difference ga bare slivers/outline (ingen meningsfull flate). " +
      "Sjekk rekkefølgen: A − B."
  );
}

return featureCollection(filtered);
}
