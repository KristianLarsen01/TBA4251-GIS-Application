// src/utils/projection.js
import proj4 from "proj4";

// ---- Proj4 oppsett ----
proj4.defs(
  "EPSG:25832",
  "+proj=utm +zone=32 +datum=ETRS89 +units=m +no_defs +type=crs"
);

/**
 * Hvis GeoJSON er i EPSG:25832, reprojiser til WGS84 (EPSG:4326).
 * Ellers returneres data uendret.
 */
export function reprojectToWgs84IfNeeded(geojson) {
  const crsName = geojson?.crs?.properties?.name || "";

  if (!crsName.includes("25832")) return geojson;

  const clone = JSON.parse(JSON.stringify(geojson));

  const transformCoord = (coord) => {
    const [x, y] = coord;
    const [lon, lat] = proj4("EPSG:25832", "EPSG:4326", [x, y]);
    return [lon, lat];
  };

  const transformCoords = (coords) => {
    if (typeof coords[0] === "number") {
      return transformCoord(coords);
    }
    return coords.map(transformCoords);
  };

  const transformGeometry = (geom) => {
    if (!geom) return null;
    if (geom.type === "GeometryCollection") {
      return {
        ...geom,
        geometries: geom.geometries.map(transformGeometry),
      };
    }
    return {
      ...geom,
      coordinates: transformCoords(geom.coordinates),
    };
  };

  if (clone.type === "FeatureCollection") {
    clone.features = clone.features.map((f) => ({
      ...f,
      geometry: transformGeometry(f.geometry),
    }));
  } else if (clone.type === "Feature") {
    clone.geometry = transformGeometry(clone.geometry);
  } else if (clone.type && clone.coordinates) {
    return transformGeometry(clone);
  }

  delete clone.crs;
  return clone;
}
