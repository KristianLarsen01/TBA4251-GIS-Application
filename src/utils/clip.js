// src/utils/clip.js
import * as turf from "@turf/turf";
import intersect from "@turf/intersect";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { featureCollection, lineString, point } from "@turf/helpers";

/* ----------------------- Felles hjelpefunksjoner ----------------------- */

function toFeatureCollection(geojson) {
  if (!geojson || typeof geojson !== "object") {
    throw new Error("Ugyldig GeoJSON.");
  }

  if (geojson.type === "FeatureCollection") return geojson;

  if (geojson.type === "Feature") {
    return featureCollection([geojson]);
  }

  return featureCollection([
    { type: "Feature", properties: {}, geometry: geojson },
  ]);
}

function isPolygonLike(type) {
  return type === "Polygon" || type === "MultiPolygon";
}
function isLineLike(type) {
  return type === "LineString" || type === "MultiLineString";
}
function isPointLike(type) {
  return type === "Point" || type === "MultiPoint";
}

/**
 * Flater ut MultiPolygon → Polygon-features
 */
function getMaskPolygons(maskFC) {
  const polys = [];

  maskFC.features.forEach((f) => {
    const g = f.geometry;
    if (!g) return;

    if (g.type === "Polygon") {
      polys.push({
        type: "Feature",
        properties: { ...(f.properties || {}) },
        geometry: g,
      });
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

  if (!polys.length) {
    throw new Error("Maske-laget må ha polygon- eller multipolygon-geometri.");
  }

  return polys;
}

/**
 * Union av alle maskepolygoner → ÉN maske (Polygon eller MultiPolygon)
 */
function dissolveMask(polys) {
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

/**
 * Robust intersect-wrapper
 */
function turfIntersect(a, b) {
  try {
    return intersect(a, b);
  } catch (e) {
    const msg = e?.message || "";
    if (
      !msg.includes("Must specify at least 2 geometries") &&
      !msg.includes("Must have at least two features")
    ) {
      throw e;
    }

    const fa = a.type === "Feature" ? a : { type: "Feature", properties: {}, geometry: a };
    const fb = b.type === "Feature" ? b : { type: "Feature", properties: {}, geometry: b };
    return intersect(featureCollection([fa, fb]));
  }
}

/* ----------------------- Polygon-klipping (FIKSET) ----------------------- */

function clipPolygons(sourceFC, maskFC) {
  const maskPolys = getMaskPolygons(maskFC);
  const union = dissolveMask(maskPolys);

  if (!union?.geometry) {
    throw new Error("Klarte ikke å lage gyldig maske.");
  }

  const maskFeat = {
    type: "Feature",
    properties: {},
    geometry: union.geometry,
  };

  const out = [];

  sourceFC.features.forEach((src) => {
    if (!src.geometry || !isPolygonLike(src.geometry.type)) return;

    const res = turfIntersect(src, maskFeat);
    if (!res?.geometry) return;

    res.properties = { ...(src.properties || {}) };
    out.push(res);
  });

  if (!out.length) {
    throw new Error("Ingen overlapp mellom lagene. Ingen klippet geometri.");
  }

  return featureCollection(out);
}

/* ----------------------- Punkt-klipping ----------------------- */

function clipPoints(sourceFC, maskFC) {
  const maskPolys = getMaskPolygons(maskFC);
  const union = dissolveMask(maskPolys);

  if (!union?.geometry) {
    throw new Error("Maske-laget må ha polygon-geometri.");
  }

  const maskFeat = { type: "Feature", properties: {}, geometry: union.geometry };
  const out = [];

  sourceFC.features.forEach((src) => {
    if (!src.geometry || !isPointLike(src.geometry.type)) return;

    if (src.geometry.type === "Point") {
      if (booleanPointInPolygon(src, maskFeat)) out.push(src);
    } else {
      src.geometry.coordinates.forEach((coord) => {
        const pt = point(coord, { ...(src.properties || {}) });
        if (booleanPointInPolygon(pt, maskFeat)) out.push(pt);
      });
    }
  });

  if (!out.length) {
    throw new Error("Ingen punkter ligger innenfor maskepolygonet.");
  }

  return featureCollection(out);
}

/* ----------------------- Linje-klipping ----------------------- */

function clipSingleLine(lineFeat, maskFeat) {
  const outSegments = [];
  const maskBorder = turf.polygonToLine(maskFeat);
  const coords = lineFeat.geometry.coordinates;

  for (let i = 0; i < coords.length - 1; i++) {
    const a = coords[i];
    const b = coords[i + 1];
    const seg = lineString([a, b]);

    const breakPoints = [a, b];
    turf.lineIntersect(seg, maskBorder).features.forEach((f) => {
      if (f.geometry?.type === "Point") breakPoints.push(f.geometry.coordinates);
    });

    const withDist = breakPoints
      .map((c) => ({
        coord: c,
        dist: turf.distance(point(a), point(c)),
      }))
      .sort((x, y) => x.dist - y.dist);

    for (let j = 0; j < withDist.length - 1; j++) {
      const p1 = withDist[j].coord;
      const p2 = withDist[j + 1].coord;
      const mid = point([(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2]);

      if (booleanPointInPolygon(mid, maskFeat)) {
        outSegments.push(lineString([p1, p2], lineFeat.properties || {}));
      }
    }
  }

  return outSegments;
}

function clipLines(sourceFC, maskFC) {
  const maskPolys = getMaskPolygons(maskFC);
  const union = dissolveMask(maskPolys);

  if (!union?.geometry) {
    throw new Error("Maske-laget må ha polygon-geometri.");
  }

  const maskFeat = { type: "Feature", properties: {}, geometry: union.geometry };
  const out = [];

  sourceFC.features.forEach((src) => {
    if (!src.geometry || !isLineLike(src.geometry.type)) return;

    if (src.geometry.type === "LineString") {
      out.push(...clipSingleLine(src, maskFeat));
    } else {
      src.geometry.coordinates.forEach((coords) => {
        out.push(...clipSingleLine(lineString(coords, src.properties), maskFeat));
      });
    }
  });

  if (!out.length) {
    throw new Error("Ingen linjesegmenter ligger innenfor maskepolygonet.");
  }

  return featureCollection(out);
}

/* ----------------------- Hovedfunksjon ----------------------- */

export function clipGeoJson(sourceLayer, maskLayer) {
  const sourceFC = toFeatureCollection(sourceLayer);
  const maskFC = toFeatureCollection(maskLayer);

  const geom = sourceFC.features.find((f) => f.geometry)?.geometry;
  if (!geom) throw new Error("Kilde-laget har ingen geometri.");

  if (isPolygonLike(geom.type)) return clipPolygons(sourceFC, maskFC);
  if (isPointLike(geom.type)) return clipPoints(sourceFC, maskFC);
  if (isLineLike(geom.type)) return clipLines(sourceFC, maskFC);

  throw new Error("Clip støtter bare punkt, linje og polygon.");
}
