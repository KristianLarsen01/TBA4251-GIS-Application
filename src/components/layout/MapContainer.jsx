// src/components/layout/MapContainer.jsx
import { useEffect, useRef } from "react";
import L from "leaflet";
import { useLayers } from "../../context/LayersContext.jsx";

export default function MapContainer() {
  const mapRef = useRef(null);
  const mapElRef = useRef(null);
  const dataLayerGroupRef = useRef(null);
  const { layers } = useLayers();

  // Init kartet (bare én gang)
  useEffect(() => {
    if (mapRef.current || !mapElRef.current) return;

    const map = L.map(mapElRef.current, {
      center: [63.4305, 10.3951], // Trondheim
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

  // Tegn GeoJSON-lag når layers endres
  useEffect(() => {
    const map = mapRef.current;
    const group = dataLayerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    layers
      .filter((l) => l.visible !== false)
      .forEach((layer) => {
        L.geoJSON(layer.data, {
          style: {
            color: layer.color || "#2563eb",
            weight: 2,
          },
          pointToLayer: (feature, latlng) =>
            L.circleMarker(latlng, {
              radius: 6,
              color: layer.color || "#16a34a",
              weight: 1,
              fillOpacity: 0.9,
            }),
        }).addTo(group);
      });

    // Ikke noe fitBounds her – kartet holder zoom/posisjon som før
  }, [layers]);

  return (
    <div className="map-container">
      <div ref={mapElRef} className="leaflet-map-root" />
    </div>
  );
}
