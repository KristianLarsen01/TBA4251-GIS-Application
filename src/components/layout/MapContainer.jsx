// src/components/layout/MapContainer.jsx
import { useEffect, useRef } from "react";
import L from "leaflet";
import { useLayers } from "../../context/LayersContext.jsx";

export default function MapContainer() {
  const mapRef = useRef(null);
  const mapElRef = useRef(null);
  const dataLayerGroupRef = useRef(null);
  const { layers } = useLayers();

  useEffect(() => {
    if (mapRef.current || !mapElRef.current) return;

    const map = L.map(mapElRef.current, {
      center: [63.4305, 10.3951],
      zoom: 12,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const group = L.layerGroup().addTo(map);

    mapRef.current = map;
    dataLayerGroupRef.current = group;

    return () => {
      map.remove();
      mapRef.current = null;
      dataLayerGroupRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const group = dataLayerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    layers
      .filter((l) => l.visible !== false)
      .forEach((layer) => {
        const color = layer.color || "#2563eb";
        const nameLower = (layer.name || "").toLowerCase();
        const isBuffer = nameLower.includes("_buffer_");

        const geoJsonLayer = L.geoJSON(layer.data, {
          style: (feature) => {
            const geomType = feature?.geometry?.type || "";
            const isPolygonGeom = geomType.includes("Polygon");
            const isLineGeom = geomType.includes("LineString");

            const defaultFill = isBuffer ? 0.3 : 1.0;
            const fillOpacity =
              typeof layer.fillOpacity === "number"
                ? layer.fillOpacity
                : defaultFill;

            if (isPolygonGeom) {
              return {
                color,
                weight: isBuffer ? 1.5 : 1.2,
                fillColor: color,
                fillOpacity,
              };
            }

            if (isLineGeom) {
              return {
                color,
                weight: 3,
                fillOpacity: 0,
              };
            }

            return {
              color,
              weight: 2,
            };
          },

          pointToLayer: (feature, latlng) => {
            const defaultFill = isBuffer ? 0.4 : 1.0;
            const fillOpacity =
              typeof layer.fillOpacity === "number"
                ? layer.fillOpacity
                : defaultFill;

            return L.circleMarker(latlng, {
              radius: isBuffer ? 7 : 6,
              color,
              fillColor: color,
              weight: 1.5,
              fillOpacity,
            });
          },
        });

        geoJsonLayer.addTo(group);
      });
  }, [layers]);

  return (
    <div className="map-container">
      <div ref={mapElRef} className="leaflet-map-root" />
    </div>
  );
}
