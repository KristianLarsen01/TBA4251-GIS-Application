/*
  Hensikt:
  Denne fila lager en buffer (en “sone rundt”) et GeoJSON-lag.
  Jeg bruker dette når jeg vil lage et nytt polygonlag som ligger X meter rundt
  punkter/linjer/polygoner i et valgt lag.

  Eksterne biblioteker (hvorfor og hvordan):
  - Turf (@turf/buffer): gjør selve buffer-beregningen.
  - @turf/helpers (featureCollection): hjelper meg å pakke data inn i FeatureCollection.

  Min kode vs bibliotek:
  - Turf gjør geometri-matematikken.
  - Jeg normaliserer input (Feature/Geometry -> FeatureCollection), validerer meterverdi,
    og sørger for at jeg alltid returnerer en FeatureCollection.
*/

import buffer from "@turf/buffer";
import { featureCollection } from "@turf/helpers";

/**
 * Lager et nytt GeoJSON FeatureCollection som er buffer rundt et kilde-lag.
 *
 * @param {object} sourceLayer GeoJSON (FeatureCollection, Feature eller Geometry)
 * @param {number} distanceMeters Bufferavstand i meter
 * @returns {object} GeoJSON FeatureCollection med buffer-geometri
 */
export function createBufferedGeoJson(sourceLayer, distanceMeters) {
  if (!sourceLayer) {
    throw new Error("Mangler kilde-lag for buffer.");
  }

  if (!sourceLayer.type) {
    throw new Error("Kilde-lag mangler 'type' (ikke gyldig GeoJSON).");
  }

  // Turf kan bruke meter direkte
  const distance = Number(distanceMeters);
  if (!Number.isFinite(distance) || distance <= 0) {
    throw new Error("Bufferavstanden må være et positivt tall i meter.");
  }

  // Normaliser til FeatureCollection for å gjøre det enkelt
  let fc;

  if (sourceLayer.type === "FeatureCollection") {
    fc = sourceLayer;
  } else if (sourceLayer.type === "Feature") {
    fc = featureCollection([sourceLayer]);
  } else {
    // Antar at dette er en ren Geometry
    fc = featureCollection([{ type: "Feature", geometry: sourceLayer }]);
  }

  const buffered = buffer(fc, distance, {
    units: "meters",
    steps: 16, // kan justeres for glattere buffer
  });

  // Sørg for at jeg fortsatt returnerer en FeatureCollection
  if (buffered.type === "FeatureCollection") {
    return buffered;
  }

  if (buffered.type === "Feature") {
    return featureCollection([buffered]);
  }

  // Hvis Turf av en eller annen grunn returnerer ren geometri
  return featureCollection([{ type: "Feature", geometry: buffered }]);
}
