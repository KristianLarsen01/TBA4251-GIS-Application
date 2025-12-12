import * as turf from "@turf/turf";
import { featureCollection } from "@turf/helpers";

function toFeatureCollection(geojson) {
  if (!geojson || typeof geojson !== "object") throw new Error("Ugyldig GeoJSON.");
  if (geojson.type === "FeatureCollection") return geojson;
  if (geojson.type === "Feature") return featureCollection([geojson]);
  return featureCollection([{ type: "Feature", properties: {}, geometry: geojson }]);
}

function isPolygonLike(t) {
  return t === "Polygon" || t === "MultiPolygon";
}

function getAllPolygons(fc) {
  const polys = [];
  fc.features.forEach((f) => {
    const g = f?.geometry;
    if (!g || !isPolygonLike(g.type)) return;

    if (g.type === "Polygon") polys.push(f);
    if (g.type === "MultiPolygon") {
      g.coordinates.forEach((coords) => {
        polys.push({
          type: "Feature",
          properties: { ...(f.properties || {}) },
          geometry: { type: "Polygon", coordinates: coords },
        });
      });
    }
  });
  return polys;
}

/**
 * Dissolve et polygonlag.
 * - propertyKey = null  -> dissolve alt til én (Multi)Polygon
 * - propertyKey = "X"   -> dissolve per unik verdi i properties[X]
 */
export function dissolveGeoJson(layer, propertyKey = null) {
  if (!layer) throw new Error("Mangler lag for dissolve.");

  const fc = toFeatureCollection(layer);
  const polys = getAllPolygons(fc);

  if (!polys.length) {
    throw new Error("Dissolve støtter bare polygon- og multipolygon-lag.");
  }

  // Gruppér
  const groups = new Map();
  polys.forEach((f) => {
    const key =
      propertyKey ? String(f?.properties?.[propertyKey] ?? "__MISSING__") : "__ALL__";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(f);
  });

  const out = [];

  for (const [key, feats] of groups.entries()) {
    if (feats.length === 1) {
      const single = feats[0];
      out.push({
        type: "Feature",
        properties: propertyKey ? { [propertyKey]: key } : { ...(single.properties || {}) },
        geometry: single.geometry,
      });
      continue;
    }

    const fcGroup = featureCollection(feats);
    const u = turf.union(fcGroup);

    if (!u?.geometry) {
      throw new Error("Dissolve feilet. Geometriene kan være ugyldige.");
    }

    out.push({
      type: "Feature",
      properties: propertyKey ? { [propertyKey]: key } : {},
      geometry: u.geometry,
    });
  }

  return featureCollection(out);
}
