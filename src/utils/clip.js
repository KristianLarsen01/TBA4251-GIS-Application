// src/utils/clip.js
import intersect from "@turf/intersect";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import lineSplit from "@turf/line-split";
import { featureCollection } from "@turf/helpers";

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

/**
 * Robust wrapper rundt @turf/intersect (for polygon/multipolygon).
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

/**
 * Clip for polygon-kilde: klassisk polygon ∩ maskepolygon.
 */
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

/**
 * Clip for punkt-kilde: behold punkter som ligger inne i maskepolygon.
 */
function clipPoints(sourceFC, maskFC) {
  const maskPolys = getMaskPolygons(maskFC);
  const out = [];

  sourceFC.features.forEach((src) => {
    if (!src.geometry || !isPointLike(src.geometry.type)) return;

    if (src.geometry.type === "Point") {
      const inside = maskPolys.some((mask) =>
        booleanPointInPolygon(src, mask)
      );
      if (inside) out.push(src);
    } else if (src.geometry.type === "MultiPoint") {
      src.geometry.coordinates.forEach((coord) => {
        const pt = {
          type: "Feature",
          properties: { ...(src.properties || {}) },
          geometry: { type: "Point", coordinates: coord },
        };
        const inside = maskPolys.some((mask) =>
          booleanPointInPolygon(pt, mask)
        );
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

/**
 * Clip for linje-kilde:
 *  - vi bruker turf.lineSplit(line, polygon)
 *  - segmentene alternerer inne/ute
 *  - vi velger "inne"-segmentene basert på hvor linja starter (odd/even-trikset)
 */
function clipLines(sourceFC, maskFC) {
  const maskPolys = getMaskPolygons(maskFC);
  const out = [];

  sourceFC.features.forEach((src) => {
    if (!src.geometry || !isLineLike(src.geometry.type)) return;

    // Normaliser til liste med LineString-koordinater
    const parts =
      src.geometry.type === "LineString"
        ? [src.geometry.coordinates]
        : src.geometry.coordinates; // MultiLineString

    parts.forEach((coords) => {
      if (!coords || coords.length < 2) return;

      const baseLine = {
        type: "Feature",
        properties: { ...(src.properties || {}) },
        geometry: { type: "LineString", coordinates: coords },
      };

      maskPolys.forEach((mask) => {
        let split;
        try {
          split = lineSplit(baseLine, mask);
        } catch {
          split = null;
        }

        // Ingen skjæringspunkt: linja er enten helt inne eller helt ute
        if (!split || !split.features || split.features.length === 0) {
          const midCoord = coords[Math.floor(coords.length / 2)];
          const midPt = {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Point",
              coordinates: midCoord,
            },
          };
          const inside = booleanPointInPolygon(midPt, mask);
          if (inside) {
            out.push(baseLine);
          }
          return;
        }

        // Gå gjennom alle segmentene, behold de som faktisk ligger inne i polygonet
        split.features.forEach((seg) => {
          if (!seg.geometry || seg.geometry.type !== "LineString") return;

          const segCoords = seg.geometry.coordinates;
          if (!segCoords || segCoords.length < 2) return;

          const midSegCoord = segCoords[Math.floor(segCoords.length / 2)];
          const midSegPt = {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Point",
              coordinates: midSegCoord,
            },
          };

          const inside = booleanPointInPolygon(midSegPt, mask);
          if (inside) {
            out.push({
              type: "Feature",
              properties: { ...(src.properties || {}) },
              geometry: seg.geometry,
            });
          }
        });
      });
    });
  });

  if (!out.length) {
    throw new Error(
      "Ingen linjesegmenter ligger innenfor maskepolygonet. Ingen lag ble laget."
    );
  }

  return featureCollection(out);
}


/**
 * Hovedfunksjon: klipper kilde-lag mot maske-lag.
 */
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
    return clipPolygons(sourceFC, maskFC);
  }

  if (isPointLike(t)) {
    return clipPoints(sourceFC, maskFC);
  }

  if (isLineLike(t)) {
    return clipLines(sourceFC, maskFC);
  }

  throw new Error(
    "Clip støtter foreløpig bare punkt-, linje- og polygonlag."
  );
}
