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

  // Antar ren geometri
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
 * Flater ut MultiPolygon til flere Polygon-features.
 * (Samme som i koden du limte inn.)
 */
function getMaskPolygons(maskFC) {
  const polys = [];

  maskFC.features.forEach((f) => {
    const g = f.geometry;
    if (!g) return;

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

  if (!polys.length) {
    throw new Error(
      "Maske-laget må ha polygon- eller multipolygon-geometri."
    );
  }

  return polys;
}

/** Brukes til linje/punkt-masken (union av alle maskepolygon) */
function dissolveMask(polys) {
  if (!polys.length) return null;
  if (polys.length === 1) return polys[0];

  let current = polys[0];
  for (let i = 1; i < polys.length; i++) {
    try {
      const u = turf.union(current, polys[i]);
      if (u && u.geometry) current = u;
    } catch (e) {
      console.warn("union feilet for polygon-par:", e);
    }
  }
  return current;
}

/**
 * Robust wrapper rundt @turf/intersect (for polygon/multipolygon).
 * (Direkte fra koden du limte inn.)
 */
function turfIntersect(a, b) {
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

    const featA =
      a && a.type === "Feature"
        ? a
        : { type: "Feature", properties: {}, geometry: a };
    const featB =
      b && b.type === "Feature"
        ? b
        : { type: "Feature", properties: {}, geometry: b };

    const fc = featureCollection([featA, featB]);
    return fn(fc);
  }
}

/* ----------------------- Polygon-klipping (din gamle) ----------------------- */

function clipPolygons(sourceFC, maskFC) {
  const maskPolys = getMaskPolygons(maskFC);
  const out = [];

  sourceFC.features.forEach((src) => {
    if (!src.geometry || !isPolygonLike(src.geometry.type)) return;

    maskPolys.forEach((mask) => {
      const result = turfIntersect(src, mask);
      if (result) {
        result.properties = { ...(src.properties || {}) };
        out.push(result);
      }
    });
  });

  if (!out.length) {
    throw new Error("Ingen overlapp mellom lagene. Ingen klippet geometri.");
  }

  return featureCollection(out);
}

/* ----------------------- Punkt-klipping (nåværende logikk) ----------------------- */

function clipPoints(sourceFC, maskFC) {
  const maskPolys = getMaskPolygons(maskFC);
  const union = dissolveMask(maskPolys);

  if (!union || !union.geometry) {
    throw new Error(
      "Maske-laget må ha polygon- eller multipolygon-geometri."
    );
  }

  const maskFeat = {
    type: "Feature",
    properties: {},
    geometry: union.geometry,
  };

  const out = [];

  sourceFC.features.forEach((src) => {
    if (!src.geometry || !isPointLike(src.geometry.type)) return;

    if (src.geometry.type === "Point") {
      const inside = booleanPointInPolygon(src, maskFeat);
      if (inside) out.push(src);
    } else if (src.geometry.type === "MultiPoint") {
      src.geometry.coordinates.forEach((coord) => {
        const pt = {
          type: "Feature",
          properties: { ...(src.properties || {}) },
          geometry: { type: "Point", coordinates: coord },
        };
        const inside = booleanPointInPolygon(pt, maskFeat);
        if (inside) out.push(pt);
      });
    }
  });

  if (!out.length) {
    throw new Error(
      "Ingen punkter ligger innenfor maskepolygonet. Ingen lag ble laget."
    );
  }

  return featureCollection(out);
}

/* ----------------------- Linje-klipping (den som funker nå) ----------------------- */

function clipSingleLine(lineFeat, maskFeat) {
  const outSegments = [];
  const maskBorder = turf.polygonToLine(maskFeat);

  const coords = lineFeat.geometry.coordinates;
  if (coords.length < 2) return outSegments;

  for (let i = 0; i < coords.length - 1; i++) {
    const a = coords[i];
    const b = coords[i + 1];

    const seg = lineString([a, b]);
    const breakPoints = [a, b];

    // Krysningspunkter mellom segment og maskekant
    const isects = turf.lineIntersect(seg, maskBorder);
    isects.features.forEach((f) => {
      if (f.geometry && f.geometry.type === "Point") {
        breakPoints.push(f.geometry.coordinates);
      }
    });

    // Ingen ekstra punkter → sjekk hele segmentet
    if (breakPoints.length === 2) {
      const mid = point([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
      const inside = booleanPointInPolygon(mid, maskFeat);
      if (inside) {
        outSegments.push(
          lineString([a, b], { ...(lineFeat.properties || {}) })
        );
      }
      continue;
    }

    // Sorter punkter langs segmentet etter avstand fra a
    const withDist = breakPoints.map((c) => ({
      coord: c,
      dist: turf.distance(point(a), point(c), { units: "meters" }),
    }));
    withDist.sort((p1, p2) => p1.dist - p2.dist);

    // Lag delsegmenter og behold de som er inne i masken
    for (let j = 0; j < withDist.length - 1; j++) {
      const p1 = withDist[j].coord;
      const p2 = withDist[j + 1].coord;

      if (p1[0] === p2[0] && p1[1] === p2[1]) continue;

      const mid = point([(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2]);
      const inside = booleanPointInPolygon(mid, maskFeat);

      if (inside) {
        outSegments.push(
          lineString([p1, p2], { ...(lineFeat.properties || {}) })
        );
      }
    }
  }

  return outSegments;
}

function clipLines(sourceFC, maskFC) {
  const maskPolys = getMaskPolygons(maskFC);
  const union = dissolveMask(maskPolys);

  if (!union || !union.geometry) {
    throw new Error(
      "Maske-laget må ha polygon- eller multipolygon-geometri."
    );
  }

  const maskFeat = {
    type: "Feature",
    properties: {},
    geometry: union.geometry,
  };

  const out = [];

  sourceFC.features.forEach((src) => {
    if (!src.geometry || !isLineLike(src.geometry.type)) return;

    if (src.geometry.type === "LineString") {
      const lf = {
        type: "Feature",
        properties: { ...(src.properties || {}) },
        geometry: src.geometry,
      };
      const segs = clipSingleLine(lf, maskFeat);
      out.push(...segs);
    } else if (src.geometry.type === "MultiLineString") {
      src.geometry.coordinates.forEach((coords) => {
        const lf = lineString(coords, src.properties || {});
        const segs = clipSingleLine(lf, maskFeat);
        out.push(...segs);
      });
    }
  });

  if (!out.length) {
    throw new Error(
      "Ingen linjesegmenter ligger innenfor maskepolygonet. Ingen lag ble laget."
    );
  }

  return featureCollection(out);
}

/* ----------------------- Hovedfunksjon ----------------------- */

export function clipGeoJson(sourceLayer, maskLayer) {
  if (!sourceLayer || !maskLayer) {
    throw new Error("Mangler kilde- eller maske-lag.");
  }

  const sourceFC = toFeatureCollection(sourceLayer);
  const maskFC = toFeatureCollection(maskLayer);

  const firstGeom = sourceFC.features.find((f) => f.geometry)?.geometry;
  if (!firstGeom) {
    throw new Error("Kilde-laget har ingen geometri.");
  }

  const t = firstGeom.type;

  if (isPolygonLike(t)) {
    return clipPolygons(sourceFC, maskFC); // gammel, velfungerende polygon-logikk
  }

  if (isPointLike(t)) {
    return clipPoints(sourceFC, maskFC); // nåværende, fungerende punkt-logikk
  }

  if (isLineLike(t)) {
    return clipLines(sourceFC, maskFC); // nåværende, fungerende linje-logikk
  }

  throw new Error(
    "Clip støtter foreløpig bare punkt-, linje- og polygonlag."
  );
}
